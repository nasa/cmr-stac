const settings = require('../settings');

const app = require('./app');
const { UrlBuilder } = require('./url-builder');
const { WfsLink } = require('./wfs-link');
const { createLogger } = require('./logger');

const logger = createLogger(settings.logger);

function getKeyCaseInsensitive (object, key) {
  return object[Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase())
  ];
}

function getHostHeader (event) {
  return getKeyCaseInsensitive(event.headers, 'host');
}

function getProtoHeader (event) {
  return getKeyCaseInsensitive(event.headers, 'CloudFront-Forwarded-Proto') || getKeyCaseInsensitive(event.headers, 'X-Forwarded-Proto') || 'http';
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

function generateSelfUrl (event) {
  return generateAppUrlWithoutRelativeRoot(event, event.path, event.queryStringParameters);
}

function identity (x) {
  return x;
}

module.exports = {
  ...app,
  createRedirectUrl,
  createUrl,
  createSecureUrl,
  generateAppUrl,
  generateAppUrlWithoutRelativeRoot,
  generateSelfUrl,
  getStacBaseUrl,
  identity,
  WfsLink,
  createLogger,
  logger
};
