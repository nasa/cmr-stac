/**
 * @jest-environment node
 */

const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { getSearch, postSearch } = require('../../lib/api/stac');
const exampleData = require('../example-data');

const { mockFunction, revertFunction, createMockResponse, createRequest } = require('../util');

describe('STAC Search', () => {
  let request, response;

  beforeEach(() => {
    request = createRequest({
      body: '{}',
      params: { providerId: 'LPDAAC' }
    });
    response = createMockResponse();
    mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, totalHits: 19 }));
  });

  afterEach(() => {
    revertFunction(cmr, 'findGranules');
  });

  const expectedResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    features: exampleData.stacGrans,
    context: {
      limit: null,
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
        href: 'http://example.com/cmr-stac/'
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
