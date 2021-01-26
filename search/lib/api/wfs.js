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

async function createBrowseLinks (event, provider, collectionId) {
  // get all child years
  const params = cmr.stacCollectionToCmrParams(provider, collectionId);
  const facets = await cmr.getGranuleTemporalFacets(params);
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

  const cmrParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
  const collections = await cmr.findCollections(cmrParams);

  if ((!collections) || (collections.length === 0)) {
    return response
      .status(404)
      .json(`Collection [${collectionId}] not found for provider [${providerId}]`);
  }
  const collectionResponse = convert.cmrCollToWFSColl(event, collections[0]);
  // add browse links
  if (process.env.BROWSE_PATH) {
    const browseLinks = await createBrowseLinks(event, providerId, collectionId);
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

  try {
    const cmrParams = Object.assign(
      { provider: providerId },
      cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, query)
    );
    if (collectionId) {
      Object.assign(cmrParams, cmr.stacCollectionToCmrParams(providerId, collectionId));
    }
    const granulesResult = await cmr.findGranules(cmrParams);
    if (!granulesResult.granules.length) {
      return response.status(400).json('Items not found');
    }

    const featureCollection = await convert.cmrGranulesToStac(event,
      granulesResult.granules,
      parseInt(granulesResult.hits),
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

  const cmrParams = Object.assign(
    { concept_id: conceptId },
    cmr.stacCollectionToCmrParams(providerId, collectionId)
  );

  const granules = (await cmr.findGranules(cmrParams)).granules;
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
  const cmrParams = cmr.stacCollectionToCmrParams(providerId, collectionId);
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
