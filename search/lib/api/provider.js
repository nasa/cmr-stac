const express = require('express');
const { wfs, generateAppUrl, logger, makeAsyncHandler } = require('../util');
const { assertValid, schemas } = require('../validator');
const settings = require('../settings');
const cmr = require('../cmr');

function convertProvider (event, provider) {
  const providerId = provider['provider-id'];
  return {
    id: providerId,
    title: provider['short-name'],
    description: `Root catalog for ${providerId}`,
    stac_version: settings.stac.version,
    links: [
      wfs.createLink('self', generateAppUrl(event, `/${providerId}`),
        'Provider catalog'),
      wfs.createLink('root', generateAppUrl(event, '/'),
        'CMR-STAC Root catalog'),
      wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
        'Provider Collections'),
      wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
        'Provider Item Search')
    ]
  };
}

async function getProvider (request, response) {
  try {
    const providerId = request.params.providerId;
    logger.info(`GET /${providerId}`);
    const event = request.apiGateway.event;
    const providerList = await cmr.getProviders();
    const isProvider = providerList.filter(providerObj => providerObj['provider-id'] === providerId);
    if (isProvider.length === 0) throw new Error(`Provider [${providerId}] not found`);
    const provider = convertProvider(event, {
      'provider-id': providerId,
      'short-name': providerId
    });
    await assertValid(schemas.catalog, provider);
    response.status(200).json(provider);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

async function getProviders (request, response) {
  const event = request.apiGateway.event;
  const providerObjects = (await cmr.getProviders()).map((provider) => {
    const prov = convertProvider(event, provider);
    return {
      title: prov.title,
      rel: 'child',
      type: 'application/json',
      href: prov.links[0].href
    };
  });
  const providerCatalog = {
    id: 'stac',
    title: 'NASA CMR STAC Proxy',
    stac_version: settings.stac.version,
    description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
    links: providerObjects
  };
  response.status(200).json(providerCatalog);
}

const routes = express.Router();
routes.get('/', makeAsyncHandler(getProviders));
routes.get('/:providerId', makeAsyncHandler(getProvider));

module.exports = {
  getProviders,
  getProvider,
  routes
};
