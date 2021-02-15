const _ = require('lodash');

const settings = require('../settings');
const app = require('./app');
const { UrlBuilder } = require('./url-builder');
const { WfsLink } = require('./wfs-link');
const { createLogger } = require('./logger');

const logger = createLogger(settings.logger);

function getKeyCaseInsensitive (object, key) {
  const i = Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase());
  return object[i];
}

function getHostHeader (event) {
  return getKeyCaseInsensitive(event.headers, 'host');
}

function getProtoHeader (event) {
  return getKeyCaseInsensitive(event.headers, 'CloudFront-Forwarded-Proto') ||
    getKeyCaseInsensitive(event.headers, 'X-Forwarded-Proto') || 'http';
}

function createRedirectUrl (event, redirectPath) {
  const host = getHostHeader(event);
  const protocol = getProtoHeader(event);
  return `${protocol}://${host}${settings.cmrStacRelativeRootUrl}${redirectPath}`;
}

function getStacBaseUrl (event) {
  const host = getHostHeader(event);
  const protocol = getProtoHeader(event);
  return `${protocol}://${host}${settings.cmrStacRelativeRootUrl}${settings.stac.stacRelativePath}`;
}

function createUrl (host, path, queryParams) {
  return UrlBuilder.create()
    .withProtocol('http')
    .withHost(host)
    .withPath(path)
    .withQuery(queryParams)
    .build();
}

function createSecureUrl (host, path, queryParams) {
  return UrlBuilder.create()
    .withProtocol('https')
    .withHost(host)
    .withPath(path)
    .withQuery(queryParams)
    .build();
}

function generateAppUrlWithoutRelativeRoot (event, path, queryParams = null) {
  const host = getHostHeader(event);
  const protocol = getProtoHeader(event);
  const newPath = path || '';
  return protocol === 'https' ? createSecureUrl(host, newPath, queryParams) : createUrl(host, newPath, queryParams);
}

function generateAppUrl (event, path, queryParams = null) {
  const newPath = path ? `${settings.cmrStacRelativeRootUrl}${path}` : settings.cmrStacRelativeRootUrl;
  return generateAppUrlWithoutRelativeRoot(event, newPath, queryParams);
}

function generateCloudAppUrl (event, path, queryParams = null) {
  const newPath = path ? `${settings.cmrCloudStacRelativeRootUrl}${path}` : settings.cmrCloudStacRelativeRootUrl;
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
  return UrlBuilder.create()
    .withProtocol(settings.cmrSearchProtocol)
    .withHost(settings.cmrSearchHost)
    .withPath(path)
    .withQuery(queryParams)
    .build();
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
  createRedirectUrl,
  createUrl,
  createSecureUrl,
  generateAppUrl,
  generateCloudAppUrl,
  generateAppUrlWithoutRelativeRoot,
  generateSelfUrl,
  getStacBaseUrl,
  makeCmrSearchUrl,
  WfsLink,
  createLogger,
  logger,
  makeAsyncHandler,
  generateNavLinks,
  createNavLink,
  firstIfArray,
  extractParam
};
