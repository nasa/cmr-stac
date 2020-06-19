const express = require('express');

const cmr = require('../cmr');
const cmrConverter = require('../convert');
const { assertValid, schemas } = require('../validator');
const { logger, makeAsyncHandler } = require('../util');

async function search (event, params) {
  const cmrParams = cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
  const granules = await cmr.findGranules(cmrParams);
  return cmrConverter.cmrGranulesToFeatureCollection(event, granules);
}

async function getSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`GET /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.query);
  const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
  const result = await search(event, convertedParams);

  // TODO replace this with schema generated for full response
  for (const gran of result.features) {
    await assertValid(schemas.item, gran);
  }
  response.status(200).json(result);
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.body);
  const result = await search(event, params);

  // TODO replace this with schema generated for full response
  for (const gran of result.features) {
    await assertValid(schemas.item, gran);
  }
  response.status(200).json(result);
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(getSearch));
routes.post('/:providerId/search', makeAsyncHandler(postSearch));

module.exports = {
  getSearch,
  postSearch,
  routes
};
