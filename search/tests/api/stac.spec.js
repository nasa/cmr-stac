/**
 * @jest-environment node
 */

const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { getSearch, postSearch } = require('../../lib/api/stac');
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
      Promise.resolve({ granules: exampleData.cmrGrans, totalHits: 19 }));

    mockFunction(cmr,
      'findGranulesUmm',
      Promise.resolve({ hits: 0, items: [] }));
  });

  afterEach(() => {
    revertFunction(cmr, 'findGranules');
    revertFunction(cmr, 'findGranulesUmm');
  });

  const expectedResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    numberMatched: 0,
    numberReturned: 0,
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
      }
    ]
  };

  describe('getSearch', () => {
    it('should return a set of items that match a simple query', async () => {
      await getSearch(request, response);
      response.expect(expectedResponse);
    });
  });

  describe('postSearch', () => {
    it('should return a set of items that match a simple query', async () => {
      await postSearch(request, response);
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
    it('should return a range when given a single datetime', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2020-11-01T00:00:00Z' }
      });

      await getSearch(request, response);

      expect(axios.get).toHaveBeenCalledWith(
        'https://cmr.earthdata.nasa.gov/search/granules.json',
        {
          params: {
            provider: 'LPDAAC',
            temporal: '2020-11-01T00:00:00Z,2020-11-01T00:00:00Z'
          },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should return a range when given a range datetime', async () => {
      request = createRequest({
        params: { providerId: 'LPDAAC' },
        query: { datetime: '2019-02-01T00:00:00Z,2019-05-05T00:30:00Z' }
      });

      await getSearch(request, response);

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
  });
});
