const axios = require('axios');
const exampleData = require('../example-data');
const settings = require('../../lib/settings.js');
const {
  cmrSearch,
  cmrSearchPost,
  findCollections,
  findGranules,
  fetchConcept,
  convertParams,
  getFacetParams,
  getGranuleTemporalFacets
} = require('../../lib/cmr');
const { errors } = require('../../lib/util');

const { tables, scanTable, clearTable } = require('../../lib/cache');

describe('cmrSearch', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when not provided with a url', async () => {
    const error = new Error('Missing url');
    try {
      await cmrSearch();
    } catch (err) {
      expect(err).toEqual(error);
    }
  });

  describe('formats a query for CMR', () => {
    it('uses GET queries', async () => {
      jest.spyOn(axios, 'get')
        .mockResolvedValue({
          status: 200,
          headers: { 'cmr-search-after': '[A, B, C]' },
          data: { hits: 0, feed: { entry: [] } }
        });

      await cmrSearch('/collections.json', { 'page_num': 5 });
      expect(axios.get).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('handling different responses from CMR', () => {
    const successCodes = [200, 201, 209];
    successCodes.forEach((statusCode) => {
      it(`should handle success code ${statusCode} response`, async () => {
        jest.spyOn(axios, 'get').mockResolvedValue({ status: statusCode, headers: {}, data: {} });

        const response = await cmrSearch('/collections.json', {});
        expect(response).toEqual({ status: statusCode, headers: {}, data: {} });
        jest.restoreAllMocks();
      });
    });

    const errorCodes = [400, 401, 403, 500, 501];
    errorCodes.forEach((statusCode) => {
      it(`should handle error code ${statusCode} response`, async () => {
        jest.spyOn(axios, 'get').mockResolvedValue({ status: statusCode, headers: {}, data: {} });
        try {
          await cmrSearch('/collections.json', {});
        } catch (err) {
          expect(err).toBeInstanceOf(errors.HttpError);
        }
        jest.restoreAllMocks();
      });
    });
  });
});

describe('cmrSearchPost', () => {
  it('should throw when not provided with a url', async () => {
    const error = new Error('Missing url');
    try {
      await cmrSearchPost();
    } catch (err) {
      expect(err).toEqual(error);
    }
  });

  describe('formats a query for CMR', () => {
    it('uses POST queries', async () => {
      jest.spyOn(axios, 'post')
        .mockResolvedValue({
          status: 200,
          headers: {},
          data: { hits: 0, feed: { entry: [] } }
        });

      await cmrSearchPost('/collections.json', { 'page_num': 5 });
      expect(axios.post).toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe('handling different error responses from CMR', () => {
    const statusCodes = [400, 401, 500, 503];

    statusCodes.forEach((statusCode) => {
      it(`should handle a ${statusCode} response`, async () => {
        jest.spyOn(axios, 'post')
          .mockResolvedValue({
            status: statusCode,
            headers: {'cmr-hits': '0'},
            data: { hits: 0, errors: ['an error'] }
          });

        try {
          await cmrSearchPost('/collections.json', {});
        } catch (err) {
          expect(err).toBeDefined();
        }
      });
    });
  });
});

describe('findCollections', () => {
  describe('when there are results', () => {
    beforeEach(() => {
      const cmrResponse = {
        headers: { 'cmr-hits': 1, 'cmr-search-after': '["d", "e", "f"]' },
        data: { feed: { entry: [{ concept_id: "C000000001-STAC_PROV", test: 'value' }] } }
      };

      jest.spyOn(axios, 'get').mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return a list of collection', async () => {
      const result = await findCollections({
        concept_id: "C000000001-STAC_PROV",
        provider_id: 'STAC_PROV'
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
    });

    it('should include the concept_id and provider_id in the query', async () => {
      await findCollections({ concept_id: "C000000001-STAC_PROV", provider_id: 'STAC_PROV' });
      expect(axios.get.mock.calls[0][1])
        .toEqual({
          params: { concept_id: "C000000001-STAC_PROV", provider_id: 'STAC_PROV' },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('should return a url with granules and downloadable as true', async () => {
      const result = await findCollections();
      expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
    });

    it('should return a url with granules and downloadable as true as well as params', async () => {
      const result = await findCollections({});
      expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
    });
  });

  describe('when there are NO results', () => {
    beforeEach(() => {
      const cmrResponse = {
        headers: { 'cmr-hits': 0, 'cmr-search-after': '["h", "i", "j"]' },
        data: { feed: { entry: [] } }
      };
      jest.spyOn(axios, 'get').mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return empty features', async () => {
      const result = await findCollections({
        concept_id: "C000000001-STAC_PROV",
        provider_id: 'STAC_PROV'
      });
      expect(axios.get.mock.calls.length).toBe(1);
      expect(result).toEqual([]);
    });
  });
});

describe('findGranules', () => {
  describe('on a successful request', () => {
    beforeEach(() => {
      const cmrJsonResponse = {
        status: 200,
        headers: { 'cmr-hits': 199, 'cmr-search-after': ''["x", "y", "z"] },
        data: { feed: { entry: [{ id: "a", test: 'json' }] } }
      };

      const cmrUmmResponse = {
        status: 200,
        headers: { 'cmr-hits': 199, 'cmr-search-after': ''["x", "y", "z"] },
        data: {
          items: [{
            meta: { "concept-id": "a" },
            umm: { "SpatialExtent": {} }
          }]
        }
      };

      jest.spyOn(axios, 'get')
        .mockImplementationOnce(() => Promise.resolve(cmrJsonResponse))
        .mockImplementationOnce(() => Promise.resolve(cmrUmmResponse));
    });

    it('returns an object containing an array of granules and number hits', async () => {
      const result = await findGranules();

      expect(result).toHaveProperty('hits');
      expect(result).toHaveProperty('granules');
      expect(result.granules).toHaveLength(1);

      expect(result).toEqual({
        hits: 199,
        granules: [{ id: "a", test: "json", umm: { "SpatialExtent": {} } }]
      });
    });
  });

  it('should throw on a 500 response', async () => {
    const cmrResponse = {
      status: 500,
      headers: {},
      data: { errors: ['a problem occurred upstream'] }
    };

    jest.spyOn(axios, 'get').mockResolvedValue(cmrResponse);

    try {
      await findGranules();
    } catch (err) {
      expect(err.message).toContain('A problem occurred with a GET search to CMR');
    }
  });
});

describe('convertParams', () => {
  describe('STAC_SEARCH_PARAMS_CONVERSION_MAP', () => {
    it('should convert a bbox to bounding_box.', async () => {
      const params = {
        bbox: [10, 10, 10, 10]
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        bounding_box: '10,10,10,10'
      });
    });

    it('should convert time into temporal.', async () => {
      const params = {
        datetime: '12:34:00pm'
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        temporal: '12:34:00pm'
      });
    });

    it('should convert GeoJSON Polygon', async () => {
      const params = {
        intersects: {
          type: 'Polygon',
          coordinates: [
            [[10, 10], [10, 0], [0, 10], [10, 10]]
          ]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        polygon: '10,10,10,0,0,10,10,10'
      });
    });

    it('should convert GeoJSON Point', async () => {
      const params = {
        intersects: {
          type: 'Point',
          coordinates: [10, 10]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({ provider: 'provider', point: '10,10' });
    });

    it('should convert GeoJSON LineString', async () => {
      const params = {
        intersects: {
          type: 'LineString',
          coordinates: [
            [10, 10],
            [10, 0],
            [0, 10]
          ]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        line: '10,10,10,0,0,10'
      });
    });

    it('should convert GeoJSON MultiPolygon', async () => {
      const params = {
        intersects: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [[10, 10], [10, 0], [0, 10], [10, 10]]
            ],
            [
              [[20, 20], [20, 10], [10, 20], [20, 20]]
            ]
          ]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        polygon: ['10,10,10,0,0,10,10,10', '20,20,20,10,10,20,20,20'],
        'options[polygon][or]': 'true'
      });
    });

    it('should convert GeoJSON MultiPoint', async () => {
      const params = {
        intersects: {
          type: 'MultiPoint',
          coordinates: [
            [10, 10],
            [20, 20]
          ]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        point: ['10,10', '20,20'],
        'options[point][or]': 'true'
      });
    });

    it('should convert GeoJSON MultiLineString', async () => {
      const params = {
        intersects: {
          type: 'MultiLineString',
          coordinates: [
            [[10, 10], [10, 0], [0, 10]],
            [[20, 20], [20, 10], [10, 20]]
          ]
        }
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        line: ['10,10,10,0,0,10', '20,20,20,10,10,20'],
        'options[line][or]': 'true'
      });
    });

    it('should convert limit to page_size.', async () => {
      const params = {
        limit: 5
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({ provider: 'provider', page_size: 5 });
    });

    it('should convert collections into collection_concept_id', async () => {

      const cmrResponse = {
        headers: { 'cmr-hits': 0, 'cmr-search-after': '["t", "u", "v"]' },
        data: { feed: { entry: [{ id: "C00000000001-STAC_PROV" }] } }
      };
      jest.spyOn(axios, 'get').mockResolvedValue(cmrResponse);

      const params = {
        collections: ['name.v0']
      };
      const result = await convertParams('provider', params);
      expect(result).toEqual({
        provider: 'provider',
        collection_concept_id: ["C00000000001-STAC_PROV"]
      });
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

      const resp = {
        headers: { 'cmr-hits': 0, 'cmr-search-after': '["j", "k", "l"]' },
        data: {
          feed: {
            entry: [{
              time_start: '2003-05-07T01:34:57.321Z',
              updated: '2003-05-12T00:00:00.000Z',
              dataset_id: 'Earth Observing-1 Advanced Land Imager V1',
              data_center: 'USGS_EROS',
              title: 'EO1A1090782003127110PZ_LGS_01',
              coordinate_system: 'GEODETIC',
              day_night_flag: 'UNSPECIFIED',
              time_end: '2003-05-07T01:35:09.321Z',
              id: 'G1380417046-USGS_EROS',
              original_format: 'ECHO10',
              browse_flag: true,
              polygons: [[Array]],
              collection_concept_id: 'C1379757686-USGS_EROS',
              online_access_flag: true
            }],
            facets: {
              has_children: true,
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
                              children: [
                                {
                                  title: '20',
                                  children: [{ title: 'item1' }]
                                },
                                { title: '22' },
                                { title: '23' }
                              ]
                            }]
                          },
                          { title: '06' }
                        ]
                      }]
                    },
                    { title: '2002' }
                  ]
                }]
              }]
            }
          }
        }
      };
      jest.spyOn(axios, 'get').mockResolvedValue(resp);
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
    it('should return granule ur and not granule concept id', async () => {
      const facets = await getGranuleTemporalFacets(
        cmrParams,
        '2001',
        '05',
        '20'
      );
      expect(facets.itemids).toEqual(
        expect.arrayContaining(['EO1A1090782003127110PZ_LGS_01'])
      );
    });
  });
});

describe('STAC to CMR uses search-after for GET queries', () => {
  beforeAll(async () => {
    const cmrJsonResponses = [{
      status: 200,
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["c", "m", "r"]' },
      data: { feed: { entry: [] } }
    }, {
      status: 200,
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["m", "r", "c"]' },
      data: { feed: { entry: [] } }
    }, {
      status: 200,
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["r", "c", "m"]' },
      data: { feed: { entry: [] } }
    }];

    jest.spyOn(axios, 'get')
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrJsonResponses[0]))
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrJsonResponses[1]))
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrJsonResponses[2]))
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrJsonResponses[2]));

    await clearTable(tables.SEARCH_AFTER_TABLE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should behave normally on the first call', async () => {
    await cmrSearch('paging-endpoint', {
      page_num: 1,
      provider_id: 'CMR_PAGING'
    });
    expect(axios.get.mock.calls[0][1]).toEqual({
      headers: { 'Client-Id': 'cmr-stac-api-proxy' },
      params: { page_num: 1, provider_id: 'CMR_PAGING' }
    });
  });

  it('should use search-after for subsequent calls', async () => {
    await cmrSearch('paging-endpoint', {
      page_num: 2,
      provider_id: 'CMR_PAGING'
    });

    expect(axios.get.mock.calls[1][1]).toEqual({
      headers: {
        'cmr-search-after': '["c", "m", "r"]',
        'Client-Id': 'cmr-stac-api-proxy'
      },
      params: { provider_id: 'CMR_PAGING' }
    });
  });

  it('should use the same cached value for multiple calls to the same page', async () => {
    await cmrSearch('paging-endpoint', {
      page_num: 2,
      provider_id: 'CMR_PAGING'
    });
    expect(axios.get.mock.calls[2][1]).toEqual({
      headers: {
        'cmr-search-after': '["c", "m", "r"]',
        'Client-Id': 'cmr-stac-api-proxy'
      },
      params: { provider_id: 'CMR_PAGING' }
    });

    await cmrSearch('paging-endpoint', {
      page_num: 2,
      provider_id: 'CMR_PAGING'
    });
    expect(axios.get.mock.calls[3][1]).toEqual({
      headers: {
        'cmr-search-after': '["c", "m", "r"]',
        'Client-Id': 'cmr-stac-api-proxy'
      },
      params: { provider_id: 'CMR_PAGING' }
    });
  });
});

describe('When using POST to query for granules', () => {
  const cmrJsonResponses = [
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["c", "m", "r"]' },
      data: { feed: { entry: [{ id: 'G-0001_PROV_A' }] } }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["m", "r", "c"]' },
      data: { feed: { entry: [{ id: 'G-0002_PROV_A' }] } }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["r", "c", "m"]' },
      data: { feed: { entry: [{ id: 'G-0003_PROV_A' }] } }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3 },
      data: { feed: { entry: [] } }
    }];

  const cmrUmmResponses = [
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["c", "m", "r"]' },
      data: { items: [{ meta: { 'concept-id': 'G-0001_PROV_A' }, umm: {} }] }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["m", "r", "c"]' },
      data: { items: [{ meta: { 'concept-id': 'G-0002_PROV_A' }, umm: {} }] }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3, 'cmr-search-after': '["r", "c", "m"]' },
      data: { items: [{ meta: { 'concept-id': 'G-0003_PROV_A' }, umm: {} }] }
    },
    {
      status: 200,
      headers: { 'cmr-hits': 3 },
      data: { items: [] }
    }];

  beforeAll(async () => {
    settings.cmrStacRelativeRootUrl = '/cloudstac';

    // this is fragile and will break after the graphql changeover
    jest.spyOn(axios, 'post')
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrJsonResponses[0]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrUmmResponses[0]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrJsonResponses[1]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrUmmResponses[1]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrJsonResponses[2]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrUmmResponses[2]));

    await clearTable(tables.SEARCH_AFTER_TABLE);
  });

  afterAll(async () => {
    settings.cmrStacRelativeRootUrl = '/stac';

    jest.restoreAllMocks();
    await clearTable(tables.SEARCH_AFTER_TABLE);
  });

  it('should use page_num for initial searches for granules', async () => {
    await findGranules({ providerId: 'PROV_A', page_num: 1 });
    expect(axios.post.mock.calls[0][1]).toStrictEqual({ providerId: 'PROV_A', page_num: 1 });
  });

  it('should use search-after for subsequent searches for granules: page 2', async () => {
    await findGranules({ providerId: 'PROV_A', page_num: 2 });
    expect(axios.post.mock.calls[2][1]).toStrictEqual({ providerId: 'PROV_A' });
    expect(axios.post.mock.calls[2][2]).toStrictEqual({
      headers: {
        'Client-Id': 'cmr-stac-api-proxy',
        'Content-Type': 'application/x-www-form-urlencoded',
        'cmr-search-after': '["c", "m", "r"]'
      }
    });
  });

  it('should use search-after for subsequent searches for granules: page 3', async () => {
    await findGranules({ providerId: 'PROV_A', page_num: 3 });
    expect(axios.post.mock.calls[4][1]).toStrictEqual({ providerId: 'PROV_A' });
    expect(axios.post.mock.calls[4][2]).toStrictEqual({
      headers: {
        'Client-Id': 'cmr-stac-api-proxy',
        'Content-Type': 'application/x-www-form-urlencoded',
        'cmr-search-after': '["m", "r", "c"]'
      }
    });
  });
});

describe('fetchConcept', () => {
  it('queries CMR', async () => {
    jest.spyOn(axios, 'get')
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve({
        status: 200,
        headers: { "content-type": "application/json" },
        data: exampleData.cmrColls[0]
      }));

    await fetchConcept('C1280859287-GES_DISC');
    expect(axios.get).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('throws on a 404', async () => {
    jest.spyOn(axios, 'get')
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve({
        status: 404,
        headers: { "content-type": "application/json" },
        data: { errors: ["Concept with id [missing] was not found"] }
      }));

    try {
      await fetchConcept('C1280859287-GES_DISC');
    } catch (e) {
      expect(e.message).toBeDefined();
      expect(e).toBeInstanceOf(errors.HttpError);
    }

    jest.restoreAllMocks();
  });
});
