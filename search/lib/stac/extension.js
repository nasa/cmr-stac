const fieldsExtension = require('./extensions/fields');
const _ = require('lodash');

function stripStacExtensionsFromRequestObject (request) {
  const strippedRequestObject = Object.assign({}, request);
  // TODO: All STAC API Extension query params must be stripped from GET requests
  delete strippedRequestObject.fields;
  return strippedRequestObject;
}

function applyStacExtensions (extensions, result) {
  let resultToReturn = Object.assign({}, result);
  if (_.hasIn(extensions, EXTENSION_TYPES.fields)) {
    let fields = extensions.fields;
    if (typeof fields === 'string' || fields instanceof String) {
      fields = fieldsExtension.convertStacFieldsQueryToObject(fields);
    }
    resultToReturn = fieldsExtension.applyStacFieldsExtension(fields, resultToReturn);
  }
  return resultToReturn;
}

module.exports = {
  stripStacExtensionsFromRequestObject,
  applyStacExtensions
};

// Private

const EXTENSION_TYPES = {
  fields: 'fields'
};
