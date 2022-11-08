const _ = require('lodash');

// Map STAC sort parameters to their equivalent CMR names
const CMR_PROP_MAP = {
  'properties.start_datetime': 'start_date',
  'properties.end_datetime': 'end_date',
  'properties.datetime': 'start_date',
  short_name: 'short_name'
};

class InvalidSortPropertyError extends Error {
  constructor (propertyName) {
    super(`Property [${propertyName}] does not support sorting`);
  }
}

const toCmrField = (stacProp) => {
  const cmrProp = CMR_PROP_MAP[stacProp];

  if (_.isUndefined(cmrProp)) throw new InvalidSortPropertyError(stacProp);

  return cmrProp || stacProp;
};

const translateStringParam = (sort) => {
  const direction = ((sort[0]) === '-' ? '-' : '+');
  const field = sort.replace(/^[+-]/, '');
  return direction + toCmrField(field);
};

const translateObjectParam = ({ field, direction }) => (direction === 'desc' ? '-' : '+') + toCmrField(field);
const prepObject = (paramsObj) => paramsObj.map(translateObjectParam);
const prepString = (paramString) => paramString.split(',').map(translateStringParam);

function prepare (params) {
  const strippedParams = _.omit(params, 'sortby');

  if (_.isString(params.sortby)) {
    return { ...strippedParams, sort_key: prepString(params.sortby) };
  } else if (_.isArray(params.sortby)) {
    return { ...strippedParams, sort_key: prepObject(params.sortby) };
  }

  return strippedParams;
}

module.exports = { prepare, InvalidSortPropertyError };
