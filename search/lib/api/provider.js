const express = require('express');
const {
  wfs,
  generateNavLinks,
  generateAppUrl,
  logger,
  logRequest,
  makeAsyncHandler
} = require('../util');
const settings = require('../settings');
const cmr = require('../cmr');
const Promise = require('bluebird');

const CONFORMS_TO = [
  'https://api.stacspec.org/v1.0.0-beta.1/core',
  'https://api.stacspec.org/v1.0.0-beta.1/item-search',
  'https://api.stacspec.org/v1.0.0-beta.1/item-search#fields',
  'https://api.stacspec.org/v1.0.0-beta.1/item-search#query',
  'https://api.stacspec.org/v1.0.0-beta.1/item-search#sort',
  'https://api.stacspec.org/v1.0.0-beta.1/item-search#context',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30',
  'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
];

async function getProvider(request, response) {
  const providerId = request.params.providerId;
  logger.info(`GET /${providerId}`);
  const pageSize = Number(request.query.limit || 10);
  const event = request.apiGateway.event;

  // validate that providerId is valid
  const providerList = await cmr.getProviders();
  const isProvider = providerList.filter((providerObj) => providerObj['provider-id'] === providerId);

  if (!isProvider.length) {
    return response
      .status(404)
      .json({errors: [`Provider [${providerId}] not found`]});
  }

  // Need to page through all the cloud collections. One page at a time, 10 collections in each page.
  const { currPage, prevResultsLink, nextResultsLink } = generateNavLinks(event);

  // request.query is Used for pagination.
  const cmrParams = await cmr.convertParams(providerId, request.query);

  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    // Query params to get cloud holdings for the provider.
    Object.assign(cmrParams, { cloud_hosted: 'true' });
  }
  const providerHoldings = await cmr.findCollections(cmrParams);

  const links = [
    wfs.createLink(
      'self',
      generateAppUrl(event, `/${providerId}`),
      'Provider catalog'
    ),
    wfs.createLink('root', generateAppUrl(event, '/'), 'Root catalog'),
    wfs.createLink(
      'collections',
      generateAppUrl(event, `/${providerId}/collections`),
      'Provider Collections'
    ),
    wfs.createLink(
      'search',
      generateAppUrl(event, `/${providerId}/search`),
      'Provider Item Search',
      'application/geo+json',
      'GET'
    ),
    wfs.createLink(
      'search',
      generateAppUrl(event, `/${providerId}/search`),
      'Provider Item Search',
      'application/geo+json',
      'POST'
    ),
    wfs.createLink(
      'conformance',
      generateAppUrl(event, `/${providerId}/conformance`),
      'Conformance Classes',
      'application/geo+json'
    ),
    wfs.createLink(
      'service-desc',
      'https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml',
      'OpenAPI Doc',
      'application/vnd.oai.openapi;version=3.0'
    ),
    wfs.createLink(
      'service-doc',
      'https://api.stacspec.org/v1.0.0-beta.1/index.html',
      'HTML documentation',
      'text/html'
    )
  ];

  const childLinks = providerHoldings.map((collection) => {
    const collectionId = cmr.cmrCollectionToStacId(
      collection.short_name,
      collection.version_id
    );
    return wfs.createLink(
      'child',
      generateAppUrl(event, `/${providerId}/collections/${collectionId}`),
      collection['entry-title']
    );
  });

  const provider = {
    id: providerId,
    title: providerId,
    description: `Root catalog for ${providerId}`,
    type: 'Catalog',
    stac_version: settings.stac.version,
    links: [...links, ...childLinks],
    conformsTo: CONFORMS_TO
  };

  if (currPage > 1 && providerHoldings.length > 1) {
    provider.links.push({
      rel: 'prev',
      href: prevResultsLink
    });
  }

  if (providerHoldings.length === pageSize) {
    provider.links.push({
      rel: 'next',
      href: nextResultsLink
    });
  }

  response
    .status(200)
    .json(provider);
}

/**
 * Fetch a list of providers from CMR.
 */
async function getProviders(request, response) {
  logRequest(request);
  const event = request.apiGateway.event;
  const providers = await cmr.getProviders();

  const providerLinks = await Promise.map(providers, async (provider) => {
    return {
      title: provider['short-name'],
      rel: 'child',
      type: 'application/json',
      href: generateAppUrl(event, `/${provider['provider-id']}`)
    };
  });
  const links = [
    wfs.createLink(
      'self',
      generateAppUrl(event, `/`),
      'NASA CMR-STAC Root Catalog'
    ),
    wfs.createLink(
      'root',
      generateAppUrl(event, '/'),
      'NASA CMR-STAC Root Catalog'
    ),
    wfs.createLink(
      'about',
      'https://wiki.earthdata.nasa.gov/display/ED/CMR+SpatioTemporal+Asset+Catalog+%28CMR-STAC%29+Documentation',
      'CMR-STAC Documentation'
    ),
    ...providerLinks
  ];

  // Based on the route, set different id, title and description for providerCatalog.
  const id = settings.cmrStacRelativeRootUrl === '/cloudstac' ? 'cloudstac' : 'stac';
  const id_upper = id.toUpperCase();

  const providerCatalog = {
    id,
    title: `NASA CMR ${id_upper} Proxy`,
    stac_version: settings.stac.version,
    type: 'Catalog',
    description:
      `This is the landing page for CMR-${id_upper}. Each provider link contains a ${id_upper} endpoint.`,
    links
  };

  response
    .status(200)
    .json(providerCatalog);
}

const routes = express.Router();
routes.get('/', makeAsyncHandler(getProviders));
routes.get('/:providerId', makeAsyncHandler(getProvider));
routes.get(
  '/:providerId/conformance',
  (_req, res) => res.json({ conformsTo: CONFORMS_TO })
);

module.exports = {
  getProviders,
  getProvider,
  routes
};
