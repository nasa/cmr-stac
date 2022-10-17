const _ = require('lodash');

const settings = require('../settings');
const app = require('./app');
const buildUrl = require('build-url');
const { createLogger } = require('./logger');
const { createDdbClient } = require('./ddbClient');
const { errors } = require('./errors');

const ddbClient = createDdbClient(settings.ddb);
const logger = createLogger(settings.logger);

function logRequest (request) {
  const { headers, baseUrl, params, query, body } = request;
  logger.info(JSON.stringify({ headers: scrubSensitive(headers), baseUrl, params: scrubSensitive(params), query: scrubSensitive(query), body }));
}

const SENSITIVE_KEYS = [
  'authorization',
  'echo-token',
  'token',
  'password'
];

/**
 *
 */
function toArray (value) {
  if (typeof value === 'string' || value instanceof String) {
    return value.split(',');
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

function getKeyCaseInsensitive (object, key) {
  if (!object) return;

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

const makeSearchUrl = (baseUrl, path, queryParams = null) => {
  let searchUrl = '/search';
  if (baseUrl.includes('localhost')) {
    searchUrl = ':3003';
  }
  return buildUrl(baseUrl + searchUrl, {
    path,
    queryParams
  });
};

const makeCmrSearchUrl = (path, queryParams = null) => {
  return makeSearchUrl(settings.cmrUrl, path, queryParams);
};

const makeCmrSearchLbUrl = (path, queryParams = null) => {
  return makeSearchUrl(settings.cmrLbUrl, path, queryParams);
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

/**
 * Returns a map with sensitive values obfuscated.
 * Useful when logging.
 */
function scrubSensitive(data, sensitiveKeys = SENSITIVE_KEYS) {
  const scrubbed = {...data};

  Object
    .keys(scrubbed)
    .filter(k => sensitiveKeys.indexOf(k.toLowerCase()) !== -1)
    .forEach(k => {
      scrubbed[k] = `${scrubbed[k].slice(0, 8)}XXX`;
    });

  return scrubbed;
}

module.exports = {
  ...app,
  createLogger,
  createNavLink,
  ddbClient,
  extractParam,
  firstIfArray,
  generateAppUrl,
  generateAppUrlWithoutRelativeRoot,
  generateNavLinks,
  generateSelfUrl,
  logger,
  makeAsyncHandler,
  makeCmrSearchLbUrl,
  makeCmrSearchUrl,
  toArray,
  logRequest,
  scrubSensitive,
  errors
};
