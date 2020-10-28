/**
 * @jest-environment node
 */

const { getProvider, getProviders } = require('../../lib/api/provider');
const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { mockFunction, revertFunction, createMockResponse, createRequest } = require('../util');

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

describe('getProviders', () => {
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
      description: 'This is the landing page for CMR-STAC. Each provider link below contains a STAC endpoint.',
      title: 'NASA CMR STAC Proxy',
      stac_version: settings.stac.version,
      id: 'stac',
      links: expectedProviders
    });
  });
});

describe('getProvider', () => {
  it('should return a provider json object', async () => {
    const expectedResponse = {
      id: 'LARC_ASDC',
      title: 'LARC_ASDC',
      description: 'Root catalog for LARC_ASDC',
      stac_version: settings.stac.version,
      links: [
        {
          rel: 'self',
          href: 'http://example.com/stac/LARC_ASDC',
          title: 'Root endpoint for this provider',
          type: 'application/json'
        },
        {
          rel: 'root',
          href: 'http://example.com/stac/',
          title: 'CMR-STAC Root',
          type: 'application/json'
        },
        {
          rel: 'collections',
          href: 'http://example.com/stac/LARC_ASDC/collections',
          title: 'Collections for this provider',
          type: 'application/json'
        },
        {
          rel: 'search',
          href: 'http://example.com/stac/LARC_ASDC/search',
          title: 'STAC Search endpoint for this provider',
          type: 'application/json'
        }
      ]
    };
    const request = createRequest({
      params: {
        providerId: 'LARC_ASDC'
      }
    });
    const response = createMockResponse();
    await getProvider(request, response);
    response.expect(expectedResponse);
  });
});
