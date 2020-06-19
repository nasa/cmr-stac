const express = require('express');
const { wfs, generateAppUrl, logger, makeAsyncHandler } = require('../util');
const cmr = require('../cmr');
const convert = require('../convert');
const { assertValid, schemas } = require('../validator');
const settings = require('../settings');

async function getCollections (request, response) {
  logger.info(`GET ${request.params.providerId}/collections`);
  const event = request.apiGateway.event;
  const provider = request.params.providerId;
  const params = Object.assign(
    { provider_short_name: provider },
    cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query)
  );
  const collections = await cmr.findCollections(params);
  const collectionsResponse = {
    id: provider,
    stac_version: settings.stac.version,
    description: `All collections provided by ${provider}`,
    links: [
      wfs.createLink('self', generateAppUrl(event, `/${provider}/collections`),
        `All collections provided by ${provider}`),
      wfs.createLink('root', generateAppUrl(event, '/'), 'CMR-STAC Root')
    ],
    license: 'not-provided',
    collections: collections.map(coll => convert.cmrCollToWFSColl(event, coll))
  };
  // TODO replace this with schema generated for full response
  for (const coll of collectionsResponse.collections) {
    await assertValid(schemas.collection, coll);
  }
  response.status(200).json(collectionsResponse);
}

async function getCollection (request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}`);
  const event = request.apiGateway.event;
  const conceptId = request.params.collectionId;
  const collection = await cmr.getCollection(conceptId);
  const collectionResponse = convert.cmrCollToWFSColl(event, collection);
  await assertValid(schemas.collection, collectionResponse);
  response.status(200).json(collectionResponse);
}

async function getGranules (request, response) {
  const conceptId = request.params.collectionId;
  logger.info(`GET /${request.params.providerId}/collections/${conceptId}/items`);
  const event = request.apiGateway.event;
  const params = Object.assign(
    { collection_concept_id: conceptId },
    cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query)
  );
  const granules = await cmr.findGranules(params);
  const granulesResponse = convert.cmrGranulesToFeatureCollection(event, granules);
  // TODO replace this with schema generated for full response
  for (const gran of granulesResponse.features) {
    await assertValid(schemas.item, gran);
  }
  response.status(200).json(granulesResponse);
}

async function getGranule (request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}/items/${request.params.itemId}`);
  const event = request.apiGateway.event;
  const collConceptId = request.params.collectionId;
  const conceptId = request.params.itemId;
  const granules = await cmr.findGranules({
    collection_concept_id: collConceptId,
    concept_id: conceptId
  });
  const granuleResponse = convert.cmrGranToFeatureGeoJSON(event, granules[0]);
  await assertValid(schemas.item, granuleResponse);
  response.status(200).json(granuleResponse);
}

const CONFORMANCE_RESPONSE = {
  conformsTo: [
    'http://www.opengis.net/spec/wfs-1/3.0/req/core',
    'http://www.opengis.net/spec/wfs-1/3.0/req/oas30',
    'http://www.opengis.net/spec/wfs-1/3.0/req/html',
    'http://www.opengis.net/spec/wfs-1/3.0/req/geojson'
  ]
};

const routes = express.Router();
routes.get('/:providerId/collections', makeAsyncHandler(getCollections));
routes.get('/:providerId/collections/:collectionId', makeAsyncHandler(getCollection));
routes.get('/:providerId/collections/:collectionId/items', makeAsyncHandler(getGranules));
routes.get('/:providerId/collections/:collectionId/items/:itemId', makeAsyncHandler(getGranule));
routes.get('/conformance', (req, res) => res.status(200).json(CONFORMANCE_RESPONSE));

module.exports = {
  getCollections,
  getCollection,
  getGranules,
  getGranule,
  routes
};
