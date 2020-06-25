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
    id: 'provA',
    title: 'provAShort',
    stac_version: '1.0.0-beta.1',
    rel: 'provider',
    type: 'application/json',
    links: [
      {
        rel: 'self',
        href: 'http://example.com/cmr-stac/provA',
        title: 'Root endpoint for this provider',
        type: 'application/json'
      },
      {
        rel: 'collections',
        href: 'http://example.com/cmr-stac/provA/collections',
        title: 'Collections for this provider',
        type: 'application/json'
      },
      {
        rel: 'search',
        href: 'http://example.com/cmr-stac/provA/search',
        title: 'STAC Search endpoint for this provider',
        type: 'application/json'
      }
    ]
  },
  {
    id: 'provB',
    title: 'provBShort',
    stac_version: '1.0.0-beta.1',
    rel: 'provider',
    type: 'application/json',
    links: [
      {
        rel: 'self',
        href: 'http://example.com/cmr-stac/provB',
        title: 'Root endpoint for this provider',
        type: 'application/json'
      },
      {
        rel: 'collections',
        href: 'http://example.com/cmr-stac/provB/collections',
        title: 'Collections for this provider',
        type: 'application/json'
      },
      {
        rel: 'search',
        href: 'http://example.com/cmr-stac/provB/search',
        title: 'STAC Search endpoint for this provider',
        type: 'application/json'
      }
    ]
  },
  {
    id: 'provC',
    title: 'provCShort',
    stac_version: '1.0.0-beta.1',
    rel: 'provider',
    type: 'application/json',
    links: [
      {
        rel: 'self',
        href: 'http://example.com/cmr-stac/provC',
        title: 'Root endpoint for this provider',
        type: 'application/json'
      },
      {
        rel: 'collections',
        href: 'http://example.com/cmr-stac/provC/collections',
        title: 'Collections for this provider',
        type: 'application/json'
      },
      {
        rel: 'search',
        href: 'http://example.com/cmr-stac/provC/search',
        title: 'STAC Search endpoint for this provider',
        type: 'application/json'
      }
    ]
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
      id: 'cmr-stac',
      links: expectedProviders
    });
  });
});

describe('getProvider', () => {
  it('should return a provider json object', () => {
    const expectedResponse = {
      id: 'LARC_ASDC',
      title: 'LARC_ASDC',
      stac_version: settings.stac.version,
      rel: 'provider',
      links: [
        {
          rel: 'self',
          href: 'http://example.com/cmr-stac/LARC_ASDC',
          title: 'Root endpoint for this provider',
          type: 'application/json'
        },
        {
          rel: 'collections',
          href: 'http://example.com/cmr-stac/LARC_ASDC/collections',
          title: 'Collections for this provider',
          type: 'application/json'
        },
        {
          rel: 'search',
          href: 'http://example.com/cmr-stac/LARC_ASDC/search',
          title: 'STAC Search endpoint for this provider',
          type: 'application/json'
        }
      ],
      type: 'application/json'
    };
    const request = createRequest({
      params: {
        providerId: 'LARC_ASDC'
      }
    });
    const response = createMockResponse();
    getProvider(request, response);
    response.expect(expectedResponse);
  });
});
