const express = require('express');

const cmr = require('../cmr');
const cmrConverter = require('../convert');
const _ = require('lodash');

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
  const query = stripStacExtensionsFromRequestObject(request.query); // The cmr function to convert params can not handle stac extensions
  const params = Object.assign({ provider: providerId }, query);
  const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
  const result = await search(event, convertedParams);
  await assertValid(schemas.items, result);
  const formatedResult = applyStacExtensions(request.query, result); // Apply any stac extensions that are present
  response.status(200).json(formatedResult);
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const body = stripStacExtensionsFromRequestObject(request.body);
  const params = Object.assign({ provider: providerId }, body);
  const result = await search(event, params);
  await assertValid(schemas.items, result);
  const formatedResult = applyStacExtensions(request.body, result); // Apply any stac extensions that are present
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
function stripStacExtensionsFromRequestObject (request) {
  const strippedRequestObject = Object.assign({}, request);
  // TODO: All STAC API Extension query params must be stripped from GET requests
  delete strippedRequestObject.fields;
  return strippedRequestObject;
}

function applyStacExtensions (extensions, result) {
  let resultToReturn = Object.assign({}, result);
  if ('fields' in extensions) {
    let fields = extensions.fields;
    if (typeof fields === 'string' || fields instanceof String) {
      fields = convertStacFieldsQueryToObject(fields);
    }
    resultToReturn = applyStacFieldsExtension(fields, resultToReturn);
  }
  return resultToReturn;
}

function convertStacFieldsQueryToObject (fieldsQuery) {
  const fieldsArray = fieldsQuery.split(',');
  const include = fieldsArray.filter(field => field.startsWith('-') === false).map(field => field.replace(/^\+/, ''));
  const exclude = fieldsArray.filter(field => field.startsWith('-') === true).map(field => field.replace(/^-/, ''));
  return { include, exclude };
}

function applyStacFieldsExtension (fields, result) {
  const { _sourceIncludes, _sourceExcludes } = buildFieldsFilter(fields);

  result.features = result.features.map(feature => {
    const featureWithIncludes = _.pick(feature, _sourceIncludes);
    const featureWithoutExcludes = _.omit(featureWithIncludes, _sourceExcludes);
    return featureWithoutExcludes;
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
