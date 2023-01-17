const _ = require('lodash');
const { logger } = require('../../util');

const OPERATOR_TYPES = {
  EQ: 'eq',
  NEQ: 'neq',
  LT: 'lt',
  LTE: 'lte',
  GT: 'gt',
  GTE: 'gte',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith'
};

// TODO: Map STAC sort parameters to their equivalent CMR names
const CMR_PROP_MAP = {
  'eo:cloud_cover': 'cloud_cover'
};

class InvalidQueryPropertyError extends Error {
  constructor (propertyName) {
    super(`Property [${propertyName}] does not support querying`);
  }
}

const toCmrField = (stacProp) => {
  const cmrProp = CMR_PROP_MAP[stacProp];

  if (_.isUndefined(cmrProp)) {
    logger.warn(`The query property ${stacProp} is not currently supported!`);
    return null;
  }

  return cmrProp;
};

function prepare (params) {
  let strippedParams = _.omit(params, 'query');

  if (_.isString(params.query)) {
    // TODO: We do not support GET requests for the STAC-API Query Extension at this time
  } else if (_.isObject(params.query)) {
    Object.entries(params.query).forEach(([stacProp, query]) => {
      strippedParams = buildQuery(strippedParams, stacProp, query);
    });
  }

  return strippedParams;
}

module.exports = { prepare, InvalidQueryPropertyError };

// Private Functions

function buildQuery (params, stacProp, query) {
  const cmrField = toCmrField(stacProp);
  const paramsToReturn = { ...params };

  switch (cmrField) {
    case 'cloud_cover':
      paramsToReturn['cloud_cover'] = buildCloudCoverQuery(query);
      break;
    default:
      break;
  }

  return paramsToReturn;
}

function buildCloudCoverQuery (query) {
  let firstTerm = '';
  let secondTerm = '';

  Object.entries(query).forEach(([operator, value]) => {
    switch (operator) {
      case OPERATOR_TYPES.EQ:
      case OPERATOR_TYPES.GT:
      case OPERATOR_TYPES.GTE:
        firstTerm = value;
        break;
      case OPERATOR_TYPES.NEQ:
      case OPERATOR_TYPES.LT:
      case OPERATOR_TYPES.LTE:
        secondTerm = value;
        break;
      default:
        break;
    }
  });

  return `${firstTerm},${secondTerm}`;
}
