const express = require('express');
const { wfs, generateAppUrl, logger, makeAsyncHandler } = require('../util');
const settings = require('../settings');
const cmr = require('../cmr');

async function getProvider (request, response) {
  const providerId = request.params.providerId;
  logger.info(`GET /${providerId}`);
  const event = request.apiGateway.event;
  const provider = {
    id: providerId,
    title: providerId,
    stac_version: settings.stac.version,
    rel: 'provider',
    description: `Root endpoint for ${providerId}`,
    links: [
      wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
        'Collections for this provider'),
      wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
        'STAC Search endpoint for this provider')
    ],
    type: 'application/json'
  };
  response.status(200).json(provider);
}

async function getProviders (req, res) {
  const event = req.apiGateway.event;
  const providerObjects = (await cmr.getProviders()).map((provider) => {
    const providerId = provider['provider-id'];
    return {
      id: providerId,
      title: provider['short-name'],
      stac_version: settings.stac.version,
      rel: 'provider',
      type: 'application/json',
      links: [
        wfs.createLink('self', generateAppUrl(event, `/${providerId}`),
          'Root endpoint for this provider'),
        wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
          'Collections for this provider'),
        wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
          'STAC Search endpoint for this provider')
      ]
    };
  });
  const providerCatalog = {
    id: 'cmr-stac',
    description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
    links: providerObjects
  };
  res.status(200).json(providerCatalog);
}

const routes = express.Router();
routes.get('/', makeAsyncHandler(getProviders));
routes.get('/:providerId', makeAsyncHandler(getProvider));

module.exports = {
  getProviders,
  getProvider,
  routes
};
