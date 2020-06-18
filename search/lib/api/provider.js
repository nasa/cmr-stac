const express = require('express');
const axios = require('axios');
const { wfs, generateAppUrl, logger } = require('../util');
const settings = require('../settings');

async function getProviders (event) {
  try {
    const rawProviders = await axios.get('https://cmr.earthdata.nasa.gov/ingest/providers');
    const providers = rawProviders.data;
    const providerList = [];
    for (const provider of providers) {
      const providerId = provider['provider-id'];
      providerList.push({
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
      });
    }
    return providerList;
  } catch (error) {
    return error;
  }
}

function getProvider (request, response) {
  try {
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
  } catch (error) {
    response.status(400).error(error);
  }
}

async function getProvidersRoot (req, res) {
  try {
    const providerObjects = await getProviders(req);
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

const routes = express.Router();
routes.get('/', (req, res) => getProvidersRoot(req, res));
routes.get('/:providerId', (req, res) => getProvider(req, res));

module.exports = {
  getProviders,
  getProvider,
  routes
};
