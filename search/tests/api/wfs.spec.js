const settings = require('../../lib/settings');
const {
  mockFunction,
  revertFunction,
  createMockResponse,
  createRequest } = require('../util');
const cmr = require('../../lib/cmr');
const exampleData = require('../example-data');
const {
  getCollections,
  getCollection,
  getItems,
  getItem,
  getCatalog
} = require('../../lib/api/wfs');
const { errors } = require('../../lib/util');

describe('wfs routes', () => {
  let request, response;

  beforeEach(() => {
    request = createRequest({
      params: {
        providerId: 'LPDAAC',
        collectionId: '1.v1',
        itemId: '1'
      }
    });
    response = createMockResponse();
    mockFunction(cmr, 'findCollections', Promise.resolve(exampleData.cmrColls));
    mockFunction(cmr, 'convertParams', Promise.resolve({ collection_concept_id: '111' }));
    jest.spyOn(cmr, 'fetchConcept').mockImplementation((id) => {
      const coll = exampleData.cmrColls.find(coll => coll.id === id);
      return Promise.resolve(coll);
    });

    mockFunction(cmr, 'findGranules', Promise.resolve({
      granules: exampleData.cmrGrans,
      hits: exampleData.cmrGrans.length
    }));
    mockFunction(cmr, 'getGranuleTemporalFacets',
      { years: ['2001', '2002'], months: ['05', '06'], days: ['20', '21'], itemids: ['test1'] });
    mockFunction(cmr, 'stacIdToCmrCollectionId', Promise.resolve('C1234_LPDAAC'));
  });

  afterEach(() => {
    revertFunction(cmr, 'findCollections');
    revertFunction(cmr, 'convertParams');
    revertFunction(cmr, 'findGranules');
    revertFunction(cmr, 'fetchConcept');
    revertFunction(cmr, 'getGranuleTemporalFacets');
    revertFunction(cmr, 'stacIdToCmrCollectionId');
  });

  describe('getCollections', () => {
    describe('within /stac', () => {
      it('should generate a collections response.', async () => {
        await getCollections(request, response);
        response.expect({
          id: 'LPDAAC',
          stac_version: settings.stac.version,
          description: 'All collections provided by LPDAAC',
          type: 'Catalog',
          links: [
            {
              href: 'https://example.com/stac/LPDAAC/collections',
              rel: 'self',
              title: 'All collections provided by LPDAAC',
              type: 'application/json'
            },
            {
              href: 'https://example.com/stac/',
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

    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = '/stac';
      });

      it('should generate a collections response.', async () => {
        await getCollections(request, response);
        response.expect({
          id: 'LPDAAC',
          stac_version: settings.stac.version,
          type: 'Catalog',
          description: 'All cloud holding collections provided by LPDAAC',
          links: [
            {
              href: 'https://example.com/cloudstac/LPDAAC/collections',
              rel: 'self',
              title: 'All cloud holding collections provided by LPDAAC',
              type: 'application/json'
            },
            {
              href: 'https://example.com/cloudstac/',
              rel: 'root',
              title: 'CMR-CLOUDSTAC Root',
              type: 'application/json'
            }
          ],
          license: 'not-provided',
          collections: exampleData.cloudstacColls
        });
      });
    });
  });

  describe('getCollection', () => {
    describe('within /stac', () => {
      it('should generate a single collections metadata response.', async () => {
        await getCollection(request, response);
        response.expect(exampleData.stacColls[0]);
      });

      describe('when no collection is found', () => {
        beforeEach(() => {
          mockFunction(cmr, 'findCollections', Promise.resolve([]));
        });

        afterEach(() => {
          revertFunction(cmr, 'findCollections');
        });

        it('should throw a NotFound.', async () => {
          try {
            await getCollection(request, response);
          } catch (err) {
            expect(err).toBeInstanceOf(errors.NotFound);

          }
        });
      });
    });

    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = '/stac';
      });
      it('should generate a single collections metadata response.', async () => {
        await getCollection(request, response);
        response.expect(exampleData.cloudstacColls[0]);
      });

      describe('when no collection is found', () => {
        beforeEach(() => {
          mockFunction(cmr, 'findCollections', Promise.resolve([]));
        });

        afterEach(() => {
          revertFunction(cmr, 'findCollections');
        });

        it('should throw a NotFound.', async () => {
          try {
            await getCollection(request, response);
          } catch (err) {
            expect(err).toBeInstanceOf(errors.NotFound);
          }
        });
      });
    });
  });

  describe('getItems', () => {
    describe('within /stac', () => {
      it('should generate an item collection response.', async () => {
        request.apiGateway.event.httpMethod = 'GET';
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 2,
          numberReturned: 2,
          context: {
            limit: 1000000,
            matched: 2,
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
            }
          ],
          features: exampleData.stacGrans
        });
      });

      it('should generate an item collection response with a next link.', async () => {
        request.apiGateway.event.multiValueQueryStringParameters = { limit: [2] };
        request.apiGateway.event.httpMethod = 'GET';
        request.apiGateway.event.queryStringParameters = { limit: 2 };
        request.query.limit = 2;
        mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, hits: 10 }));
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 10,
          numberReturned: 2,
          context: {
            limit: 2,
            matched: 10,
            returned: 2
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com?limit=2'
            },
            {
              rel: 'root',
              href: 'https://example.com/stac/'
            },
            {
              rel: 'next',
              href: 'https://example.com?limit=2&page=2',
              method: 'GET'
            }
          ],
          features: exampleData.stacGrans
        });
      });

      it('should generate an item collection response with a prev link.', async () => {
        request.apiGateway.event.queryStringParameters = { page: 2 };
        request.query.page = 2;
        request.apiGateway.event.multiValueQueryStringParameters = { page: [2] };
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 2,
          numberReturned: 2,
          context: {
            limit: 1000000,
            matched: 2,
            returned: 2
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com?page=2'
            },
            {
              rel: 'root',
              href: 'https://example.com/stac/'
            },
            {
              rel: 'prev',
              method: 'GET',
              href: 'https://example.com?page=1'
            }
          ],
          features: exampleData.stacGrans
        });
      });
    });

    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = '/stac';
      });
      it('should generate an item collection response.', async () => {
        request.apiGateway.event.httpMethod = 'GET';
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 2,
          numberReturned: 2,
          context: {
            limit: 1000000,
            matched: 2,
            returned: 2
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com'
            },
            {
              rel: 'root',
              href: 'https://example.com/cloudstac/'
            }
          ],
          features: exampleData.cloudstacGrans
        });
      });

      it('should generate an item collection response with a next link.', async () => {
        request.apiGateway.event.multiValueQueryStringParameters = { limit: [2] };
        request.apiGateway.event.httpMethod = 'GET';
        request.apiGateway.event.queryStringParameters = { limit: 2 };
        request.query.limit = 2;
        mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, hits: 10 }));
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 10,
          numberReturned: 2,
          context: {
            limit: 2,
            matched: 10,
            returned: 2
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com?limit=2'
            },
            {
              rel: 'root',
              href: 'https://example.com/cloudstac/'
            },
            {
              rel: 'next',
              href: 'https://example.com?limit=2&page=2',
              method: 'GET'
            }
          ],
          features: exampleData.cloudstacGrans
        });
      });

      it('should generate an item collection response with a prev link.', async () => {
        request.apiGateway.event.queryStringParameters = { page: 2 };
        request.query.page = 2;
        request.apiGateway.event.multiValueQueryStringParameters = { page: [2] };
        await getItems(request, response);
        response.expect({
          type: 'FeatureCollection',
          stac_version: settings.stac.version,
          numberMatched: 2,
          numberReturned: 2,
          context: {
            limit: 1000000,
            matched: 2,
            returned: 2
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com?page=2'
            },
            {
              rel: 'root',
              href: 'https://example.com/cloudstac/'
            },
            {
              rel: 'prev',
              method: 'GET',
              href: 'https://example.com?page=1'
            }
          ],
          features: exampleData.cloudstacGrans
        });
      });
    });
  });

  describe('getItem', () => {
    describe('within /stac', () => {
      it('should generate an item response.', async () => {
        await getItem(request, response);
        response.expect(exampleData.stacGrans[0]);
      });
    });
    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = '/stac';
      });
      it('should generate an item response.', async () => {
        await getItem(request, response);
        response.expect(exampleData.cloudstacGrans[0]);
      });
    });
  });

  describe('getCatalog', () => {
    beforeEach(() => {
      process.env.BROWSE_PATH = 'year/month/day';
      request.apiGateway = { event: { headers: { Host: 'example.com' }, queryStringParameters: [] } };
      mockFunction(cmr, 'convertParams', {});
    });

    afterEach(() => {
      revertFunction(cmr, 'convertParams');
    });

    describe('within /stac', () => {
      it('should return Months catalog given a year catalog', async () => {
        request.params['0'] = '2001';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(5);
        expect(cat.id).toEqual('1.v1-2001');
      });

      it('should return Days catalog given a Month catalog', async () => {
        request.params['0'] = '2001/05';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001/05';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(5);
        expect(cat.id).toEqual('1.v1-2001-05');
      });

      it('should return Item catalog given a Day catalog', async () => {
        request.params['0'] = '2001/05/20';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001/05/20';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(4);
        expect(cat.id).toEqual('1.v1-2001-05-20');
      });
    });

    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = '/stac';
      });
      it('should return Months catalog given a year catalog', async () => {
        request.params['0'] = '2001';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(5);
        expect(cat.id).toEqual('1.v1-2001');
      });

      it('should return Days catalog given a Month catalog', async () => {
        request.params['0'] = '2001/05';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001/05';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(5);
        expect(cat.id).toEqual('1.v1-2001-05');
      });

      it('should return Item catalog given a Day catalog', async () => {
        request.params['0'] = '2001/05/20';
        // request.apiGateway = {event: { path: '/2001', headers: { Host: 'example.com' }, queryStringParameters: [] }}
        request.apiGateway.event.path = '/2001/05/20';
        await getCatalog(request, response);
        const cat = response.getData().json;
        expect(cat.links.length).toEqual(4);
        expect(cat.id).toEqual('1.v1-2001-05-20');
      });
    });
  });
});
