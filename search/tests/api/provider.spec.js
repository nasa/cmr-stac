/**
 * @jest-environment node
 */

const { getProvider, getProviders, getCloudProvider, getCloudProviders } = require('../../lib/api/provider');
const { inspect } = require('../../lib/util');
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

const expectedProviders = [
  {
    title: 'provAShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/stac/provA'
  },
  {
    title: 'provBShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/stac/provB'
  },
  {
    title: 'provCShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/stac/provC'
  }
];

const expectedCloudProviders = [
  {
    title: 'provAShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/cloudstac/provA'
  },
  {
    title: 'provBShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/cloudstac/provB'
  },
  {
    title: 'provCShort',
    rel: 'child',
    type: 'application/json',
    href: 'http://example.com/cloudstac/provC'
  }
];

describe('getProviders', () => {
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
      description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
      title: 'NASA CMR STAC Proxy',
      stac_version: settings.stac.version,
      id: 'stac',
      links: expectedProviders
    });
  });
});

describe('getCloudProviders', () => {
  beforeEach(() => {
    mockFunction(cmr, 'getProviderList', Promise.resolve(mockProviderResponse));
  });
  afterEach(() => {
    revertFunction(cmr, 'getProviderList');
  });

  it('should return an array', async () => {
    const response = createMockResponse();
    await getCloudProviders(createRequest(), response);
    response.expect({
      description: 'This is the landing page for CMR-CLOUDSTAC. Each provider link below contains a CLOUDSTAC endpoint.',
      title: 'NASA CMR CLOUD STAC Proxy',
      stac_version: settings.stac.version,
      id: 'stac',
      links: expectedCloudProviders
    });
  });
});


describe('getProvider', () => {
  it('should return a provider json object', async () => {
    const expectedResponse = {
      id: 'USGS_EROS',
      title: 'USGS_EROS',
      description: 'Root catalog for USGS_EROS',
      stac_version: settings.stac.version,
      links: [
        {
          rel: 'self',
          href: 'http://example.com/stac/USGS_EROS',
          title: 'Provider catalog',
          type: 'application/json'
        },
        {
          rel: 'root',
          href: 'http://example.com/stac/',
          title: 'CMR-STAC Root catalog',
          type: 'application/json'
        },
        {
          rel: 'collections',
          href: 'http://example.com/stac/USGS_EROS/collections',
          title: 'Provider Collections',
          type: 'application/json'
        },
        {
          rel: 'search',
          href: 'http://example.com/stac/USGS_EROS/search',
          title: 'Provider Item Search',
          type: 'application/json'
        }
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

    dat.json.links = dat.json.links.slice(0, 4);
    response.expect(expectedResponse);
  });
});
