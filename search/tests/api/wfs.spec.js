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
  getGranules,
  getGranule,
  getCatalog
} = require('../../lib/api/wfs');
const { logger } = require('../../lib/util');

const origLogLevel = logger.level;
beforeAll(() => {
  logger.level = 'error';
});

afterAll(() => {
  logger.level = origLogLevel;
});

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
    mockFunction(cmr, 'convertParams', {});
    mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, hits: exampleData.cmrGrans.length }));
    mockFunction(cmr, 'getGranuleTemporalFacets',
      { years: ['2001', '2002'], months: ['05', '06'], days: ['20', '21'], itemids: ['test1'] });
  });

  afterEach(() => {
    revertFunction(cmr, 'findCollections');
    revertFunction(cmr, 'convertParams');
    revertFunction(cmr, 'findGranules');
    revertFunction(cmr, 'getCatalog');
    revertFunction(cmr, 'getGranuleTemporalFacets');
  });

  describe('getCollections', () => {
    describe('within /stac', () => {
      it('should generate a collections response.', async () => {
        await getCollections(request, response);
        response.expect({
          id: 'LPDAAC',
          stac_version: settings.stac.version,
          description: 'All collections provided by LPDAAC',
          links: [
            {
              href: 'http://example.com/stac/LPDAAC/collections',
              rel: 'self',
              title: 'All collections provided by LPDAAC',
              type: 'application/json'
            },
            {
              href: 'http://example.com/stac/',
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
        settings.cmrStacRelativeRootUrl = "/stac";
      });
   
      it('should generate a collections response.', async () => {
        await getCollections(request, response);
        response.expect({
          id: 'LPDAAC',
          stac_version: settings.stac.version,
          description: 'All cloud holding collections provided by LPDAAC',
          links: [
            {
              href: 'http://example.com/cloudstac/LPDAAC/collections',
              rel: 'self',
              title: 'All cloud holding collections provided by LPDAAC',
              type: 'application/json'
            },
            {
              href: 'http://example.com/cloudstac/',
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
          mockFunction(cmr, 'findCollections', Promise.resolve(null));
        });

        afterEach(() => {
          revertFunction(cmr, 'findCollections');
        });

        it('should render a 404.', async () => {
          await getCollection(request, response);
          expect(response.getData()).toEqual({
            status: 404,
            json: 'Collection [1.v1] not found for provider [LPDAAC]'
          });
        });
      });
    });

    describe('within /cloudstac', () => {
      beforeEach(() => {
        settings.cmrStacRelativeRootUrl = '/cloudstac';
      });
      afterEach(() => {
        settings.cmrStacRelativeRootUrl = "/stac";
      });
      it('should generate a single collections metadata response.', async () => {
        await getCollection(request, response);
        response.expect(exampleData.cloudstacColls[0]);
      });
    
      describe('when no collection is found', () => {
        beforeEach(() => {
          mockFunction(cmr, 'findCollections', Promise.resolve(null));
        });
      
        afterEach(() => {
          revertFunction(cmr, 'findCollections');
        });
      
        it('should render a 404.', async () => {
          await getCollection(request, response);
          expect(response.getData()).toEqual({
            status: 404,
            json: 'Cloud holding collection [1.v1] not found for provider [LPDAAC]'
          });
        });
      });
    });
  }); 

  describe('getGranules', () => {
    describe('within /stac', () => {
      it('should generate a item collection response.', async () => {
	request.apiGateway.event.httpMethod = 'GET';
	await getGranules(request, response);
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
	      href: 'http://example.com'
	    },
	    {
	      rel: 'root',
	      href: 'http://example.com/stac/'
	    }
	  ],
	  features: exampleData.stacGrans
	});
      });

      it('should generate a item collection response with a next link.', async () => {
	request.apiGateway.event.httpMethod = 'GET';
	request.query.limit = 2;
	mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, hits: 10 }));
	await getGranules(request, response);
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
	      href: 'http://example.com'
	    },
	    {
	      rel: 'root',
	      href: 'http://example.com/stac/'
	    },
	    {
	      rel: 'next',
	      href: 'http://example.com?limit=2&collections=1.v1&page=2',
	      method: 'GET'
	    }
	  ],
	  features: exampleData.stacGrans
	});
      });

      it('should generate an item collection response with a prev link.', async () => {
	request.apiGateway.event.queryStringParameters = { page: 2 };
	request.query.page = 2;
	await getGranules(request, response);
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
	      href: 'http://example.com?page=2'
	    },
	    {
	      rel: 'root',
	      href: 'http://example.com/stac/'
	    },
	    {
	      rel: 'prev',
	      method: 'GET',
	      href: 'http://example.com?page=1&collections=1.v1'
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
        settings.cmrStacRelativeRootUrl = "/stac";
      });  
      it('should generate a item collection response.', async () => {
        request.apiGateway.event.httpMethod = 'GET';
        await getGranules(request, response);
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
              href: 'http://example.com'
            },    
            {     
              rel: 'root',
              href: 'http://example.com/cloudstac/'
            }     
          ],    
          features: exampleData.cloudstacGrans
        });   
      });   

      it('should generate a item collection response with a next link.', async () => {
        request.apiGateway.event.httpMethod = 'GET';
        request.query.limit = 2;
        mockFunction(cmr, 'findGranules', Promise.resolve({ granules: exampleData.cmrGrans, hits: 10 }));
        await getGranules(request, response);
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
              href: 'http://example.com'
            },    
            {     
              rel: 'root',
              href: 'http://example.com/cloudstac/'
            },    
            {     
              rel: 'next',
              href: 'http://example.com?limit=2&collections=1.v1&page=2',
              method: 'GET'
            }     
          ],    
          features: exampleData.cloudstacGrans
        });   
      });   

      it('should generate an item collection response with a prev link.', async () => {
        request.apiGateway.event.queryStringParameters = { page: 2 };
        request.query.page = 2;
        await getGranules(request, response);
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
              href: 'http://example.com?page=2'
            },    
            {     
              rel: 'root',
              href: 'http://example.com/cloudstac/'
            },    
            {     
              rel: 'prev',
              method: 'GET',
              href: 'http://example.com?page=1&collections=1.v1'
            }     
          ],    
          features: exampleData.cloudstacGrans
        });   
      });   
    });
  });

    

  describe('getGranule', () => {
    it('should generate an item response.', async () => {
      await getGranule(request, response);
      response.expect(exampleData.stacGrans[0]);
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
