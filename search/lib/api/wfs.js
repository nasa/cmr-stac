const express = require('express');
const _ = require('lodash');
const {
  wfs,
  generateAppUrl,
  generateNavLinks,
  logger,
  makeAsyncHandler,
  logRequest,
  errors
} = require('../util');
const convert = require('../convert');
const cmr = require('../cmr');
const settings = require('../settings');
const { inspect } = require('util');
const { Catalog } = require('../stac/catalog');
const stacExtension = require('../stac/extension');

const env = {};
env.BROWSE_PATH = process.env.BROWSE_PATH;

Object.fromEntries = l => l.reduce((a, [k, v]) => ({ ...a, [k]: v }), {});

/**
 * Fetch a list of collections from CMR for a provider.
 */
async function getCollections(request, response) {
  logger.info(`GET ${request.params.providerId}/collections`);
  const pageSize = Number(request.query.limit || 10);
  const event = request.apiGateway.event;

  const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

  const provider = request.params.providerId;

  let rootName, description;
  // request.query is Used for pagination.
  const cmrParams = await cmr.convertParams(provider, request.query);

  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    // Query params to get cloud holdings for the provider.
    Object.assign(cmrParams, { cloud_hosted: 'true' });
    rootName = 'CMR-CLOUDSTAC Root';
    description = `All cloud holding collections provided by ${provider}`;
  } else {
    rootName = 'CMR-STAC Root';
    description = `All collections provided by ${provider}`;
  }

  const collections = await cmr.findCollections(cmrParams);

  const collectionsResponse = {
    id: provider,
    stac_version: settings.stac.version,
    description: `${description}`,
    license: 'not-provided',
    type: 'Catalog',
    links: [
      wfs.createLink('self', generateAppUrl(event, `/${provider}/collections`),
        `${description}`),
      wfs.createLink('root', generateAppUrl(event, '/'), `${rootName}`)
    ],
    collections: collections.map(coll => convert.cmrCollToWFSColl(event, coll))
  };

  if (currPage > 1 && collectionsResponse.links.length > 1) {
    collectionsResponse.links.push({
      rel: 'prev',
      href: prevResultsLink
    });
  }

  if (collectionsResponse.collections.length === pageSize) {
    collectionsResponse.links.push({
      rel: 'next',
      href: nextResultsLink
    });
  }

  return response.json(collectionsResponse);
}

/**
 * Fetch a collection from CMR.
 */
async function getCollection(request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}`);
  const event = request.apiGateway.event;
  const { providerId, collectionId } = request.params;

  // convert collection ID to CMR <short_name> and <version>
  const cmrParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
  const [ collection ] = await cmr.findCollections(cmrParams);

  if (!collection) {
    throw new errors.NotFound(`Could not find collection with id [${collectionId}] for provider [${providerId}]`);
  }

  // There will only be one collection returned
  const collectionResponse = convert.cmrCollToWFSColl(event, collection);
  // add browse links
  if (process.env.BROWSE_PATH) {
    const facets = await cmr.getGranuleTemporalFacets(cmrParams);
    const path = `/${providerId}/collections/${collectionId}`;
    // create catalog link for each year
    const browseLinks = facets.years.map(y => wfs.createLink('child', generateAppUrl(event, `${path}/${y}`), `${y} catalog`));
    collectionResponse.links = collectionResponse.links.concat(browseLinks);
  }
  return response.json(collectionResponse);
}

/**
 * Fetch a list of cloud holding collections from CMR for the provider
 */
async function findCloudCollections(providerId, collectionConceptIds) {
  const params = {
    provider_short_name: providerId,
    cloud_hosted: 'true',
    page_size: 2000
  };

  if (collectionConceptIds) {
    params.concept_id = collectionConceptIds;
  }

  const allCloudCollections = [];
  for (let i = 1; i < 10000; i++) {
    params.page_num = i;
    const collections = await cmr.findCollections(params);
    for (let j = 0; j < collections.length; j++) {
      allCloudCollections.push(collections[j].id);
    }
    if (collections.length < 2000) {
      break;
    }
  }
  logger.debug(`allCloudCollections: ${allCloudCollections.length}`);
  return allCloudCollections;
}

/**
 * Extract parameters from requst object
 * @param {Object} request - Request object
 */
function extractParams(request) {
  const event = request.apiGateway.event;
  const method = event.httpMethod;

  let params = {};

  switch (method) {
    case 'GET':
      params = stacExtension.prepare(request.query);
      break;
    case 'POST':
      params = stacExtension.prepare(request.body);
      break;
    default:
      throw new Error(`Unsupported request method ${method}`);
  }

  return params;
}

/**
 * Fetch a list of granules from CMR.
 */
async function getItems(request, response) {
  logRequest(request);

  const { providerId, collectionId:stacCollectionId } = request.params;
  const event = request.apiGateway.event;

  const { fields, ...params } = extractParams(request);

  const cmrCollectionId = await cmr.stacIdToCmrCollectionId(providerId, stacCollectionId);

  if (stacCollectionId) {
    if (!cmrCollectionId) {
      return response
        .status(404)
        .json({errors: [`Collection [${stacCollectionId}] not found for provider [${providerId}]`]});
    }

    if (params.collections) {
      return response
        .status(401)
        .json({errors: [`Can not have collections param when there is a collectionId [${stacCollectionId}] specified`]});
    }
    params.collections = [stacCollectionId];
  }

  // convert STAC params to CMR Params
  const cmrParams = await cmr.convertParams(providerId, params);

  let granulesResult = { granules: [], hits: 0 };
  const collectionsRequested = _.has(params, 'collections');
  const validCollections = _.has(cmrParams, 'collection_concept_id');

  if ((collectionsRequested && validCollections) || (!collectionsRequested)) {
    // if collections param provided, check that not all were filtered out as invalid
    if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
      // Preserve collection_concept_id and granule_ur in cmrParams before deleting.
      // After checking collection_concept_ids being cloud holding collections, they
      // will be added back one by one because of POST search request requirement.
      const collectionConceptIds = cmrParams.collection_concept_id;
      const granuleURs = cmrParams.granule_ur;
      delete cmrParams.collection_concept_id;
      delete cmrParams.granule_ur;

      // Find all the cloud holding collections applicable
      // i.e. if collection_concept_ids are present, we will get all the cloud holding collections within these ids.
      // otherwise, we will get all the cloud holding collections for the provider.
      const allCloudCollections = await findCloudCollections(providerId, collectionConceptIds);
      const postSearchParams = new URLSearchParams(cmrParams);

      allCloudCollections.forEach(id => postSearchParams.append('collection_concept_id', id));

      if (granuleURs) {
        granuleURs.forEach(id => postSearchParams.append('granule_ur', id));
      }
      granulesResult = await cmr.findGranules(postSearchParams);
    } else {
      granulesResult = await cmr.findGranules(cmrParams);
    }
  }

  if (stacCollectionId) {
    delete params.collections;
  }

  const parentPromises = granulesResult
        .granules
        .map(({ collection_concept_id }) => collection_concept_id)
        .filter((v, i, self) => self.indexOf(v) === i) // uniqify collection ids
        .map(async (id) => await cmr.fetchConcept(id));

  const parentCollections = await Promise.all(parentPromises);

  const parentCollectionMap = parentCollections.reduce((acc, coll) => {
    const newColl = {};
    newColl[coll.id] = coll;
    return { ...acc, ...newColl };
  }, {});

  // convert CMR Granules to STAC Items
  const featureCollection = await convert.cmrGranulesToStac(event,
    parentCollectionMap,
    granulesResult.granules,
    parseInt(granulesResult.hits),
    params);
  // apply fields and context extensions
  const formatted = stacExtension.format(featureCollection,
    {
      fields,
      context: { searchResult: granulesResult, query: params }
    });

  response.setHeader('Content-Type', 'application/geo+json');
  return response.json(formatted);
}

/**
 * Fetch a granule from CMR.
 */
async function getItem(request, response) {
  const providerId = request.params.providerId;
  const collectionId = request.params.collectionId;
  const itemId = request.params.itemId;
  logger.info(`GET /${providerId}/collections/${collectionId}/items/${itemId}`);
  const event = request.apiGateway.event;

  // We need to make sure the granule belongs to the provider and the collection.
  const cmrCollectionId = await cmr.stacIdToCmrCollectionId(providerId, collectionId);
  if (!cmrCollectionId) {
    return response
      .status(404)
      .json({ errors: [`Collection [${collectionId}] not found for provider [${providerId}]`] });
  }
  const cmrParams = Object.assign(
    { granule_ur: itemId },
    { collection_concept_id: cmrCollectionId }
  );

  // When getting cloud holding granules, we need to use URLSearchParams for the POST search.
  // It'll work for GET too.
  const postSearchParams = new URLSearchParams(cmrParams);
  const granules = (await cmr.findGranules(postSearchParams)).granules;

  if (!granules.length) {
    return response
      .status(404)
      .json({ errors: [`Granule [${itemId}] could not be found`] });
  }

  const [ granule ] = granules;

  const parentCollection = await cmr.fetchConcept(granule.collection_concept_id);
  const granuleResponse = convert.cmrGranuleToStac(event, parentCollection, granule);
  return response.json(granuleResponse);
};

/**
 * Create parameter dictionary from browse_path_template and provided values
 */
async function getCatalog(request, response) {
  // browse parameters
  const browseTemplate = process.env.BROWSE_PATH.split('/');
  const params = request.params['0'].split('/');
  const browseParams = Object.fromEntries(
    params.map((val, idx) => [browseTemplate[idx], val])
  );
  const { year, month, day } = browseParams;
  logger.debug(`browseParams = ${inspect(browseParams)}`);

  const providerId = request.params.providerId;
  const collectionId = request.params.collectionId;

  // validate collection
  // This is the case for http://localhost:3000/cloudstac/GHRC_DAAC/collections/lislip.v4/1998
  // We need to make sure collection listlip.v4 is a cloud holding collection.
  const cmrCollectionId = await cmr.stacIdToCmrCollectionId(providerId, collectionId);
  if (!cmrCollectionId) {
    return response
      .status(404)
      .json({ errors: [`Collection [${collectionId}] not found for provider [${providerId}]`] });
  }

  // get path from event
  const event = request.apiGateway.event;
  let path;
  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    path = event.path.replace(/^(\/cloudstac)/, '');
  } else {
    path = event.path.replace(/^(\/stac)/, '');
  }

  // create catalog
  const date = request.params['0'].replace(/\//g, '-');
  const cat = new Catalog();
  cat.stac_version = settings.stac.version;
  cat.id = `${collectionId}-${date}`;
  cat.title = `${collectionId} ${date}`;
  cat.description = `${providerId} sub-catalog for ${date}`;

  // add links
  cat.createRoot(generateAppUrl(event, ''));
  const selfUrl = generateAppUrl(event, path);
  cat.createSelf(selfUrl);
  cat.createParent(selfUrl.slice(0, selfUrl.lastIndexOf('/')));

  // add browse links
  const cmrParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
  const facets = await cmr.getGranuleTemporalFacets(cmrParams, year, month, day);
  if (day) {
    facets.itemids.forEach(id => cat.addItem(id, providerId, collectionId, id));
  } else if (month) {
    facets.days.forEach(d => cat.addChild(`${year}-${month}-${d} catalog`, `/${d}`));
  } else if (year) {
    facets.months.forEach(m => cat.addChild(`${year}-${m} catalog`, `/${m}`));
  }

  return response.json(cat);
}

/**
 * Returns a router.
 * @param cfg map of options.
 */
function createRoutes(cfg = {}) {
  const routes = express.Router();
  routes.get('/:providerId/collections', makeAsyncHandler(getCollections));
  routes.get('/:providerId/collections/:collectionId', makeAsyncHandler(getCollection));
  routes.get('/:providerId/collections/:collectionId/items', makeAsyncHandler(getItems));
  routes.get('/:providerId/collections/:collectionId/items/:itemId', makeAsyncHandler(getItem));

  if (cfg.BROWSE_PATH !== undefined) {
    routes.get('/:providerId/collections/:collectionId/*', makeAsyncHandler(getCatalog));
  }

  return routes;
}

const routes = createRoutes(env);

module.exports = {
  getCollections,
  getCollection,
  getItems,
  getItem,
  getCatalog,
  routes
};
