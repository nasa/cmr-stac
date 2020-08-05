const settings = require('../../lib/settings');
const { mockFunction, revertFunction, createMockResponse, createRequest } = require('../util');
const cmr = require('../../lib/cmr');
const exampleData = require('../example-data');
const {
  getCollections,
  getCollection,
  getGranules,
  getGranule
} = require('../../lib/api/wfs');

describe('wfs routes', () => {
  let request, response;

  beforeEach(() => {
    request = createRequest({
      params: {
        providerId: 'LPDAAC',
        collectionId: '1',
        itemId: '1'
      }
    });
    response = createMockResponse();
    mockFunction(cmr, 'findCollections', Promise.resolve(exampleData.cmrColls));
    mockFunction(cmr, 'getCollection', Promise.resolve(exampleData.cmrColls[0]));
    mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, totalHits: exampleData.cmrGrans.length }));
    mockFunction(cmr, 'findGranulesUmm', Promise.resolve(exampleData.cmrGransUmm));
  });

  afterEach(() => {
    revertFunction(cmr, 'findCollections');
    revertFunction(cmr, 'getCollection');
    revertFunction(cmr, 'findGranules');
    revertFunction(cmr, 'findGranulesUmm');
  });

  describe('getCollections', () => {
    it('should generate a collections response.', async () => {
      await getCollections(request, response);
      response.expect({
        id: 'LPDAAC',
        stac_version: settings.stac.version,
        description: 'All collections provided by LPDAAC',
        links: [
          {
            href: 'http://example.com/cmr-stac/LPDAAC/collections',
            rel: 'self',
            title: 'All collections provided by LPDAAC',
            type: 'application/json'
          },
          {
            href: 'http://example.com/cmr-stac/',
            rel: 'root',
            title: 'CMR-STAC Root',
            type: 'application/json'
          }
        ],
        license: 'not-provided',
        collections: exampleData.stacColls
      });
    });
  });

  describe('getCollection', () => {
    it('should generate a single collections metadata response.', async () => {
      await getCollection(request, response);
      response.expect(exampleData.stacColls[0]);
    });

    describe('when no collection is found', () => {
      beforeEach(() => {
        mockFunction(cmr, 'getCollection', Promise.resolve(null));
      });

      afterEach(() => {
        revertFunction(cmr, 'getCollection');
      });

      it('should render a 404.', async () => {
        await getCollection(request, response);
        expect(response.getData()).toEqual({
          status: 404,
          json: 'Collection [1] not found for provider [LPDAAC]'
        });
      });
    });
  });

  describe('getGranules', () => {
    it('should generate a item collection response.', async () => {
      await getGranules(request, response);
      response.expect({
        type: 'FeatureCollection',
        stac_version: settings.stac.version,
        links: [
          {
            rel: 'self',
            href: 'http://example.com'
          },
          {
            rel: 'root',
            href: 'http://example.com/cmr-stac/'
          }
        ],
        features: exampleData.stacGrans
      });
    });

    it('should generate an item collection response with a prev link.', async () => {
      request.apiGateway.event.queryStringParameters = { page_num: '2' };
      await getGranules(request, response);
      response.expect({
        type: 'FeatureCollection',
        stac_version: settings.stac.version,
        links: [
          {
            rel: 'self',
            href: 'http://example.com?page_num=2'
          },
          {
            rel: 'root',
            href: 'http://example.com/cmr-stac/'
          },
          {
            rel: 'prev',
            href: 'http://example.com?page_num=1'
          }
        ],
        features: exampleData.stacGrans
      });
    });
  });

  describe('getGranule', () => {
    it('should generate an item response.', async () => {
      await getGranule(request, response);
      response.expect(exampleData.stacGrans[0]);
    });
  });
});
