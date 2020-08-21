const express = require('express');

const cmr = require('../cmr');
const cmrConverter = require('../convert');
const stacExtension = require('../stac/extension');

const { assertValid, schemas } = require('../validator');
const { logger, makeAsyncHandler } = require('../util');

async function search (event, params) {
  const cmrParams = cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
  const searchResult = await cmr.findGranules(cmrParams);
  const granulesUmm = await cmr.findGranulesUmm(cmrParams);

  return { searchResult, featureCollection: cmrConverter.cmrGranulesToFeatureCollection(event, searchResult.granules, granulesUmm) };
}

async function getSearch (request, response) {
  try {
    const providerId = request.params.providerId;
    logger.info(`GET /${providerId}/search`);
    const event = request.apiGateway.event;
    const query = stacExtension.prepare(request.query);
    const params = Object.assign({ provider: providerId }, query);
    const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
    const { searchResult, featureCollection } = await search(event, convertedParams);
    await assertValid(schemas.items, featureCollection);
    const formatted = stacExtension.format(featureCollection, { fields: request.query.fields, context: { searchResult, query } }); // Apply any stac extensions that are present
    response.status(200).json(formatted);
  } catch (error) {
    if (error instanceof stacExtension.errors.InvalidSortPropertyError) {
      response.status(422).json(error.message);
    } else {
      throw error;
    }
  }
}

async function postSearch (request, response) {
  try {
    const providerId = request.params.providerId;
    logger.info(`POST /${providerId}/search`);
    const event = request.apiGateway.event;
    const body = stacExtension.prepare(request.params);
    const params = Object.assign({ provider: providerId }, body);
    const { searchResult, featureCollection } = await search(event, params);
    await assertValid(schemas.items, featureCollection);
    const formatted = stacExtension.format(featureCollection, { fields: request.body.fields, context: { searchResult, query: params } }); // Apply any stac extensions that are present
    response.status(200).json(formatted);
  } catch (error) {
    if (error instanceof stacExtension.errors.InvalidSortPropertyError) {
      response.status(422).json(error.message);
    } else {
      throw error;
    }
  }
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(getSearch));
routes.post('/:providerId/search', makeAsyncHandler(postSearch));

module.exports = {
  getSearch,
  postSearch,
  routes
};
