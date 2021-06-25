const _ = require('lodash');

const settings = require('../settings');
const app = require('./app');
const buildUrl = require('build-url');
const { createLogger } = require('./logger');

const logger = createLogger(settings.logger);

function logRequest (request) {
  const { headers, baseUrl, params, query, body, apiGateway } = request;
  logger.debug(JSON.stringify({ headers, baseUrl, params, query, body, apiGateway }));
}

/**
 *
 * @param {string, array} value
 */
function toArray (value) {
  console.log(`Value: ${value}`);
  if (typeof value === 'string' || value instanceof String) {
    return value.split(',');
  } else {
    return value;
  }
}

function getKeyCaseInsensitive (object, key) {
  const i = Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase());
  return object[i];
}

function getHostHeader (event) {
  return getKeyCaseInsensitive(event.headers, 'host');
}

function generateAppUrlWithoutRelativeRoot (event, path, parameters) {
  const host = getHostHeader(event);

  let stagePath = '';
  if (event.requestContext) {
    const resourcePath = event.requestContext.resourcePath;
    if (resourcePath) {
      stagePath = resourcePath.substr(0, resourcePath.lastIndexOf('{proxy*}') - 1);
    }
  }

  const newPath = `${stagePath}${path || ''}`;

  let queryParams = parameters;
  if (parameters !== null && parameters instanceof Array) {
    if (parameters.length === 0) {
      queryParams = null;
    }
  }

  const url = buildUrl(`${settings.protocol}://${host}`, {
    path: newPath,
    queryParams
  });

  return url;
}

function generateAppUrl (event, path, queryParams = null) {
  const newPath = path ? `${settings.cmrStacRelativeRootUrl}${path}` : settings.cmrStacRelativeRootUrl;
  return generateAppUrlWithoutRelativeRoot(event, newPath, queryParams);
}

function generateSelfUrl (event) {
  return generateAppUrlWithoutRelativeRoot(event, event.path, event.queryStringParameters);
}

function makeAsyncHandler (fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}

const makeCmrSearchUrl = (path, queryParams = null) => {
  return buildUrl(settings.cmrUrl + '/search', {
    path,
    queryParams
  });
};

function firstIfArray (value) {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

const extractParam = (queryStringParams, param, defaultVal = null) => {
  if (queryStringParams && _.has(queryStringParams, param)) {
    return firstIfArray(queryStringParams[param]);
  }
  return defaultVal;
};

function generateNavLinks (event) {
  const currPage = parseInt(extractParam(event.queryStringParameters, 'page', '1'), 10);
  const nextPage = currPage + 1;
  const prevPage = currPage - 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page = nextPage;
  const newPrevParams = { ...event.queryStringParameters } || {};
  newPrevParams.page = prevPage;
  const prevResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newPrevParams);
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);
  return { currPage, prevResultsLink, nextResultsLink };
}

function createNavLink (event, params, rel) {
  const method = event.httpMethod;
  const currPage = parseInt(_.get(params, 'page', 1), 10);

  const page = (rel === 'prev') ? currPage - 1 : currPage + 1;

  const newParams = { ...params };
  newParams.page = page;

  let link = {};
  if (method === 'POST') {
    link = {
      rel,
      method,
      merge: false,
      body: newParams,
      href: generateAppUrlWithoutRelativeRoot(event, event.path)
    };
  } else if (method === 'GET') {
    link = {
      rel,
      method,
      href: generateAppUrlWithoutRelativeRoot(event, event.path, newParams)
    };
  } else {
    logger.warn(`Unable to create navigation links for unknown httpMethod: ${method}`);
  }

  return link;
}

module.exports = {
  ...app,
  logRequest,
  toArray,
  generateAppUrl,
  generateAppUrlWithoutRelativeRoot,
  generateSelfUrl,
  makeCmrSearchUrl,
  createLogger,
  logger,
  makeAsyncHandler,
  generateNavLinks,
  createNavLink,
  firstIfArray,
  extractParam
};
