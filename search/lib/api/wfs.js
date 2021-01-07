const express = require('express');
const { isNull } = require('lodash');
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
 * Fetch a list of collections from CMR.
 */
async function getCollections (request, response) {
  try {
    logger.info(`GET ${request.params.providerId}/collections`);
    const event = request.apiGateway.event;

    const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

    const provider = request.params.providerId;
    const params = Object.assign(
      { provider_short_name: provider },
      cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, request.query)
    );
    const collections = await cmr.findCollections(params);
    if (!collections.length) {
      return response.status(400).json('Collections not found');
    }

    const collectionsResponse = {
      id: provider,
      stac_version: settings.stac.version,
      description: `All collections provided by ${provider}`,
      license: 'not-provided',
      links: [
        wfs.createLink('self', generateAppUrl(event, `/${provider}/collections`),
          `All collections provided by ${provider}`),
        wfs.createLink('root', generateAppUrl(event, '/'), 'CMR-STAC Root')
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

async function createBrowseLinks (event, provider, colid) {
  // get all child years
  const facets = await cmr.getGranuleTemporalFacets({
    collection_concept_id: colid, provider
  });
  const path = `/${provider}/collections/${colid}`;
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
  const conceptId = request.params.collectionId;
  const providerId = request.params.providerId;

  const collection = await cmr.getCollection(conceptId, providerId);
  if (isNull(collection)) {
    return response
      .status(404)
      .json(`Collection [${conceptId}] not found for provider [${providerId}]`);
  }
  const collectionResponse = convert.cmrCollToWFSColl(event, collection);
  // add browse links
  if (process.env.BROWSE_PATH) {
    const browseLinks = await createBrowseLinks(event, providerId, conceptId);
    collectionResponse.links = collectionResponse.links.concat(browseLinks);
  }
  await assertValid(schemas.collection, collectionResponse);
  response.json(collectionResponse);
}

/**
 * Fetch a list of granules from CMR.
 */
async function getGranules (request, response) {
  const collectionId = request.params.collectionId;
  const providerId = request.params.providerId;
  const event = request.apiGateway.event;
  const method = event.httpMethod;
  logger.debug(`Event: ${JSON.stringify(event)}`);
  logger.info(`${method} ${event.path}`);

  let query, fields;
  if (method === 'GET') {
    query = stacExtension.prepare(request.query);
    fields = request.query.fields;
  } else if (method === 'POST') {
    query = stacExtension.prepare(request.body);
    fields = request.body.fields;
  } else {
    throw new Error(`Invalid httpMethod ${method}`);
  }
  const params = Object.assign(
    { provider: providerId },
    cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, query)
  );
  if (collectionId) {
    params.collection_concept_id = collectionId;
  }
  try {
    const granulesResult = await cmr.findGranules(params);
    const granulesUmm = await cmr.findGranulesUmm(params);
    if (!granulesResult.granules.length) {
      return response.status(400).json('Items not found');
    }

    const featureCollection = convert.cmrGranulesToFeatureCollection(event,
      granulesResult.granules,
      granulesUmm,
      parseInt(granulesResult.totalHits),
      query);
    await assertValid(schemas.items, featureCollection);

    const formatted = stacExtension.format(featureCollection,
      {
        fields,
        context: { searchResult: granulesResult, query }
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
  const granParams = {
    collection_concept_id: collectionId,
    provider: request.params.providerId,
    concept_id: conceptId
  };
  const granules = (await cmr.findGranules(granParams)).granules;
  const granulesUmm = await cmr.findGranulesUmm(granParams);
  const granuleResponse = convert.cmrGranToFeatureGeoJSON(event, granules[0], granulesUmm[0]);
  await assertValid(schemas.item, granuleResponse);
  response.json(granuleResponse);
}

/**
 * Create parameter dictionary from browse_path_template and provided values
 */
async function getCatalog (request, response) {
  const browseTemplate = process.env.BROWSE_PATH.split('/');
  const params = request.params['0'].split('/');
  logger.debug(`browseTemplate = ${inspect(browseTemplate)}`);
  logger.debug(`params = ${inspect(params)}`);
  logger.debug(params.map((val, idx) => [browseTemplate[idx], val]));

  Object.fromEntries = l => l.reduce((a, [k, v]) => ({ ...a, [k]: v }), {});
  const browseParams = Object.fromEntries(
    params.map((val, idx) => [browseTemplate[idx], val])
  );
  logger.debug(`browseParams = ${inspect(browseParams)}`);

  const provider = request.params.providerId;
  const collection = request.params.collectionId;

  // create catalog
  const date = request.params['0'].replace(/\//g, '-');
  const cat = new Catalog();
  cat.stac_version = settings.stac.version;
  cat.id = `${collection}-${date}`;
  cat.title = `${collection} ${date}`;
  cat.description = `${provider} sub-catalog for ${date}`;

  // get path from event
  const event = request.apiGateway.event;
  const path = event.path.replace(/^(\/stac)/, '');

  // add links
  cat.createRoot(generateAppUrl(event, ''));
  const selfUrl = generateAppUrl(event, path);
  cat.createSelf(selfUrl);
  cat.createParent(selfUrl.slice(0, selfUrl.lastIndexOf('/')));

  const granParams = {
    collection_concept_id: collection,
    provider
  };
  const { year, month, day } = browseParams;
  const facets = await cmr.getGranuleTemporalFacets(granParams, year, month, day);

  if (day) {
    facets.itemids.forEach(id => cat.addItem(id, granParams.provider, granParams.collection_concept_id, id));
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
