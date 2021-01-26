const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { search } = require('../../lib/api/stac');
const exampleData = require('../example-data');
const axios = require('axios');

const {
  mockFunction,
  revertFunction,
  createMockResponse,
  createRequest
} = require('../util');
const { logger } = require('../../lib/util');

const origLogLevel = logger.level;
beforeAll(() => {
  logger.level = 'error';
});

afterAll(() => {
  logger.level = origLogLevel;
});

describe('STAC Search', () => {
  let request, response;

  beforeEach(() => {
    request = createRequest({
      params: { providerId: 'LPDAAC' }
    });
    response = createMockResponse();
    mockFunction(cmr,
      'findGranules',
      Promise.resolve({ granules: exampleData.cmrGrans, hits: 19 }));
  });

  afterEach(() => {
    revertFunction(cmr, 'findGranules');
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
        href: 'http://example.com'
      },
      {
        rel: 'root',
        href: 'http://example.com/stac/'
      },
      {
        rel: 'next',
        href: 'http://example.com?page=2',
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
    axios.get = jest.fn(async () => {
      return Promise.resolve({
        headers: { 'cmr-hits': 0 },
        data: { feed: { entry: [] } },
        json: (v) => JSON.stringify(v, null, 2)
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('datetime', () => {
    it('should query with range when given a single datetime', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-11-02T00:00:00Z' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-11-02T00:00:00Z,2020-11-03T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('query using a range when given a range datetime, comma delimited', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('query using a range when given a range datetime, slash delimited', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2019-02-01T00:00:00Z/2019-05-05T00:30:00Z' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
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
        query: { datetime: '12:15:09pm' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
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
        query: { datetime: '2020-10-01' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
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
        query: { datetime: '2020-09-03,2020-10-26' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
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
        query: { datetime: '2020-09-03/2020-10-26' }
      });

      await search(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
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
