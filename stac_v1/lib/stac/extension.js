const contextExtension = require('./extensions/context');
const fieldsExtension = require('./extensions/fields');
const queryExtension = require('./extensions/query');
const sortExtension = require('./extensions/sort');

const EXTENSION_TYPES = {
  fields: 'fields'
};

/**
 * Extensions with `prepare` functions modify the request parameters
 * @param params
 * @returns {{[p: string]: *}|{sort_key}}
 */
function prepare (params) {
  let preparedParams = Object.assign({}, params);

  preparedParams = fieldsExtension.prepare(preparedParams);
  preparedParams = queryExtension.prepare(preparedParams);
  preparedParams = sortExtension.prepare(preparedParams);

  return preparedParams;
}

/**
 * Extensions with `format` functions modify the api response
 * @param result
 * @param options
 * @returns {{context: {limit: number, matched: number, returned: *}}}
 */
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
    InvalidSortPropertyError: sortExtension.InvalidSortPropertyError,
    InvalidQueryPropertyError: queryExtension.InvalidQueryPropertyError
  }
};
