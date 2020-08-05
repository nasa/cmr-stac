const fieldsExtension = require('./extensions/fields');
const contextExtension = require('./extensions/context');

const EXTENSION_TYPES = {
  fields: 'fields'
};

function stripStacExtensionsFromRequestObject (request) {
  const strippedRequestObject = Object.assign({}, request);
  // TODO: All STAC API Extension query params must be stripped from GET requests
  delete strippedRequestObject.fields;
  return strippedRequestObject;
}

function applyStacExtensions (result, options) {
  let resultToReturn = Object.assign({}, result);

  resultToReturn = fieldsExtension.apply(resultToReturn, options.fields);
  resultToReturn = contextExtension.apply(resultToReturn, options.context);

  return resultToReturn;
}

module.exports = {
  EXTENSION_TYPES,
  stripStacExtensionsFromRequestObject,
  applyStacExtensions
};
