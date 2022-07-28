const axios = require('axios');
const settings = require('../../lib/settings.js');
const {
  cmrSearch,
  findCollections,
  findGranules,
  convertParams,
  getFacetParams,
  getGranuleTemporalFacets
} = require('../../lib/cmr');

describe('cmr', () => {
  let params;

  beforeEach(() => {
    params = { param: 'test' };
  });

  describe('cmrSearch', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = {
        headers: { 'cmr-hits': 0, 'cmr-search-after': '["c", "m", "r"]' },
        data: { feed: { entry: [] } }
      };
      axios.get.mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should exist', () => {
      expect(cmrSearch).toBeDefined();
    });

    it('should take in a url and a params object', async () => {
      const error = new Error('Missing url');
      expect.assertions(1);
      try {
        await cmrSearch();
      } catch (e) {
        expect(e).toEqual(error);
      }
    });

    it('should return a cmr collection', async () => {
      await cmrSearch('test-endpoint', {});
      expect(axios.get.mock.calls.length).toBe(1);
      expect(axios.get.mock.calls[0][1]).toEqual({
        headers: { 'Client-Id': 'cmr-stac-api-proxy' },
        params: {}
      });
    });
  });

  describe('findCollections', () => {
    describe('when there are results', () => {
      beforeEach(() => {
        axios.get = jest.fn();
        const cmrResponse = {
          headers: { 'cmr-hits': 1, 'cmr-search-after': '["d", "e", "f"]' },
          data: { feed: { entry: [{ concept_id: "C000000001-STAC_PROV", test: 'value' }] } }
        };
        axios.get.mockResolvedValue(cmrResponse);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should return a collection', async () => {
        const result = await findCollections({
          concept_id: "C000000001-STAC_PROV",
          provider_id: 'STAC_PROV'
        });
        expect(axios.get.mock.calls.length).toBe(1);
        expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
      });

      it('should include the concept_id and provider_id in the query', async () => {
        await findCollections({ concept_id: "C000000001-STAC_PROV", provider_id: 'STAC_PROV' });
        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('http://localhost:3003/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({
            params: { concept_id: "C000000001-STAC_PROV", provider_id: 'STAC_PROV' },
            headers: { 'Client-Id': 'cmr-stac-api-proxy' }
          });
      });

      it('should return a url with granules and downloadable as true', async () => {
        const result = await findCollections();

        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('http://localhost:3003/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({
            params: {},
            headers: { 'Client-Id': 'cmr-stac-api-proxy' }
          });
        expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
      });

      it('should return a url with granues and downloadable as true as well as params', async () => {
        const result = await findCollections(params);

        expect(axios.get.mock.calls.length).toBe(1);
        expect(axios.get.mock.calls[0][0])
          .toBe('http://localhost:3003/collections.json');
        expect(axios.get.mock.calls[0][1])
          .toEqual({
            params: { param: 'test' },
            headers: { 'Client-Id': 'cmr-stac-api-proxy' }
          });
        expect(result[0]).toEqual({ concept_id: "C000000001-STAC_PROV", test: 'value' });
      });
    });

    describe('when there are NO results', () => {
      beforeEach(() => {
        axios.get = jest.fn();
        const cmrResponse = {
          headers: { 'cmr-hits': 0, 'cmr-search-after': '["h", "i", "j"]' },
          data: { feed: { entry: [] } }
        };
        axios.get.mockResolvedValue(cmrResponse);
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
    beforeEach(() => {
      axios.get = jest.fn();
      const cmrResponse = {headers: { 'cmr-hits': 199, 'cmr-search-after': ''["x", "y", "z"] },
        data: { feed: { entry: [{ test: 'value' }] } }
      };
      axios.get.mockResolvedValue(cmrResponse);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('makes a request to /granules.json', async () => {
      await findGranules();

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('http://localhost:3003/granules.json');
    });

    it('makes a request with the supplied params', async () => {
      await findGranules(params);

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][1])
        .toEqual({
          params: { param: 'test' },
          headers: { 'Client-Id': 'cmr-stac-api-proxy' }
        });
    });

    it('returns an object with the returned granules', async () => {
      const result = await findGranules();

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('http://localhost:3003/granules.json');
      expect(result).toEqual(
        expect.objectContaining({ granules: [{ test: 'value' }] })
      );
    });

    it('returns hits from the CMR response header "cmr-hits"', async () => {
      const result = await findGranules(params);

      expect(axios.get.mock.calls.length).toBe(2);
      expect(axios.get.mock.calls[0][0])
        .toBe('http://localhost:3003/granules.json');
      expect(axios.get.mock.calls[1][0])
        .toBe('http://localhost:3003/granules.umm_json');
      expect(result).toEqual(expect.objectContaining({ hits: 199 }));
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
        axios.get = jest.fn();
        const cmrResponse = {
          headers: { 'cmr-hits': 0, 'cmr-search-after': '["t", "u", "v"]' },
          data: { feed: { entry: [{ id: "C00000000001-STAC_PROV" }] } }
        };
        axios.get.mockResolvedValue(cmrResponse);

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
        axios.get = jest.fn();
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
});

describe('STAC to CMR uses search-after for GET queries', () => {
  beforeAll(() => {
    axios.get = jest.fn();
    const cmrResponses = [{
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["c", "m", "r"]' },
      data: { feed: { entry: [] } }
    }, {
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["m", "r", "c"]' },
      data: { feed: { entry: [] } }
    }, {
      headers: { 'cmr-hits': 0, 'cmr-search-after': '["r", "c", "m"]' },
      data: { feed: { entry: [] } }
    }];
    axios.get
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrResponses[0]))
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrResponses[1]))
      .mockImplementationOnce((_url, _req) => Promise.resolve(cmrResponses[2]))
      .mockImplementation((_url, _req) => Promise.resolve(cmrResponses[2]));
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

    await cmrSearch('paging-endpoint', {
      page_num: 3,
      provider_id: 'CMR_PAGING'
    });
    expect(axios.get.mock.calls[2][1]).toEqual({
      headers: {
        'cmr-search-after': '["m", "r", "c"]',
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
    expect(axios.get.mock.calls[3][1]).toEqual({
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
    expect(axios.get.mock.calls[4][1]).toEqual({
      headers: {
        'cmr-search-after': '["c", "m", "r"]',
        'Client-Id': 'cmr-stac-api-proxy'
      },
      params: { provider_id: 'CMR_PAGING' }
    });
  });
});

describe('When using POST to query for granules', () => {
  const cmrResponses = [
    { headers: { 'cmr-hits': 3, 'cmr-search-after': '["c", "m", "r"]' },
      data: { feed: { entry: [{ id: 'G-0001_PROV_A' }] } } },
    { headers: { 'cmr-hits': 3, 'cmr-search-after': '["m", "r", "c"]' },
      data: { feed: { entry: [{ id: 'G-0002_PROV_A' }] } } },
    { headers: { 'cmr-hits': 3, 'cmr-search-after': '["r", "c", "m"]' },
      data: { feed: { entry: [{ id: 'G-0003_PROV_A' }] } } },
    { headers: { 'cmr-hits': 3, 'cmr-search-after': '["z", "z", "z"]' },
      data: { feed: { entry: [] } } }];

  beforeAll(() => {
    settings.cmrStacRelativeRootUrl = '/cloudstac';
    console.log(settings);

    axios.post = jest.fn();
    axios.post
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[0]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[0]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[1]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[1]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[2]))
      .mockImplementationOnce((_url, _body, _headers) => Promise.resolve(cmrResponses[2]))
      .mockImplementation((_url, _body, _headers) => Promise.resolve(cmrResponses[3]));
  });

  afterAll(() => {
    jest.restoreAllMocks();
    settings.cmrStacRelativeRootUrl = '/stac';
  });

  it('should use page_num for initial searches for granules', async () => {
    await findGranules({ providerId: 'PROV_A', page_num: 1 });
    expect(axios.post.mock.calls[0][1]).toStrictEqual({ providerId: 'PROV_A', page_num: 1 });
  });

  it('should use search-after for subsequent searches for granules', async () => {
    await findGranules({ providerId: 'PROV_A', page_num: 2 });
    expect(axios.post.mock.calls[2][1]).toStrictEqual({ providerId: 'PROV_A' });
    expect(axios.post.mock.calls[2][2]).toStrictEqual({
      headers: {
        'Client-Id': 'cmr-stac-api-proxy',
        'Content-Type': 'application/x-www-form-urlencoded',
        'cmr-search-after': '["c", "m", "r"]' }
    });
  });
});
