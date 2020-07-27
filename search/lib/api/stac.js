const express = require('express');

const cmr = require('../cmr');
const cmrConverter = require('../convert');
const stacExtension = require('../stac/extension');

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
  const query = stacExtension.stripStacExtensionsFromRequestObject(request.query); // The cmr function to convert params can not handle stac extensions
  const params = Object.assign({ provider: providerId }, query);
  const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
  const result = await search(event, convertedParams);
  await assertValid(schemas.items, result);
  const formatedResult = stacExtension.applyStacExtensions(request.query, result); // Apply any stac extensions that are present
  response.status(200).json(formatedResult);
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const body = stacExtension.stripStacExtensionsFromRequestObject(request.body);
  const params = Object.assign({ provider: providerId }, body);
  const result = await search(event, params);
  await assertValid(schemas.items, result);
  const formatedResult = stacExtension.applyStacExtensions(request.body, result); // Apply any stac extensions that are present
  response.status(200).json(formatedResult);
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(getSearch));
routes.post('/:providerId/search', makeAsyncHandler(postSearch));

module.exports = {
  getSearch,
  postSearch,
  routes
};
