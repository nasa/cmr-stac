const _ = require('lodash');

function firstIfArray (value) {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

const extractParam = (queryStringParams, param, defaultVal = null) => {
  if (queryStringParams && _.has(queryStringParams, param)) {
    return firstIfArray(queryStringParams[param]);
  }
  return defaultVal;
};

const createLink = (rel, href, title, type = 'application/json') => ({
  href, rel, type, title
});

module.exports = {
  firstIfArray,
  extractParam,
  wfs: {
    createLink
  }
};
