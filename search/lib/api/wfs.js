const express = require('express');
const { wfs, generateAppUrl, logger } = require('../util');
const cmr = require('../cmr');
const settings = require('../settings');
const convert = require('../convert');
const { generateAppUrlWithoutRelativeRoot, generateSelfUrl, extractParam } = require('../util');

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
    description: `All collections provided by ${provider}`,
    links: [
      wfs.createLink('self', generateAppUrl(event, `/${provider}/collections`),
        `All collections provided by ${provider}`),
      wfs.createLink('root', generateAppUrl(event, '/'), 'CMR-STAC Root')
    ],
    collections: collections.map(coll => convert.cmrCollToWFSColl(event, coll))
  };
  response.status(200).json(collectionsResponse);
}

async function getCollection (request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}`);
  const event = request.apiGateway.event;
  const conceptId = request.params.collectionId;
  const collection = await cmr.getCollection(conceptId);
  const collectionResponse = convert.cmrCollToWFSColl(event, collection);
  response.status(200).json(collectionResponse);
}

async function getGranules (request, response) {
  logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}/items`);
  const event = request.apiGateway.event;
  const conceptId = request.params.collectionId;
  const params = Object.assign({ collection_concept_id: conceptId }, cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query));
  const granules = await cmr.findGranules(params);

  const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
  const nextPage = currPage + 1;
  const prevPage = currPage - 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page_num = nextPage;
  const newPrevParams = { ...event.queryStringParameters } || {};
  newPrevParams.page_num = prevPage;
  const prevResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newPrevParams);
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

  const granulesResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
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

  if (currPage > 1 && granulesResponse.links.length > 1) {
    granulesResponse.links.splice(1, 0, {
      rel: 'prev',
      href: prevResultsLink
    });
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
routes.get('/:providerId/collections', (req, res) => getCollections(req, res));
routes.get('/:providerId/collections/:collectionId', (req, res) => getCollection(req, res));
routes.get('/:providerId/collections/:collectionId/items', (req, res) => getGranules(req, res));
routes.get('/:providerId/collections/:collectionId/items/:itemId', (req, res) => getGranule(req, res));
routes.get('/conformance', (req, res) => res.status(200).json(CONFORMANCE_RESPONSE));

module.exports = {
  getCollections,
  getCollection,
  getGranules,
  getGranule,
  routes
};
