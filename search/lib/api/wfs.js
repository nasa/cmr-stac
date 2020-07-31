const express = require('express');
const { isNull } = require('lodash');
const { wfs, generateAppUrl, logger, makeAsyncHandler, extractParam, generateAppUrlWithoutRelativeRoot } = require('../util');
const cmr = require('../cmr');
const convert = require('../convert');
const { assertValid, schemas } = require('../validator');
const settings = require('../settings');

class NotFoundError extends Error {}

async function getCollections (request, response) {
  try {
    logger.info(`GET ${request.params.providerId}/collections`);
    const event = request.apiGateway.event;

    const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
    const nextPage = currPage + 1;
    const prevPage = currPage - 1;
    const newParams = { ...event.queryStringParameters } || {};
    newParams.page_num = nextPage;
    const newPrevParams = { ...event.queryStringParameters } || {};
    newPrevParams.page_num = prevPage;
    const prevResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newPrevParams);
    const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

    const provider = request.params.providerId;
    const params = Object.assign(
      { provider_short_name: provider },
      cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query)
    );
    const collections = await cmr.findCollections(params);
    if (!collections.length) throw new Error('Collections not found');
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
    response.status(200).json(collectionsResponse);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

async function getCollection (request, response) {
  try {
    logger.info(`GET /${request.params.providerId}/collections/${request.params.collectionId}`);
    const event = request.apiGateway.event;
    const conceptId = request.params.collectionId;
    const providerId = request.params.providerId;
    const collection = await cmr.getCollection(conceptId, providerId);
    if (isNull(collection)) throw new NotFoundError(`Collection [${conceptId}] not found for provider [${providerId}]`);
    const collectionResponse = convert.cmrCollToWFSColl(event, collection);
    await assertValid(schemas.collection, collectionResponse);
    response.status(200).json(collectionResponse);
  } catch (error) {
    if (error instanceof NotFoundError) {
      response.status(404).json(error.message);
    } else {
      throw error;
    }
  }
}

async function getGranules (request, response) {
  try {
    const conceptId = request.params.collectionId;
    const providerId = request.params.providerId;
    logger.info(`GET /${providerId}/collections/${conceptId}/items`);
    const event = request.apiGateway.event;
    const params = Object.assign(
      { collection_concept_id: conceptId,
        provider: providerId },
      cmr.convertParams(cmr.WFS_PARAMS_CONVERSION_MAP, request.query)
    );
    const granules = await cmr.findGranules(params);
    const granulesUmm = await cmr.findGranulesUmm(params);
    if (!granules.length) throw new Error('Items not found');
    const granulesResponse = convert.cmrGranulesToFeatureCollection(event, granules, granulesUmm);
    await assertValid(schemas.items, granulesResponse);
    response.status(200).json(granulesResponse);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

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
  const granules = await cmr.findGranules(granParams);
  const granulesUmm = await cmr.findGranulesUmm(granParams);
  const granuleResponse = convert.cmrGranToFeatureGeoJSON(event, granules[0], granulesUmm[0]);
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
