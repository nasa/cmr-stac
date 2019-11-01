const settings = require('../settings');

const app = require('./app');
const { UrlBuilder } = require('./url-builder');
const { WfsLink } = require('./wfs-link');
const { createLogger } = require('./logger');

const logger = createLogger(settings.logger);

function createUrl (host, protocol, path, queryParams, relativeRootUrl = '') {
  return UrlBuilder.create()
    .withProtocol(protocol)
    .withHost(host)
    .withPath(path)
    .withQuery(queryParams)
    .withRelativeRootUrl(relativeRootUrl)
    .build();
}

function getKeyCaseInsensitive (object, key) {
  return object[Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase())
  ];
}

function getHostHeader(event) {
  return getKeyCaseInsensitive(event.headers, 'host');
}

function getProtoHeader(event) {
  return getKeyCaseInsensitive(event.headers, 'CloudFront-Forwarded-Proto') || getKeyCaseInsensitive(event.headers, 'X-Forwarded-Proto') || 'http';
}

function createRedirectUrl(event, redirectPath) {
  const host = getHostHeader(event);
  const protocol = getProtoHeader(event);
  const url = `${protocol}://${host}${settings.stac.relativeRootUrl}${redirectPath}`;
  return url;
}

function generateAppUrl (event, path, queryParams = null) {
  const host = getHostHeader(event);
  const protocol = getProtoHeader(event);
  hasRelativeRoot = path ? path.match(`^${settings.stac.relativeRootUrl}`) : false;
  if (hasRelativeRoot) {
    url = createUrl(host, protocol, path, queryParams);
  } else {
    url = createUrl(host, protocol, path, queryParams, settings.stac.relativeRootUrl);
  }

  logger.debug(`Generated URL: ${url}`);

  return url;
}

function generateSelfUrl (event) {
  return generateAppUrl(event, event.path, event.queryStringParameters);
}

function identity (x) {
  return x;
}

module.exports = {
  ...app,
  createUrl,
  createRedirectUrl,
  generateAppUrl,
  generateSelfUrl,
  identity,
  WfsLink,
  createLogger,
  logger
};
