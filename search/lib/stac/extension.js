const fieldsExtension = require('./extensions/fields');
const contextExtension = require('./extensions/context');
const _ = require('lodash');

const EXTENSION_TYPES = {
  fields: 'fields'
};

function stripStacExtensionsFromRequestObject (request) {
  const strippedRequestObject = Object.assign({}, request);
  // TODO: All STAC API Extension query params must be stripped from GET requests
  delete strippedRequestObject.fields;
  return strippedRequestObject;
}

function applyStacExtensions (extensions, result, options) {
  let resultToReturn = Object.assign({}, result);
  if (_.hasIn(extensions, EXTENSION_TYPES.fields)) {
    resultToReturn = fieldsExtension.apply(extensions.fields, resultToReturn);
  }

  resultToReturn = contextExtension.apply(options.context, resultToReturn);

  return resultToReturn;
}

module.exports = {
  EXTENSION_TYPES,
  stripStacExtensionsFromRequestObject,
  applyStacExtensions
};
