const express = require('express');
const { wfs, generateAppUrl, logger } = require('../util');
const cmr = require('../cmr');
const convert = require('../convert');
const { generateAppUrlWithoutRelativeRoot, extractParam, generateSelfUrl } = require('../util');

async function getCollections (request, response) {
  logger.info('GET /collections');
  const event = request.apiGateway.event;
  const params = cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query);
  const collections = await cmr.findCollections(params);
  const collectionsResponse = {
    links: [
      wfs.createLink('self', generateAppUrl(event, '/collections'), 'this document')
    ],
    collections: collections.map(coll => convert.cmrCollToWFSColl(event, coll))
  };
  response.status(200).json(collectionsResponse);
}

async function getCollection (request, response) {
  logger.info(`GET /collections/${request.params.collectionId}`);
  const event = request.apiGateway.event;
  const conceptId = request.params.collectionId;
  const collection = await cmr.getCollection(conceptId);
  const collectionResponse = convert.cmrCollToWFSColl(event, collection);
  response.status(200).json(collectionResponse);
}

async function getGranules (request, response) {
  logger.info(`GET /collections/${request.params.collectionId}/items`);
  const event = request.apiGateway.event;
  const conceptId = request.params.collectionId;
  const params = Object.assign({ collection_concept_id: conceptId }, cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query));
  const granules = await cmr.findGranules(params);

  const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
  const nextPage = currPage + 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page_num = nextPage;
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

  const granulesResponse = {
    type: 'FeatureCollection',
    features: granules.map(gran => convert.cmrGranToFeatureGeoJSON(event, gran)),
    links: [
      {
        rel: 'self',
        href: generateSelfUrl(event)
      },
      {
        rel: 'next',
        href: nextResultsLink
      }
    ]
  };
  response.status(200).json(granulesResponse);
}

async function getGranule (request, response) {
  logger.info(`GET /collections/${request.params.collectionId}/items/${request.params.itemId}`);
  const event = request.apiGateway.event;
  const collConceptId = request.params.collectionId;
  const conceptId = request.params.itemId;
  const granules = await cmr.findGranules({
    collection_concept_id: collConceptId,
    concept_id: conceptId
  });
  const granuleResponse = convert.cmrGranToFeatureGeoJSON(event, granules[0]);
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
routes.get('/collections', (req, res) => getCollections(req, res));
routes.get('/collections/:collectionId', (req, res) => getCollection(req, res));
routes.get('/collections/:collectionId/items', (req, res) => getGranules(req, res));
routes.get('/collections/:collectionId/items/:itemId', (req, res) => getGranule(req, res));
routes.get('/conformance', (req, res) => res.status(200).json(CONFORMANCE_RESPONSE));

module.exports = {
  getCollections,
  getCollection,
  getGranules,
  getGranule,
  routes
};
