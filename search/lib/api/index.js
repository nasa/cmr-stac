const path = require('path');
const express = require('express');

const { createRedirectUrl, WfsLink, generateAppUrl, logger } = require('../util');

const stac = require('./stac');
const wfs = require('./wfs');

function createRootResponse (event) {
  logger.info('GET / - capabilities response');
  return {
    links: [
      WfsLink.create('self', generateAppUrl(event, ''), 'this document'),
      WfsLink.create('conformance', generateAppUrl(event, '/conformance'), 'WFS 3.0 conformance classes implemented by this server'),
      WfsLink.create('data', generateAppUrl(event, '/collections'), 'Metadata about the feature collections')
    ]
  };
}

const routes = express.Router();

routes.use(stac.routes);
routes.use(wfs.routes);
routes.use('/docs', express.static(path.join(__dirname, '../../docs')));
routes.use('/', (req, res) =>
  req.accepts('html') === 'html' ? res.redirect(createRedirectUrl(req, `/docs/index.html`)) : res.status(200).json(createRootResponse(req.apiGateway.event)));

module.exports = {
  routes
};
