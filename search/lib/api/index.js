const axios = require('axios');
const path = require('path');
const express = require('express');
const cmr = require('../cmr');

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

async function getHealth (res) {
  try {
    await axios.get(cmr.makeCmrSearchUrl('/health'));
    res.status(200).json({
      search: {
        'ok?': true
      }
    });
  } catch (error) {
    res.status(503).json({
      search: {
        'ok?': false
      }
    });
  }
}

const routes = express.Router();

routes.use(stac.routes);
routes.use(wfs.routes);
routes.use('/health', (req, res) => getHealth(res));
routes.use('/docs', express.static(path.join(__dirname, '../../docs')));
routes.use('/', (req, res) => {
  if (req.accepts('html') === 'html') {
    return res.redirect(createRedirectUrl(req, `/docs/index.html`));
  } else {
    return res.status(200).json(createRootResponse(req.apiGateway.event));
  }
});
module.exports = {
  routes
};
