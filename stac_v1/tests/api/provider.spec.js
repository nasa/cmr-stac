/**
 * @jest-environment node
 */

const { getProvider , getProviders } = require('../../lib/api/provider');
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
  'PROVA',
  'PROVB',
  'PROVC'
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
    title: 'PROVAShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/PROVA'
  },
  {
    title: 'PROVBShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/PROVB'
  },
  {
    title: 'PROVCShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/stac/PROVC'
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
    title: 'PROVAShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/PROVA'
  },
  {
    title: 'PROVBShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/PROVB'
  },
  {
    title: 'PROVCShort',
    rel: 'child',
    type: 'application/json',
    href: 'https://example.com/cloudstac/PROVC'
  }
];

describe('getProviders', () => {
  describe('within /stac', () => {
    beforeEach(() => {
      mockFunction(cmr, 'getProviders', Promise.resolve(mockProviderResponse));
    });
    afterEach(() => {
      revertFunction(cmr, 'getProviders');
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
      mockFunction(cmr, 'getProviders', Promise.resolve(mockProviderResponse));
    });
    afterEach(() => {
      settings.cmrStacRelativeRootUrl = '/stac';
      revertFunction(cmr, 'getProviders');
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
    const expectedResponse = {
      id: 'PROVA',
      title: 'PROVA',
      description: 'Root catalog for PROVA',
      stac_version: settings.stac.version,
      type: 'Catalog',
      links: [
        {
          rel: 'self',
          href: 'https://example.com/stac/PROVA',
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
          href: 'https://example.com/stac/PROVA/collections',
          title: 'Provider Collections',
          type: 'application/json'
        },
        {
          rel: 'search',
          href: 'https://example.com/stac/PROVA/search',
          title: 'Provider Item Search',
          type: 'application/geo+json',
          method: 'GET'
        },
        {
          rel: 'search',
          href: 'https://example.com/stac/PROVA/search',
          title: 'Provider Item Search',
          type: 'application/geo+json',
          method: 'POST'
        },
        {
          rel: 'conformance',
          href: 'https://example.com/stac/PROVA/conformance',
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

    beforeEach(() => {
      mockFunction(cmr, 'getProviders', Promise.resolve(mockProviderResponse));
      mockFunction(cmr, 'findCollections', Promise.resolve([]));
    });
    afterEach(() => {
      revertFunction(cmr, 'getProviders');
      revertFunction(cmr, 'findCollections');
    });
    it('should return a provider json object', async () => {
      const request = createRequest({
        params: {
          providerId: 'PROVA'
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
    const expectedResponse = {
      id: 'PROVB',
      title: 'PROVB',
      description: 'Root catalog for PROVB',
      stac_version: settings.stac.version,
      type: 'Catalog',
      links: [
        {
          rel: 'self',
          href: 'https://example.com/cloudstac/PROVB',
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
          href: 'https://example.com/cloudstac/PROVB/collections',
          title: 'Provider Collections',
          type: 'application/json'
        },
        {
          rel: 'search',
          href: 'https://example.com/cloudstac/PROVB/search',
          title: 'Provider Item Search',
          type: 'application/geo+json',
          method: 'GET'
        },
        {
          rel: 'search',
          href: 'https://example.com/cloudstac/PROVB/search',
          title: 'Provider Item Search',
          type: 'application/geo+json',
          method: 'POST'
        },
        {
          rel: 'conformance',
          href: 'https://example.com/cloudstac/PROVB/conformance',
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
      id: 'PROVB',
      title: 'PROVB',
      description: 'Root catalog for PROVB',
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

    beforeEach(() => {
      settings.cmrStacRelativeRootUrl = '/cloudstac';
      mockFunction(cmr, 'getProviders', Promise.resolve(mockProviderResponse));
      mockFunction(cmr, 'findCollections', Promise.resolve([expectedResponse2]));
    });
    afterEach(() => {
      settings.cmrStacRelativeRootUrl = '/stac';
      revertFunction(cmr, 'getProviders');
      revertFunction(cmr, 'findCollections');
    });

    it('should return a provider json object', async () => {
      const request = createRequest({
        params: {
          providerId: 'PROVB'
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
