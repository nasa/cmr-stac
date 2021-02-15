const express = require('express');
const { wfs, generateNavLinks, generateAppUrl, generateCloudAppUrl, logger, makeAsyncHandler } = require('../util');
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

/**
 * Get all the cloud holding collections for the provider in the request.
 */
async function getCloudProvider (request, response) {
  try {
    const providerId = request.params.providerId;
    logger.info(`GET /${providerId}`);
    const event = request.apiGateway.event;

    // validate that providerId is valid
    const providerList = await cmr.getProviderList();
    const isProvider = providerList.filter(providerObj => providerObj['provider-id'] === providerId);
    if (isProvider.length === 0) throw new Error(`Provider [${providerId}] not found`);

    //Query params to get cloud holdings for the provider.
    const params = Object.assign(
      { provider_short_name: providerId },
      { tag_key: "gov.nasa.earthdatacloud.s3"},
      //Used for pagination.
      //await cmr.convertParams(provider, request.query)
      { page_num: request.query.page}
    );

    const providerCloudHoldings = await cmr.findCollections(params);
    if (!providerCloudHoldings.length) {
      return response.status(400).json(`Cloud holding Collections not found for provider [${providerId}].`);
    }

    //Need to page through all the cloud collections. One page at a time, 10 collections in each page.
    const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

    const links = [
      wfs.createLink('self', generateCloudAppUrl(event, `/${providerId}`),
        'Provider catalog'),
      wfs.createLink('root', generateCloudAppUrl(event, '/'),
        'CMR-CLOUDSTAC Root catalog'),
      wfs.createLink('collections', generateCloudAppUrl(event, `/${providerId}/collections`),
        'Provider Collections'),
      wfs.createLink('search', generateCloudAppUrl(event, `/${providerId}/search`),
        'Provider Item Search')
    ];

    logger.info(`providerCloudHoldings size: ${providerCloudHoldings.length}`)
    const childLinks = await Promise.map(providerCloudHoldings, async (collection) => {
      const collectionId = await cmr.cmrCollectionIdToStacId(collection['id']);
      return wfs.createLink(
        'child',
        generateCloudAppUrl(event, `/${providerId}/collections/${collectionId}`),
        collection['entry-title']);
    });

    const provider = {
      id: providerId,
      title: providerId,
      description: `Root cloud catalog for ${providerId}`,
      stac_version: settings.stac.version,
      links: [...links, ...childLinks]
    };

    if (currPage > 1 && providerCloudHoldings.length > 1) {
      provider.links.push({
        rel: 'prev',
        href: prevResultsLink
      });
    }

    if (providerCloudHoldings.length === 10) {
      provider.links.push({
        rel: 'next',
        href: nextResultsLink
      });
    }

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

/**
 * Get all the providers.
 *   Note: We can't query cloud holding providers, so this will return all the providers.
 *         But it will return the links to cloud holding collections for these providers.
 *         It is possible that a link returns nothing if that provider doesn't contain cloud holding collections.
 */
async function getCloudProviders (request, response) {
  const event = request.apiGateway.event;
  const providers = await cmr.getProviderList();
  const providerCloudLinks = await Promise.map(providers, async (provider) => {
    return {
      title: provider['short-name'],
      rel: 'child',
      type: 'application/json',
      href: generateCloudAppUrl(event, `/${provider['provider-id']}`)
    };
  });
  const providerCloudCatalog = {
    id: 'stac',
    title: 'NASA CMR CLOUD STAC Proxy',
    stac_version: settings.stac.version,
    description: 'This is the landing page for CMR-CLOUDSTAC. Each provider link below contains a CLOUDSTAC endpoint.',
    links: providerCloudLinks
  };
  response.status(200).json(providerCloudCatalog);
}

const routes = express.Router();
routes.get('/', makeAsyncHandler(getProviders));
routes.get('/:providerId', makeAsyncHandler(getProvider));
const cloudroutes = express.Router();
cloudroutes.get('/', makeAsyncHandler(getCloudProviders));
cloudroutes.get('/:providerId', makeAsyncHandler(getCloudProvider));

module.exports = {
  getProviders,
  getCloudProviders,
  getProvider,
  getCloudProvider,
  routes,
  cloudroutes
};
