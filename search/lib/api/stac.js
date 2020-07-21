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
  const query = stripStacExtensionsFromURLQuery(request.query);
  const params = Object.assign({ provider: providerId }, query);
  const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
  const result = await search(event, convertedParams);
  await assertValid(schemas.items, result);
  const formatedResult = applyStacExtensions(request.query, result);
  response.status(200).json(formatedResult);
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.body);
  const result = await search(event, params);
  await assertValid(schemas.items, result);
  const formatedResult = applyStacExtensions(request.query, result);
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

// Private Functions
function stripStacExtensionsFromURLQuery (query) {
  const strippedQuery = Object.assign({}, query);
  // TODO: All STAC API Extension query params must be stripped from GET requests
  delete strippedQuery.fields;
  return strippedQuery;
}

function applyStacExtensions (query, result) {
  let resultToReturn = Object.assign({}, result);
  if (query.fields) {
    resultToReturn = applyStacFieldsExtension(query.fields, resultToReturn);
  }
  return resultToReturn;
}

function applyStacFieldsExtension (fields, result) {
  // 1: Organize fields
  const fieldsArray = fields.split(',');
  const include = fieldsArray.filter(field => field.startsWith('-') === false).map(field => field.replace(/^\+/, ''));
  const exclude = fieldsArray.filter(field => field.startsWith('-') === true).map(field => field.replace(/^-/, ''));
  const fieldsFilter = buildFieldsFilter({ include, exclude });

  result.features.forEach(feature => {
    const { _sourceIncludes, _sourceExcludes } = fieldsFilter;
    const featureProperties = Object.getOwnPropertyNames(feature);
    const additionalFieldsToRemove = featureProperties.filter(function (field) {
      const index = _sourceIncludes.indexOf(field);
      let boolToReturn = true;
      if (index >= 0) {
        boolToReturn = false;
      }
      return boolToReturn;
    });
    const excludesConcat = _sourceExcludes.concat(additionalFieldsToRemove);
    const excludesUnion = [...new Set(excludesConcat)];
    excludesUnion.forEach(field => { delete feature[`${field}`]; });
  });

  return result;
}

function buildFieldsFilter (fields) {
  const { include, exclude } = fields;
  let _sourceIncludes = [
    'id',
    'type',
    'geometry',
    'bbox',
    'links',
    'assets',
    'collection',
    'properties.datetime'
  ];
  let _sourceExcludes = [];
  // Add include fields to the source include list if they're not already in it
  if (include && include.length > 0) {
    include.forEach((field) => {
      if (_sourceIncludes.indexOf(field) < 0) {
        _sourceIncludes.push(field);
      }
    });
  }
  // Remove exclude fields from the default include list and add them to the source exclude list
  if (exclude && exclude.length > 0) {
    _sourceIncludes = _sourceIncludes.filter((field) => !exclude.includes(field));
    _sourceExcludes = exclude;
  }
  return { _sourceIncludes, _sourceExcludes };
}
