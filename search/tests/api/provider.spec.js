const { getProvider, getProviders } = require('../../lib/api/provider');

describe('getProviders', () => {
  const testEvent = {
    headers: {
      host: 'http://example.com'
    }
  };

  it('should require an event parameter', async () => {
    expect(() => getProviders().resolve()).toThrow();
  });

  it('should return an array', async () => {
    const providerList = await getProviders(testEvent);
    expect(Array.isArray(providerList)).toEqual(true);
  });

  it('should return an array containing at least one object', async () => {
    const providerList = await getProviders(testEvent);
    expect(providerList.length).toBeGreaterThan(0);
    expect(typeof providerList[0]).toBe('object');
  });
});

describe('getProvider', () => {
  const request = {
    params: {
      providerId: 'LARC_ASDC'
    },
    apiGateway: {
      event: {
        headers: {
          host: 'example.com',
          protocol: 'http'
        }
      }
    }
  };

  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };

  it('should return a provider json object', () => {
    const expectedResponse = {
      id: 'LARC_ASDC',
      title: 'LARC_ASDC',
      rel: 'provider',
      description: 'Root endpoint for LARC_ASDC',
      links: [
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

    getProvider(request, response);

    expect(response.json).toHaveBeenCalledWith(expectedResponse);
  });
});
