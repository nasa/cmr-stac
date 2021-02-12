const express = require('express');
const { wfs, generateAppUrl, logger, makeAsyncHandler } = require('../util');
const { assertValid, schemas } = require('../validator');
const settings = require('../settings');
const cmr = require('../cmr');
const Promise = require('bluebird');

async function getProvider (request, response) {
  try {
    const providerId = request.params.providerId;
    logger.info(`GET /${providerId}`);
    const event = request.apiGateway.event;

    // validate that providerId is valid
    const providerList = await cmr.getProviderList();
    const isProvider = providerList.filter(providerObj => providerObj['provider-id'] === providerId);
    if (isProvider.length === 0) throw new Error(`Provider [${providerId}] not found`);

    const links = [
      wfs.createLink('self', generateAppUrl(event, `/${providerId}`),
        'Provider catalog'),
      wfs.createLink('root', generateAppUrl(event, '/'),
        'CMR-STAC Root catalog'),
      wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
        'Provider Collections'),
      wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
        'Provider Item Search')
    ];

    const providerHoldings = await cmr.getProvider(providerId);
    const childLinks = await Promise.map(providerHoldings, async (collection) => {
      const collectionId = await cmr.cmrCollectionIdToStacId(collection['concept-id']);
      return wfs.createLink(
        'child',
        generateAppUrl(event, `/${providerId}/collections/${collectionId}`),
        collection['entry-title']);
    });

    const provider = {
      id: providerId,
      title: providerId,
      description: `Root catalog for ${providerId}`,
      stac_version: settings.stac.version,
      links: [...links, ...childLinks]
    };
    await assertValid(schemas.catalog, provider);
    response.status(200).json(provider);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

async function getProviders (request, response) {
  const event = request.apiGateway.event;
  const providers = await cmr.getProviderList();
  const providerLinks = await Promise.map(providers, async (provider) => {
    return {
      title: provider['short-name'],
      rel: 'child',
      type: 'application/json',
      href: generateAppUrl(event, `/${provider['provider-id']}`)
    };
  });
  const providerCatalog = {
    id: 'stac',
    title: 'NASA CMR STAC Proxy',
    stac_version: settings.stac.version,
    description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
    links: providerLinks
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
