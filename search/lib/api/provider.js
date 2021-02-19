const express = require('express');
const { wfs, generateNavLinks, generateAppUrl, logger, makeAsyncHandler } = require('../util');
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

    let providerHoldings, id, rootCatalogName;
    //Need to page through all the cloud collections. One page at a time, 10 collections in each page.
    const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

    if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
      //Query params to get cloud holdings for the provider.
      const params = Object.assign(
        { tag_key: "gov.nasa.earthdatacloud.s3"},
        //request.query is Used for pagination.
        await cmr.convertParams(providerId, request.query)
      );
      providerHoldings = await cmr.findCollections(params);
      id = "id";
      rootCatalogName="CMR-CLOUDSTAC Root catalog";
      if (!providerHoldings.length) {
        return response.status(400).json(`Cloud holding collections not found for provider [${providerId}].`);
      }
    } else {
      providerHoldings = await cmr.getProvider(providerId);
      id = "concept-id";
      rootCatalogName="CMR-STAC Root catalog";
      if (!providerHoldings.length) {
        return response.status(400).json(`Collections not found for provider [${providerId}].`);
      }
    }

    const links = [
      wfs.createLink('self', generateAppUrl(event, `/${providerId}`),
        'Provider catalog'),
      wfs.createLink('root', generateAppUrl(event, '/'),
        `${rootCatalogName}`),
      wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
        'Provider Collections'),
      wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
        'Provider Item Search')
    ];

    const childLinks = await Promise.map(providerHoldings, async (collection) => {
      const  collectionId = await cmr.cmrCollectionIdToStacId(collection[`${id}`]);
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

    if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
      if (currPage > 1 && providerHoldings.length > 1) {
        provider.links.push({
          rel: 'prev',
          href: prevResultsLink
        });
      }

      if (providerHoldings.length === 10) {
        provider.links.push({
          rel: 'next',
          href: nextResultsLink
        });
      }
    }
    
    await assertValid(schemas.catalog, provider);
    response.status(200).json(provider);
  } catch (e) {
    response.status(400).json(e.message);
  }
}

/**
 * Fetch a list of providers from CMR.
 */
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

  //Based on the route, set different id, title and description for providerCatalog.
  let id;

  if ( settings.cmrStacRelativeRootUrl === "/cloudstac") {
    id = "cloudstac";
  } else {
    id = "stac";
  }
  const ID = id.toUpperCase();

  const providerCatalog = {
    id: `${id}`,
    title: `NASA CMR ${ID} Proxy`,
    stac_version: settings.stac.version,
    description: `This is the landing page for CMR-${ID}. Each provider link below contains a ${ID} endpoint.`,
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
