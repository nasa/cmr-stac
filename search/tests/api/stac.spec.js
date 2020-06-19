const settings = require('../../lib/settings');
const cmr = require('../../lib/cmr');
const { getSearch, postSearch } = require('../../lib/api/stac');
const exampleData = require('../example-data');

const { mockFunction, revertFunction, logger, createMockResponse } = require('../util');

describe('STAC Search', () => {
  let request, response;

  beforeEach(() => {
    request = {
      apiGateway: {
        event: { headers: { Host: 'example.com' } }
      },
      body: '{}',
      app: { logger: logger },
      params: { providerId: 'LPDAAC' }
    };
    response = createMockResponse();
    mockFunction(cmr, 'findGranules', Promise.resolve(exampleData.cmrGrans));
  });

  afterEach(() => {
    revertFunction(cmr, 'findGranules');
  });

  const expectedResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    features: exampleData.stacGrans,
    links: [
      {
        rel: 'self',
        href: 'http://example.com'
      },
      {
        rel: 'next',
        href: 'http://example.com?page_num=2'
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
