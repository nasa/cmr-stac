const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { search } = require('../../lib/api/stac');
const exampleData = require('../example-data');
const axios = require('axios');
const {
  createRequest,
  createMockResponse
} = require('../util');

afterEach(() => {
  jest.restoreAllMocks();
});

describe('STAC Search', () => {
  let request, response;

  beforeEach(() => {
    request = createRequest({params: { providerId: 'LPDAAC' }});
    response = createMockResponse();

    jest.spyOn(cmr, 'findGranules').mockResolvedValue({ granules: exampleData.cmrGrans, hits: 19 });
    jest.spyOn(cmr, 'fetchConcept').mockImplementation(async (id) => {
      const mockCollection = exampleData.cmrColls.find((coll) => coll.id === id);
      return Promise.resolve(mockCollection);
    });
  });

  const expectedResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    numberMatched: 19,
    numberReturned: 2,
    features: exampleData.stacGrans,
    context: {
      limit: 1000000,
      matched: 19,
      returned: 2
    },
    links: [
      {
        rel: 'self',
        href: 'https://example.com'
      },
      {
        rel: 'root',
        href: 'https://example.com/stac/'
      },
      {
        rel: 'next',
        href: 'https://example.com?page=2',
        method: 'GET'
      }
    ]
  };

  describe('search', () => {
    it('should return a set of items that match a simple query', async () => {
      await search(request, response);
      response.expect(expectedResponse);
    });
  });
});

describe('STAC Search Params', () => {
  let request, response;

  beforeEach(() => {
    response = createMockResponse(200, { feed: { entry: [] } });
    jest.spyOn(cmr, 'fetchConcept').mockImplementation(async (id) => {
      const mockCollection = exampleData.cmrColls.find((coll) => coll.id === id);
      return Promise.resolve(mockCollection);
    });
    jest.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      headers: { 'cmr-hits': '0' },
      data: { feed: { entry: [] } },
      json: (v) => JSON.stringify(v, null, 2)
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('datetime', () => {
    it('should query with range when given a single datetime', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-11-02T00:00:00Z' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: ['2020-11-02T00:00:00Z'] } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-11-02T00:00:00Z,2020-11-03T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('query using a range when given a range datetime, comma delimited', async () => {
      const dt = ['2019-02-01T00:00:00Z,2019-05-05T00:30:00Z'];
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: dt } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('query using a range when given a range datetime, slash delimited', async () => {
      const dt = ['2019-02-01T00:00:00Z/2019-05-05T00:30:00Z'];
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2019-02-01T00:00:00Z/2019-05-05T00:30:00Z' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: dt } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should query with a time given a time', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '12:15:09pm' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: ['12:15:09pm'] } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '12:15:09pm'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should query with range when given a single date', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-10-01' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: ['2020-10-01'] } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-10-01T00:00:00Z,2020-10-02T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should query with range when given a date range, comma delimited', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-09-03,2020-10-26' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: ['2020-09-03,2020-10-26'] } }
        }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-09-03T00:00:00Z,2020-10-26T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should query with range when given a date range, slash delimited', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-09-03/2020-10-26' },
        apiGateway: {
          event: { httpMethod: 'GET', multiValueQueryStringParameters: { datetime: ['2020-09-03/2020-10-26'] } }
        }
      });

      await search(request, response);
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-09-03T00:00:00Z,2020-10-26T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });
  });
});
