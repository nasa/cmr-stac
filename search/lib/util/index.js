const settings = require('../settings');

const app = require('./app');
const { UrlBuilder } = require('./url-builder');
const { WfsLink } = require('./wfs-link');
const { createLogger } = require('./logger');

const logger = createLogger(settings.logger);

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

function getKeyCaseInsensitive (object, key) {
  return object[Object.keys(object)
    .find(k => k.toLowerCase() === key.toLowerCase())
  ];
}

function generateAppUrl (event, path, queryParams = null) {
  const host = getKeyCaseInsensitive(event.headers, 'Host');
  const protocol = getKeyCaseInsensitive(event.headers, 'X-Forwarded-Proto') || 'http';
  const newPath = settings.stageUrl ? `${settings.stageUrl}/${path}` : path;
  const url = protocol === 'https' ? createSecureUrl(host, newPath, queryParams) : createUrl(host, newPath, queryParams);

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
  createSecureUrl,
  generateAppUrl,
  generateSelfUrl,
  getKeyCaseInsensitive,
  identity,
  WfsLink,
  createLogger,
  logger
};
