const _ = require('lodash');

// TODO: Map STAC sort parameters to their equivalent CMR names
const CMR_PROP_MAP = {
  'properties.eo:cloud_cover': 'cloud_cover'
};

class InvalidQueryPropertyError extends Error {
  constructor (propertyName) {
    super(`Property [${propertyName}] does not support querying`);
  }
}

// TODO
const toCmrField = (stacProp) => {
  const cmrProp = CMR_PROP_MAP[stacProp];

  if (_.isUndefined(cmrProp)) throw new InvalidQueryPropertyError(stacProp);

  return cmrProp || stacProp;
};

// TODO: We need to write a function that maps each child object in the query to it's equivilant CMR param.
// For example
const translateObjectParam = ({ field, direction }) => (direction === 'desc' ? '-' : '+') + toCmrField(field);
const prepObject = (paramsObj) => paramsObj.map(translateObjectParam);

function prepare (params) {
  const strippedParams = _.omit(params, 'query');

  if (_.isString(params.query)) {
    // TODO: We do not support GET requests for the STAC-API Query Extension at this time
  } else if (_.isObject(params.query)) {
    // TODO
    return { ...strippedParams, query_key: prepObject(params.query) };
  }

  return strippedParams;
}

module.exports = { prepare, InvalidQueryPropertyError };
