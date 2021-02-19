const express = require('express');
const {
  wfs,
  generateAppUrl,
  generateNavLinks,
  logger,
  makeAsyncHandler
} = require('../util');
const convert = require('../convert');
const cmr = require('../cmr');
const { assertValid, schemas } = require('../validator');
const settings = require('../settings');
const { inspect } = require('util');
const { Catalog } = require('../stac/catalog');
const stacExtension = require('../stac/extension');

const CONFORMANCE_RESPONSE = {
  conformsTo: [
    'http://www.opengis.net/spec/wfs-1/3.0/req/core',
    'http://www.opengis.net/spec/wfs-1/3.0/req/oas30',
    'http://www.opengis.net/spec/wfs-1/3.0/req/geojson'
  ]
};

const env = {};
env.BROWSE_PATH = process.env.BROWSE_PATH;
env.CONFORMANCE_RESPONSE = CONFORMANCE_RESPONSE;

/**
 * Fetch a list of collections from CMR for a provider.
 */
async function getCollections (request, response) {
  try {
    logger.info(`GET ${request.params.providerId}/collections`);
    const event = request.apiGateway.event;

    const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

    const provider = request.params.providerId;

    let params, errMsg, rootName, description; 
    if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
      params = Object.assign(
        { tag_key: "gov.nasa.earthdatacloud.s3"},
        //request.query is used for pagination
        await cmr.convertParams(provider, request.query)
      );
      errMsg = "Cloud holding collections not found";
      rootName = "CMR-CLOUDSTAC Root";
      description = `All cloud holding collections provided by ${provider}`;
    } else {
      params = Object.assign(
        //request.query is used for pagination
        await cmr.convertParams(provider, request.query)
      );
      errMsg = "Collections not found";
      rootName = "CMR-STAC Root";
      description = `All collections provided by ${provider}`;
    }

    const collections = await cmr.findCollections(params);
    if (!collections.length) {
      return response.status(400).json(`${errMsg}`);
    }

    const collectionsResponse = {
      id: provider,
      stac_version: settings.stac.version,
      description: `${description}`,
      license: 'not-provided',
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

    if (collectionsResponse.collections.length === 10) {
      collectionsResponse.links.push({
        rel: 'next',
        href: nextResultsLink
      });
    }

    await assertValid(schemas.collections, collectionsResponse);
    response.json(collectionsResponse);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

async function createBrowseLinks (event, provider, collectionId) {
  // get all child years
  const cmrParams = await cmr.convertParams(provider, { collections: [collectionId] });
  const facets = await cmr.getGranuleTemporalFacets(cmrParams);
  const path = `/${provider}/collections/${collectionId}`;
  // create catalog link for each year
  const links = facets.years.map(y =>
    wfs.createLink('child', generateAppUrl(event, `${path}/${y}`), `${y} catalog`)
  );
  return links;
}

/**
 * Fetch a collection from CMR.
 */
async function getCollection (request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}`);
  const event = request.apiGateway.event;
  const providerId = request.params.providerId;
  const collectionId = request.params.collectionId;

  try {
    // convert collection ID to CMR <short_name> and <version>
    const cmrParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
    const collections = await cmr.findCollections(cmrParams);

    let errMsg;
    if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
      errMsg = `Cloud holding collection [${collectionId}] not found for provider [${providerId}]`;
    } else {
      errMsg = `Collection [${collectionId}] not found for provider [${providerId}]`;
    }

    if ((!collections) || (collections.length === 0)) {
      return response
      .status(404)
      .json(`${errMsg}`);
    }

    // There will only be one collection returned
    const collectionResponse = convert.cmrCollToWFSColl(event, collections[0]);
    // add browse links
    if (process.env.BROWSE_PATH) {
      const browseLinks = await createBrowseLinks(event, providerId, collectionId);
      collectionResponse.links = collectionResponse.links.concat(browseLinks);
    }
    await assertValid(schemas.collection, collectionResponse);
    response.json(collectionResponse);
  } catch (err) {
    response.status(404).json(`Error [${err}] occured when getting Collection ${collectionId} for provider ${providerId}`);
  }
}

/**
 * Fetch a list of cloud holding collections from CMR for the provider
 */
async function findCloudCollections(providerId, collection_concept_ids) {
  const params = Object.assign(
    { provider_short_name: providerId },
    { tag_key: "gov.nasa.earthdatacloud.s3" },
    { page_size: 2000 }
  );

  if (collection_concept_ids){
      params.concept_id=collection_concept_ids;
  }

  const allCloudCollections = [];
  for (i = 1; i < 10000; i ++) {
    params.page_num = i;
    const collections = await cmr.findCollections(params);
    for (j = 0; j < collections.length; j++) {
      allCloudCollections.push(collections[j].id);
    }
    if (collections.length < 2000){
      break;
    }
  }
  logger.info(`allCloudCollections: ${allCloudCollections.length}`);
  return allCloudCollections;
}

/**
 * Fetch a list of granules from CMR.
 */
async function getGranules (request, response) {
  const collectionId = request.params.collectionId;
  const providerId = request.params.providerId;
  const event = request.apiGateway.event;
  const method = event.httpMethod;
  logger.info(`${method} ${event.path}`);

  let params, fields;
  if (method === 'GET') {
    params = stacExtension.prepare(request.query);
    fields = request.query.fields;
  } else if (method === 'POST') {
    params = stacExtension.prepare(request.body);
    fields = request.body.fields;
  } else {
    throw new Error(`Invalid httpMethod ${method}`);
  }

  try {
    // CollectionId Path parameter (e.g., /collections/<collectionId>/items vs /search)
    if (collectionId) {
      Object.assign(params, { collections: [collectionId] });
    }
    // convert STAC params to CMR Params
    const cmrParams = await cmr.convertParams(providerId, params);
  
    let granulesResult; 
    if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
      //Preserve collection_concept_id and concept_id in cmrParams before deleting.
      //After checking collection_concept_ids being cloud holding collections, they
      //will be added back one by one because of POST search request requirement.
      const collection_concept_ids = cmrParams.collection_concept_id;
      const concept_ids = cmrParams.collection_concept_id;
      delete cmrParams.collection_concept_id; 
      delete cmrParams.concept_id;

      //Find all the cloud holding collections applicable
      //i.e. if collection_concept_ids are present, we will get all the cloud holding collections within these ids.
      //otherwise, we will get all the cloud holding collections for the provider.
      const allCloudCollections = await findCloudCollections(providerId, collection_concept_ids);
      const postSearchParams = new URLSearchParams(cmrParams);
      if (allCloudCollections.length !== 0) {
        for (i = 0; i < allCloudCollections.length; i++) {
          postSearchParams.append("collection_concept_id", allCloudCollections[i]);
        }
      } else {
        return response.status(400).json(`Cloud holding collections not found for provider [${providerId}].`);
      }
      if (concept_ids) {
        for (i = 0; i < concept_ids.length; i++) {
          postSearchParams.append("concept_id", concept_ids[i]);
        }
      }
      granulesResult = await cmr.findGranules(postSearchParams); 
    } else {
      granulesResult = await cmr.findGranules(cmrParams);
    }
    const featureCollection = await convert.cmrGranulesToStac(event,
      granulesResult.granules,
      parseInt(granulesResult.hits),
      params);
    await assertValid(schemas.items, featureCollection);

    const formatted = stacExtension.format(featureCollection,
      {
        fields,
        context: { searchResult: granulesResult, query: params }
      });

    response.json(formatted);
  } catch (err) {
    if (err instanceof stacExtension.errors.InvalidSortPropertyError) {
      response.status(422).json(err.message);
    } else {
      response.status(400).json(err.message);
    }
  }
}

/**
 * Fetch a granule from CMR.
 */
async function getGranule (request, response) {
  const providerId = request.params.providerId;
  const collectionId = request.params.collectionId;
  const conceptId = request.params.itemId;
  logger.info(`GET /${providerId}/collections/${collectionId}/items/${conceptId}`);
  const event = request.apiGateway.event;

  if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
    //This is the case for http://localhost:3000/cloudstac/GHRC_DAAC/collections/lislip.v4/items/G1983919034-GHRC_DAAC
    //We need to make sure collection listlip.v4 is a cloud holding collection.
    const cmrCollParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
    const collections = await cmr.findCollections(cmrCollParams);

    if ((!collections) || (collections.length === 0)) {
      return response
      .status(404)
      .json(`Cloud holding collection [${collectionId}] not found for provider [${providerId}]`);
    }
  }

  //We need to make sure the granule belongs to the provider and the collection.
  const cmrCollectionId = await cmr.stacIdToCmrCollectionId(providerId, collectionId);
  const cmrParams = Object.assign(
    { concept_id: conceptId },
    { collection_concept_id: cmrCollectionId}
  );

  //When getting cloud holding granules, we need to use URLSearchParams for the POST search.
  //It'll work for GET too.
  const postSearchParams = new URLSearchParams(cmrParams);
  const granules = (await cmr.findGranules(postSearchParams)).granules;
  const granuleResponse = await convert.cmrGranuleToStac(event, granules[0]);
  await assertValid(schemas.item, granuleResponse);
  response.json(granuleResponse);
}

/**
 * Create parameter dictionary from browse_path_template and provided values
 */
async function getCatalog (request, response) {
  // browse parameters
  const browseTemplate = process.env.BROWSE_PATH.split('/');
  const params = request.params['0'].split('/');
  Object.fromEntries = l => l.reduce((a, [k, v]) => ({ ...a, [k]: v }), {});
  const browseParams = Object.fromEntries(
    params.map((val, idx) => [browseTemplate[idx], val])
  );
  const { year, month, day } = browseParams;
  logger.debug(`browseParams = ${inspect(browseParams)}`);

  const providerId = request.params.providerId;
  const collectionId = request.params.collectionId;

  // create catalog
  const date = request.params['0'].replace(/\//g, '-');
  const cat = new Catalog();
  cat.stac_version = settings.stac.version;
  cat.id = `${collectionId}-${date}`;
  cat.title = `${collectionId} ${date}`;
  cat.description = `${providerId} sub-catalog for ${date}`;

  // get path from event
  const event = request.apiGateway.event;
  const path = event.path.replace(/^(\/stac)/, '');

  // add links
  cat.createRoot(generateAppUrl(event, ''));
  const selfUrl = generateAppUrl(event, path);
  cat.createSelf(selfUrl);
  cat.createParent(selfUrl.slice(0, selfUrl.lastIndexOf('/')));

  // add browse links
  const cmrParams = await cmr.convertParams(providerId, { collections: [collectionId] });
  const facets = await cmr.getGranuleTemporalFacets(cmrParams, year, month, day);
  if (day) {
    facets.itemids.forEach(id => cat.addItem(id, providerId, collectionId, id));
  } else if (month) {
    facets.days.forEach(d => cat.addChild(`${year}-${month}-${d} catalog`, `/${d}`));
  } else if (year) {
    facets.months.forEach(m => cat.addChild(`${year}-${m} catalog`, `/${m}`));
  }

  response.json(cat);
}

/**
 * Returns a router.
 * @param cfg map of options.
 */
function createRoutes (cfg = {}) {
  const routes = express.Router();
  routes.get('/:providerId/collections', makeAsyncHandler(getCollections));
  routes.get('/:providerId/collections/:collectionId', makeAsyncHandler(getCollection));
  routes.get('/:providerId/collections/:collectionId/items', makeAsyncHandler(getGranules));
  routes.get('/:providerId/collections/:collectionId/items/:itemId', makeAsyncHandler(getGranule));

  if (cfg.BROWSE_PATH !== undefined) {
    routes.get('/:providerId/collections/:collectionId/*', makeAsyncHandler(getCatalog));
  }
  routes.get('/conformance', (req, res) => res.json(cfg.CONFORMANCE_RESPONSE));

  return routes;
}

const routes = createRoutes(env);

module.exports = {
  getCollections,
  getCollection,
  getGranules,
  getGranule,
  getCatalog,
  routes
};
