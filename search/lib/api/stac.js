const express = require('express');

const cmr = require('../cmr');
const cmrConverter = require('../convert');
const { validateStac } = require('../validator');
const { logger } = require('../util');

let validResult = true;

// TODO finish updating this file

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

  validResult = validateStac(result);
  validResult ? response.status(200).json(result) : response.status(400).json('Bad Request');
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.body);
  const result = await search(event, params);

  validResult = validateStac(result);
  validResult ? response.status(200).json(result) : response.status(400).json('Bad Request');
}

const routes = express.Router();

routes.get('/:providerId/search', (req, res, next) => getSearch(req, res).catch(next));
routes.post('/:providerId/search', (req, res, next) => postSearch(req, res).catch(next));

module.exports = {
  getSearch,
  postSearch,
  routes
};
