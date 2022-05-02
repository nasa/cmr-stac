/**
 * @jest-environment node
 */

const { getProvider, getProviders } = require('../../lib/api/provider');
const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const {
  mockFunction,
  revertFunction,
  createMockResponse,
  createRequest } = require('../util');
const { logger } = require('../../lib/util');

const origLogLevel = logger.level;
beforeAll(() => {
  logger.level = 'error';
});

afterAll(() => {
  logger.level = origLogLevel;
});

const mockProviderResponse = [
  'provA',
  'provB',
  'provC'
].map((providerId) => ({
  'provider-id': providerId,
  'short-name': `${providerId}Short`
}));

const expectedLinks = [
  {
    title: 'NASA CMR-STAC Root Catalog',
    rel: 'self',
    type: 'application/json',
    href: 'https://example.com/stac/'
  },
  {
    title: 'NASA CMR-STAC Root Catalog',
    rel: 'root',
    type: 'application/json',
    href: 'https://example.com/stac/'
  },
  {
    title: 'CMR-STAC Documentation',
    rel: 'about',
    type: 'application/json',
    href: 'https://wiki.earthdata.nasa.gov/display/ED/CMR+SpatioTemporal+Asset+Catalog+%28CMR-STAC%29+Documentation'
  },
  {
    title: 'provAShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/provA'
  },
  {
    title: 'provBShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/provB'
  },
  {
    title: 'provCShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/provC'
  }
];

const expectedCloudLinks = [
  {
    title: 'NASA CMR-STAC Root Catalog',
    rel: 'self',
    type: 'application/json',
    href: 'https://example.com/cloudstac/'
  },
  {
    title: 'NASA CMR-STAC Root Catalog',
    rel: 'root',
    type: 'application/json',
    href: 'https://example.com/cloudstac/'
  },
  {
    title: 'CMR-STAC Documentation',
    rel: 'about',
    type: 'application/json',
    href: 'https://wiki.earthdata.nasa.gov/display/ED/CMR+SpatioTemporal+Asset+Catalog+%28CMR-STAC%29+Documentation'
  },
  {
    title: 'provAShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/provA'
  },
  {
    title: 'provBShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/provB'
  },
  {
    title: 'provCShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/provC'
  }
];

describe('getProviders', () => {
  describe('within /stac', () => {
    beforeEach(() => {
      mockFunction(cmr, 'getProviderList', Promise.resolve(mockProviderResponse));
    });
    afterEach(() => {
      revertFunction(cmr, 'getProviderList');
    });

    it('should return an array', async () => {
      const response = createMockResponse();
      await getProviders(createRequest(), response);
      response.expect({
        description: 'This is the landing page for CMR-STAC. Each provider link contains a STAC endpoint.',
        title: 'NASA CMR STAC Proxy',
        stac_version: settings.stac.version,
        type: 'Catalog',
        id: 'stac',
        links: expectedLinks
      });
    });
  });

  describe('within /cloudstac', () => {
    beforeEach(() => {
      settings.cmrStacRelativeRootUrl = '/cloudstac';
      mockFunction(cmr, 'getProviderList', Promise.resolve(mockProviderResponse));
    });
    afterEach(() => {
      settings.cmrStacRelativeRootUrl = '/stac';
      revertFunction(cmr, 'getProviderList');
    });

    it('should return an array', async () => {
      const response = createMockResponse();
      await getProviders(createRequest(), response);
      const desc = 'This is the landing page for CMR-CLOUDSTAC. Each provider link contains a CLOUDSTAC endpoint.';
      response.expect({
        description: desc,
        title: 'NASA CMR CLOUDSTAC Proxy',
        stac_version: settings.stac.version,
        type: 'Catalog',
        id: 'cloudstac',
        links: expectedCloudLinks
      });
    });
  });
});

describe('getProvider', () => {
  describe('within /stac', () => {
    it('should return a provider json object', async () => {
      const expectedResponse = {
        id: 'USGS_EROS',
        title: 'USGS_EROS',
        description: 'Root catalog for USGS_EROS',
        stac_version: settings.stac.version,
        type: 'Catalog',
        links: [
          {
            rel: 'self',
            href: 'https://example.com/stac/USGS_EROS',
            title: 'Provider catalog',
            type: 'application/json'
          },
          {
            rel: 'root',
            href: 'https://example.com/stac/',
            title: 'Root catalog',
            type: 'application/json'
          },
          {
            rel: 'collections',
            href: 'https://example.com/stac/USGS_EROS/collections',
            title: 'Provider Collections',
            type: 'application/json'
          },
          {
            rel: 'search',
            href: 'https://example.com/stac/USGS_EROS/search',
            title: 'Provider Item Search',
            type: 'application/geo+json',
            method: 'GET'
          },
          {
            rel: 'search',
            href: 'https://example.com/stac/USGS_EROS/search',
            title: 'Provider Item Search',
            type: 'application/geo+json',
            method: 'POST'
          },
          {
            rel: 'conformance',
            href: 'https://example.com/stac/USGS_EROS/conformance',
            title: 'Conformance Classes',
            type: 'application/geo+json'
          },
          {
            rel: 'service-desc',
            href: 'https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml',
            title: 'OpenAPI Doc',
            type: 'application/vnd.oai.openapi;version=3.0'
          },
          {
            rel: 'service-doc',
            href: 'https://api.stacspec.org/v1.0.0-beta.1/index.html',
            title: 'HTML documentation',
            type: 'text/html'
          }
        ],
        conformsTo: [
          'https://api.stacspec.org/v1.0.0-beta.1/core',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#fields',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#query',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#sort',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#context',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
        ]
      };
      const request = createRequest({
        params: {
          providerId: 'USGS_EROS'
        }
      });
      const response = createMockResponse();
      await getProvider(request, response);
      const dat = response.getData();

      dat.json.links = dat.json.links.slice(0, 8);
      response.expect(expectedResponse);
    });
  });

  describe('within /cloudstac', () => {
    beforeEach(() => {
      settings.cmrStacRelativeRootUrl = '/cloudstac';
    });
    afterEach(() => {
      settings.cmrStacRelativeRootUrl = '/stac';
    });
    it('should return a provider json object', async () => {
      const expectedResponse = {
        id: 'GHRC_DAAC',
        title: 'GHRC_DAAC',
        description: 'Root catalog for GHRC_DAAC',
        stac_version: settings.stac.version,
        type: 'Catalog',
        links: [
          {
            rel: 'self',
            href: 'https://example.com/cloudstac/GHRC_DAAC',
            title: 'Provider catalog',
            type: 'application/json'
          },
          {
            rel: 'root',
            href: 'https://example.com/cloudstac/',
            title: 'Root catalog',
            type: 'application/json'
          },
          {
            rel: 'collections',
            href: 'https://example.com/cloudstac/GHRC_DAAC/collections',
            title: 'Provider Collections',
            type: 'application/json'
          },
          {
            rel: 'search',
            href: 'https://example.com/cloudstac/GHRC_DAAC/search',
            title: 'Provider Item Search',
            type: 'application/geo+json',
            method: 'GET'
          },
          {
            rel: 'search',
            href: 'https://example.com/cloudstac/GHRC_DAAC/search',
            title: 'Provider Item Search',
            type: 'application/geo+json',
            method: 'POST'
          },
          {
            rel: 'conformance',
            href: 'https://example.com/cloudstac/GHRC_DAAC/conformance',
            title: 'Conformance Classes',
            type: 'application/geo+json'
          },
          {
            rel: 'service-desc',
            href: 'https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml',
            title: 'OpenAPI Doc',
            type: 'application/vnd.oai.openapi;version=3.0'
          },
          {
            rel: 'service-doc',
            href: 'https://api.stacspec.org/v1.0.0-beta.1/index.html',
            title: 'HTML documentation',
            type: 'text/html'
          }
        ],
        conformsTo: [
          'https://api.stacspec.org/v1.0.0-beta.1/core',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#fields',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#query',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#sort',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#context',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
        ]
      };

      const expectedResponse2 = {
        id: 'GHRC_DAAC',
        title: 'GHRC_DAAC',
        description: 'Root catalog for GHRC_DAAC',
        stac_version: settings.stac.version,
        type: 'Catalog',
        links: [
          {
            rel: 'next',
            href: 'https://example.com?page=2'
          }
        ],
        conformsTo: [
          'https://api.stacspec.org/v1.0.0-beta.1/core',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#fields',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#query',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#sort',
          'https://api.stacspec.org/v1.0.0-beta.1/item-search#context',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30',
          'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson'
        ]
      };
      const request = createRequest({
        params: {
          providerId: 'GHRC_DAAC'
        },
        query: {
          limit: 1
        }
      });
      const response = createMockResponse();
      await getProvider(request, response);
      const dat = response.getData();

      const savedLinks = dat.json.links;
      dat.json.links = dat.json.links.slice(0, 8);
      response.expect(expectedResponse);
      dat.json.links = savedLinks.slice(9, 10);
      response.expect(expectedResponse2);
    });
  });
});
