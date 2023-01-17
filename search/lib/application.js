const express = require('express');
const awsServerless = require('aws-serverless-express');
const awsServerlessMiddleware = require('aws-serverless-express/middleware');
const cors = require('cors');
const morgan = require('morgan');

const api = require('./api');
const { errorHandler } = require('./error-handler');
const { logger } = require('./util');
const settings = require('./settings');

/**
 * Update a URL path to change the first part of the path to a different
 * value.
 *
 * @param path Original path
 * @param alt Path root replacement
 * @param allowedAliases List of allowed roots to re-write
 * @example
 *  rewritePathRoot("/cmr-stac/LPDAAC", "/stac") => "/stac/LPDAAC"
 */
const rewritePathRoot = (path, alt, allowedAliases) => {
  const origRoot = '/' + path.split('/')[1];

  let newPath = path;

  if (allowedAliases.indexOf(origRoot) !== -1) {
    newPath = path.replace(origRoot, alt);
  }

  return newPath;
};

/**
 * Express middleware for rewriting URLs to allow for redirects in AWS.
 */
const urlRewriteMiddleware = (req, _res, next) => {
  const routeAliases = settings.cmrStacRouteAliases
    .split(',')
    .map(s => s.trim());
  req.url = rewritePathRoot(req.url, settings.cmrStacRelativeRootUrl, routeAliases);
  next();
};

function initialize () {
  logger.debug('Initialize Application');

  const application = express();

  application.use(express.json());
  application.use(cors());
  application.use(morgan('common'));
  application.use(awsServerlessMiddleware.eventContext());
  application.use(urlRewriteMiddleware);
  application.use(settings.cmrStacRelativeRootUrl, api.routes);
  application.use(errorHandler);

  application.logger = logger;

  return application;
}

/**
 * Lambda Handler for STAC CMR Search Proxy
 * @param event
 * @param context
 * @returns {Promise<*>}
 */
module.exports.handler = async (event, context) => {
  const application = initialize();
  const server = awsServerless.createServer(application);
  return awsServerless.proxy(server, event, context, 'PROMISE').promise;
};
