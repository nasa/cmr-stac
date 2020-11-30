/**
 * @jest-environment node
 */

const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { getSearch, postSearch } = require('../../lib/api/stac');
const exampleData = require('../example-data');

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
