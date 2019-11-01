const axios = require('axios');
const {
  STAC_SEARCH_PARAMS_CONVERSION_MAP,
  STAC_QUERY_PARAMS_CONVERSION_MAP,
  makeCmrSearchUrl,
  cmrSearch,
  findCollections,
  findGranules,
  getCollection,
  convertParams,
  fromEntries
} = require('../../lib/cmr');

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
      expect(makeCmrSearchUrl()).toBe('https://cmr.earthdata.nasa.gov/search');
    });

    it('should create a url with path and no query params', () => {
      expect(makeCmrSearchUrl(path)).toBe('https://cmr.earthdata.nasa.gov/search/path/to/resource');
    });

    it('should create a url with a path and query params', () => {
      expect(makeCmrSearchUrl(path, params)).toBe('https://cmr.earthdata.nasa.gov/search/path/to/resource?param=test');
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
      const error = new Error('Missing path or parameters');
      expect.assertions(1);
      try {
        await cmrSearch();
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should return a cmr collection', async () => {
      cmrSearch('collections.json', { has_granules: true, downloadable: true });
      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
      expect(axios.get.mock.calls[0][1]).toEqual({ headers: { 'Client-Id': 'cmr-stac-api-proxy' }, params: { has_granules: true, downloadable: true } });
    });
  });

  describe('findCollections', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = { data: { feed: { entry: { test: 'value' } } } };
      axios.get.mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return a url with granules and downloadable as true', async () => {
      const result = await findCollections();

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
      expect(axios.get.mock.calls[0][1]).toEqual({ params: { has_granules: true, downloadable: true }, headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
      expect(result).toEqual({ test: 'value' });
    });

    it('should return a url with granues and downloadable as true as well as params', async () => {
      const result = await findCollections(params);

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
      expect(axios.get.mock.calls[0][1]).toEqual({ params: { has_granules: true, downloadable: true, param: 'test' }, headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
      expect(result).toEqual({ test: 'value' });
    });
  });

  describe('findGranules', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = { data: { feed: { entry: { test: 'value' } } } };
      axios.get.mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return a url with /granules.json appended', async () => {
      const result = await findGranules();

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/granules.json');
      expect(result).toEqual({ test: 'value' });
    });

    it('should return a url with /granules.json appended and params', async () => {
      const result = await findGranules(params);

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/granules.json');
      expect(axios.get.mock.calls[0][1]).toEqual({ params: { param: 'test' }, headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
      expect(result).toEqual({ test: 'value' });
    });
  });

  describe('getCollections', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = { data: { feed: { entry: { concept_id: 10 } } } };
      axios.get.mockResolvedValue(cmrResponse);
    });

    it('should return a collection', async () => {
      const conceptId = 10;
      const result = await findCollections({ concept_id: conceptId });

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
      expect(axios.get.mock.calls[0][1]).toEqual({ params: { has_granules: true, downloadable: true, concept_id: 10 }, headers: { 'Client-Id': 'cmr-stac-api-proxy' } });
      expect(result).toEqual({ concept_id: 10 });
    });

    it('should return null if there is no conceptId', async () => {
      const result = await getCollection(10);

      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][0]).toBe('https://cmr.earthdata.nasa.gov/search/collections.json');
      expect(result).toBe(null);
    });
  });

  describe('convertParams', () => {
    it('should create a new set of params based on a conversion Map.', () => {
      const map = { originalKey: ['key', (v) => v.toUpperCase()] };
      const original = { originalKey: 'test' };
      const converted = { key: 'TEST' };
      expect(convertParams(map, original)).toEqual(converted);
    });

    describe('STAC_QUERY_PARAMS_CONVERSION_MAP', () => {
      it('should convert a bounding_box to a bbox.', () => {
        const params = {
          bbox: [10, 10, 10, 10]
        };
        const result = convertParams(STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ bounding_box: '10,10,10,10' });
      });

      it('should convert time into temporal.', () => {
        const params = {
          time: '12:34:00pm'
        };
        const result = convertParams(STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ temporal: '12:34:00pm' });
      });

      it('should convert intersects into polygon.', () => {
        const params = {
          intersects: {
            coordinates: [[10, 10], [10, 0], [0, 10]]
          }
        };
        const result = convertParams(STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ polygon: '10,10' });
      });

      it('should convert page_size to limit.', () => {
        const params = {
          limit: 5
        };
        const result = convertParams(STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ page_size: 5 });
      });

      it('should convert collection_concept_id to collectionId', () => {
        const params = {
          collectionId: 1
        };
        const result = convertParams(STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ collection_concept_id: 1 });
      });
    });

    describe('STAC_QUERY_PARAMS_CONVERSION_MAP', () => {
      it('should convert limit to limit.', function () {
        const params = {
          limit: '10'
        };
        const result = convertParams(STAC_QUERY_PARAMS_CONVERSION_MAP, params);
        expect(result).toEqual({ limit: 10 });
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
      expect(fromEntries([['a', 'd'], ['b', 'e'], ['c', 'f']])).toEqual({ a: 'd', b: 'e', c: 'f' });
    });
  });
});
