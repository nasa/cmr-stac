const express = require('express');
const awsServerless = require('aws-serverless-express');
const awsServerlessMiddleware = require('aws-serverless-express/middleware');
const cors = require('cors');

const api = require('./api');
const { errorHandler } = require('./error-handler');
const { logger } = require('./util');
const settings = require('./settings');

/**
 * Express middleware for rewriting URLs to allow for redirects in AWS.
 */
const urlRewriteMiddleware = (req, res, next) => {
  const routeAliases = settings.cmrStacRouteAliases ? settings.cmrStacRouteAliases.split(',') : ['/cmr-stac'];
  const reqUrlRoot = '/' + req.url.split('/')[1];

  if (routeAliases.indexOf(reqUrlRoot) !== -1) {
    req.url = req.url.replace(reqUrlRoot, settings.cmrStacRelativeRootUrl);
  }
  next();
};

async function initialize () {
  logger.debug('Initialize Application');

  const application = express();

  application.use(express.json());
  application.use(awsServerlessMiddleware.eventContext());
  application.use(urlRewriteMiddleware);
  application.use(settings.cmrStacRelativeRootUrl, api.routes);
  application.use(cors());
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
  const application = await initialize();
  const server = awsServerless.createServer(application);
  return awsServerless.proxy(server, event, context, 'PROMISE').promise;
};
