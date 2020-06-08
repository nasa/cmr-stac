const axios = require('axios');
const path = require('path');
const express = require('express');
const cmr = require('../cmr');
const provider = require('./provider');

// const { createRedirectUrl, WfsLink, generateAppUrl, logger } = require('../util');

const stac = require('./stac');
const wfs = require('./wfs');

// function createRootResponse (event) {
//   logger.info('GET / - capabilities response');
//   return {
//     links: [
//       WfsLink.create('self', generateAppUrl(event, ''), 'this document'),
//       WfsLink.create('conformance', generateAppUrl(event, '/conformance'), 'WFS 3.0 conformance classes implemented by this server'),
//       WfsLink.create('data', generateAppUrl(event, '/collections'), 'Metadata about the feature collections')
//     ]
//   };
// }

async function getProvidersRoot (req, res) {
  try {
    const providerObjects = await provider.getProviders(req);
    console.log(providerObjects);
    const providerCatalog = {
      id: 'cmr-stac',
      description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
      links: providerObjects
    };
    res.status(200).json(providerCatalog);
  } catch (error) {
    res.status(400).error(error);
  }
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
// routes.use('/', (req, res) => req.accepts('html') === 'html' ? res.redirect(createRedirectUrl(req, `/docs/index.html`)) : res.status(200).json(createRootResponse(req.apiGateway.event)));
routes.use('/', (req, res) => getProvidersRoot(req, res));
module.exports = {
  routes
};
