const express = require('express');

const cmr = require('../cmr');
const { cmrGranulesToFeatureCollection } = require('../convert');
const stacExtension = require('../stac/extension');

const { assertValid, schemas } = require('../validator');
const { logger, makeAsyncHandler } = require('../util');

/**
 * Primary search function for STAC.
 */
async function search (request, response) {
  const providerId = request.params.providerId;
  const event = request.apiGateway.event;
  const method = event.httpMethod;
  logger.debug(`Event: ${JSON.stringify(event)}`);
  logger.info(`${method} /${providerId}/search`);

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
  const params = Object.assign({ provider: providerId }, query);

  try {
    const cmrParams = cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
    const searchResult = await cmr.findGranules(cmrParams);
    const granulesUmm = await cmr.findGranulesUmm(cmrParams);

    const featureCollection = cmrGranulesToFeatureCollection(event,
      searchResult.granules,
      granulesUmm,
      params
    );

    await assertValid(schemas.items, featureCollection);
    const formatted = stacExtension.format(featureCollection,
      {
        fields,
        context: { searchResult, query }
      });
    // Apply any stac extensions that are present
    response.json(formatted);
  } catch (error) {
    if (error instanceof stacExtension.errors.InvalidSortPropertyError) {
      response.status(422).json(error.message);
    } else {
      throw error;
    }
  }
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(search));
routes.post('/:providerId/search', makeAsyncHandler(search));

module.exports = {
  search,
  routes
};
