const axios = require('axios');
const {
  makeCmrSearchUrl,
  cmrSearch,
  findCollections,
  findGranules,
  convertParams,
  fromEntries,
  getFacetParams,
  getGranuleTemporalFacets
} = require('../../lib/cmr');
const { logger } = require('../../lib/util');

const origLogLevel = logger.level;
beforeAll(() => {
  logger.level = 'error';
});

afterAll(() => {
  logger.level = origLogLevel;
});

describe('cmr', () => {
  let path, params;

  beforeEach(() => {
    path = 'path/to/resource';
    params = { param: 'test' };
  });

  describe('makeCmrSearchUrl', () => {
    it('should exist', () => {
      expect(makeCmrSearchUrl).toBeDefined();
    });
    it('should create a url with zero params.', () => {
      expect(makeCmrSearchUrl())
        .toBe('https://cmr.earthdata.nasa.gov/search');
    });

    it('should create a url with path and no query params', () => {
      expect(makeCmrSearchUrl(path))
        .toBe('https://cmr.earthdata.nasa.gov/search/path/to/resource');
    });

    it('should create a url with a path and query params', () => {
      expect(makeCmrSearchUrl(path, params))
        .toBe('https://cmr.earthdata.nasa.gov/search/path/to/resource?param=test');
    });
  });

  describe('cmrSearch', () => {
    beforeEach(() => {
      axios.get = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should exist', () => {
      expect(cmrSearch).toBeDefined();
    });

    it('should take in a url and a params object', async () => {
      const error = new Error('Missing url or parameters');
      expect.assertions(1);
      try {
        await cmrSearch();
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should return a cmr collection', async () => {
      cmrSearch('https://example.com', { });
      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://example.com');
      expect(axios.get.mock.calls[0][1]).toEqual({ headers: { 'Client-Id': 'cmr-stac-api-proxy' }, params: { } });
    });
  });

  describe('findCollections', () => {
    describe('when there are results', () => {
      beforeEach(() => {
        axios.get = jest.fn();
        const cmrResponse = { data: { feed: { entry: [{ concept_id: 10, test: 'value' }] } } };
        axios.get.mockResolvedValue(cmrResponse);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return a collection', async () => {
        const result = await findCollections({ concept_id: 10, provider_id: 'some-provider' });
        expect(axios.get.mock.calls.length).toBe(1);
        expect(result[0]).toEqual({ concept_id: 10, test: 'value' });
      });

      it('should include the concept_id and provider_id in the query', async () => {
        await findCollections({ concept_id: 10, provider_id: 'some-provider' });
        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({ params: { concept_id: 10, provider_id: 'some-provider' },
            headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
      });

      it('should return a url with granules and downloadable as true', async () => {
        const result = await findCollections();

        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({ params: { },
            headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
        expect(result[0]).toEqual({ concept_id: 10, test: 'value' });
      });

      it('should return a url with granues and downloadable as true as well as params', async () => {
        const result = await findCollections(params);

        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({ params: { param: 'test' },
            headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
        expect(result[0]).toEqual({ concept_id: 10, test: 'value' });
      });
    });

    describe('when there are NO results', () => {
      beforeEach(() => {
        axios.get = jest.fn();
        const cmrResponse = { data: { feed: { entry: [] } } };
        axios.get.mockResolvedValue(cmrResponse);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return empty features', async () => {
        const result = await findCollections({ concept_id: 10, provider_id: 'some-provider' });
        expect(axios.get.mock.calls.length).toBe(1);
        expect(result).toEqual(([]));
      });
    });
  });

  describe('findGranules', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = { headers: { 'cmr-hits': 199 },
        data: { feed: { entry: [{ test: 'value' }] } } };
      axios.get.mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('makes a request to /granules.json', async () => {
      await findGranules();

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('https://cmr.earthdata.nasa.gov/search/granules.json');
    });

    it('makes a request with the supplied params', async () => {
      await findGranules(params);

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][1])
        .toEqual({ params: { param: 'test' },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
    });

    it('returns an object with the returned granules', async () => {
      const result = await findGranules();

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('https://cmr.earthdata.nasa.gov/search/granules.json');
      expect(result).toEqual(expect.objectContaining({ granules: [{ test: 'value' }] }));
    });

    it('returns hits from the CMR response header "cmr-hits"', async () => {
      const result = await findGranules(params);

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('https://cmr.earthdata.nasa.gov/search/granules.json');
      expect(axios.get.mock.calls[1][0])
        .toBe('https://cmr.earthdata.nasa.gov/search/granules.umm_json');
      expect(result).toEqual(expect.objectContaining({ hits: 199 }));
    });
  });

  describe('convertParams', () => {
    describe('STAC_SEARCH_PARAMS_CONVERSION_MAP', () => {
      it('should convert a bbox to bounding_box.', async () => {
        const params = {
          bbox: [10, 10, 10, 10]
        };
        const result = await convertParams(params);
        expect(result).toEqual({ bounding_box: [10, 10, 10, 10] });
      });

      it('should convert time into temporal.', async () => {
        const params = {
          datetime: '12:34:00pm'
        };
        const result = await convertParams(params);
        expect(result).toEqual({ temporal: '12:34:00pm' });
      });

      it('should convert intersects into polygon.', async () => {
        const params = {
          intersects: {
            coordinates: [[10, 10], [10, 0], [0, 10]]
          }
        };
        const result = await convertParams(params);
        expect(result).toEqual({ polygon: '10,10' });
      });

      it('should convert page_size to limit.', async () => {
        const params = {
          limit: 5
        };
        const result = await convertParams(params);
        expect(result).toEqual({ page_size: 5 });
      });

      it('should convert collection_concept_id to collections', async () => {
        const params = {
          collections: [1]
        };
        const result = await convertParams(params);
        expect(result).toEqual({ collection_concept_id: [1] });
      });
    });
  });

  describe('facets', () => {
    const cmrParams = {
      collection_concept_id: 'C1379757686-USGS_EROS',
      provider: 'USGS_EROS'
    };

    describe('getFacetParams', () => {
      it('should have 2 params', () => {
        const params = getFacetParams();
        expect(Object.keys(params).length).toEqual(2);
        expect(params.page_size).toEqual(0);
        expect(params.include_facets).toEqual('v2');
      });
      it('should respect year arg', () => {
        const params = getFacetParams('2000');
        expect(params['temporal_facet[0][year]']).toEqual('2000');
      });
      it('should respect month arg', () => {
        const params = getFacetParams('2000', '05');
        expect(params['temporal_facet[0][year]']).toEqual('2000');
        expect(params['temporal_facet[0][month]']).toEqual('05');
      });
      it('should respect day arg', () => {
        const params = getFacetParams('2000', '05', '20');
        expect(params['temporal_facet[0][year]']).toEqual('2000');
        expect(params['temporal_facet[0][month]']).toEqual('05');
        expect(params['temporal_facet[0][day]']).toEqual('20');
      });
    });

    describe('getGranuleTemporalFacets', () => {
      beforeEach(() => {
        axios.get = jest.fn();
        const resp = { data: { feed: { facets: { has_children: true,
          children: [{
            title: 'Temporal',
            children: [{
              title: 'Year',
              children: [
                {
                  title: '2001',
                  children: [{
                    title: 'Month',
                    children: [
                      {
                        title: '05',
                        children: [{
                          title: 'Day',
                          children: [{ title: '20' }, { title: '22' }, { title: '23' }]
                        }]
                      },
                      { title: '06' }
                    ]
                  }]
                },
                { title: '2002' }
              ]
            }]
          }] } } } };
        axios.get.mockResolvedValue(resp);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return year facets', async () => {
        const facets = await getGranuleTemporalFacets(cmrParams);
        expect(Object.keys(facets['years']).length).toEqual(2);
      });
      it('should return month facets', async () => {
        const facets = await getGranuleTemporalFacets(cmrParams, '2001');
        expect(Object.keys(facets['months']).length).toEqual(2);
      });
      it('should return day facets', async () => {
        const facets = await getGranuleTemporalFacets(cmrParams, '2001', '05');
        expect(Object.keys(facets['days']).length).toEqual(3);
      });
    });
  });

  describe('fromEntries', () => {
    it('should exist', () => {
      expect(fromEntries).toBeDefined();
    });

    it('should accept a parameter', () => {
      expect(() => fromEntries()).toThrow();
    });

    it('should return an object made of entries', () => {
      expect(fromEntries([['a', 'd'], ['b', 'e'], ['c', 'f']]))
        .toEqual({ a: 'd', b: 'e', c: 'f' });
    });
  });
});
