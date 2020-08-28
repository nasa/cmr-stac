const fieldsExtension = require('./extensions/fields');
const contextExtension = require('./extensions/context');
const sortExtension = require('./extensions/sort');

const EXTENSION_TYPES = {
  fields: 'fields'
};

// extensions with `prepare` functions modify the request parameters
function prepare (params) {
  let preparedParams = Object.assign({}, params);

  preparedParams = fieldsExtension.prepare(preparedParams);
  preparedParams = sortExtension.prepare(preparedParams);

  return preparedParams;
}

// extensions with `format` functions modify the api response
function format (result, options) {
  let resultToReturn = Object.assign({}, result);

  resultToReturn = fieldsExtension.format(resultToReturn, options.fields);
  resultToReturn = contextExtension.apply(resultToReturn, options.context);

  return resultToReturn;
}

module.exports = {
  EXTENSION_TYPES,
  prepare,
  format,
  errors: {
    InvalidSortPropertyError: sortExtension.InvalidSortPropertyError
  }
};
