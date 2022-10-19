const settings = require('../../lib/settings');

const {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranuleToStac,
  cmrGranulesToStac
} = require('../../lib/convert');
const exampleData = require('../example-data');
const {
  mockFunction,
  revertFunction
} = require('../util');
const cmr = require('../../lib/cmr');

describe('granuleToItem', () => {
  describe('cmrPolygonToGeoJsonPolygon', () => {
    it('should return an array of coordinates for a GeoJson Polygon given one ring', () => {
      const polygon = ['10,110,30,110,30,120,10,120,10,110'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual(
        [[[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]]]
      );
    });

    it('should return an array of coordinates for a GeoJson Polygon given multiple rings', () => {
      const polygon = ['10,110,30,110,30,120,10,120,10,110', '10,110,30,110,30,120,10,120,10,110'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual([
        [[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]],
        [[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]]
      ]);
    });
  });

  describe('cmrBoxToGeoJsonPolygon', () => {
    it('turn a CMR bounding box into a GeoJSON Polygon', () => {
      const cmrBox = '33,-56,27.2,80';
      expect(cmrBoxToGeoJsonPolygon(cmrBox)).toEqual([[
        [-56, 33],
        [80, 33],
        [80, 27.2],
        [-56, 27.2],
        [-56, 33]
      ]]);
    });
  });

  describe('cmrSpatialToGeoJSONGeometry', () => {
    let cmrSpatial;

    it('should return a single GeoJSON geometry for given one point', () => {
      cmrSpatial = {
        points: ['12,123']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({ coordinates: [123, 12], type: 'Point' });
    });

    it('should return a collection of GeoJSON geometries given multiple points', () => {
      cmrSpatial = {
        points: ['12,134', '45,167']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'MultiPoint',
        coordinates: [
          [134, 12],
          [167, 45]
        ]
      });
    });

    it('should return a LineString geometry given a single line', () => {
      cmrSpatial = {
        lines: ['33.1 -119.114 36.367 -116.086']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'LineString',
        coordinates: [[-119.114, 33.1], [-116.086, 36.367]]
      });
    });

    it('should return a MultiLineString given multiple lines', () => {
      cmrSpatial = {
        lines: ['33.1 -119.114 36.367 -116.086', '15.1 -120.5 45.8 -119.12']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'MultiLineString',
        coordinates: [
          [[-119.114, 33.1], [-116.086, 36.367]],
          [[-120.5, 15.1], [-119.12, 45.8]]
        ]
      });
    });

    it('should return a single GeoJSON geometry for a given polygon', () => {
      cmrSpatial = {
        polygons: [['12,134,56,178']]
      };

      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'Polygon',
        coordinates: [
          [[134, 12], [178, 56]]
        ]
      });
    });

    it('should return an object with multiple GeoJSON geometries for the given polygons', () => {
      cmrSpatial = {
        polygons: [['12,134,56,178'], ['90,176,54,132']]
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'MultiPolygon',
        coordinates: [
          [
            [[134, 12], [178, 56]]
          ],
          [
            [[176, 90], [132, 54]]
          ]
        ]
      });
    });

    it('should return a single geoJSON geometry for a given box', () => {
      cmrSpatial = {
        boxes: ['32,44,10,18']
      };

      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'Polygon',
        coordinates: [
          [
            [44, 32],
            [18, 32],
            [18, 10],
            [44, 10],
            [44, 32]
          ]
        ]
      });
    });

    it('should return an object with multiple GeoJSON geometries for the given boxes', () => {
      cmrSpatial = {
        boxes: ['22,44.4,93.9,77', '32,44,10,18'] // s, w, n, e
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [44.4, 22],
              [77, 22],
              [77, 93.9],
              [44.4, 93.9],
              [44.4, 22]
            ]
          ],
          [
            [
              [44, 32],
              [18, 32],
              [18, 10],
              [44, 10],
              [44, 32]
            ]
          ]
        ]
      });
    });
  });

  describe('cmrSpatialToStacBbox', () => {
    let cmrCollection;
    let cmrGranule;

    it('should return a bounding box from given polygon', () => {
      cmrCollection = {
        polygons: [[
          '-46.72885 -130.07284 -51.17648 -163.05751 -69.36497 -164.57369 -61.96895 -112.53760 -46.72885 -130.07284'
        ]]
      };
      expect(cmrSpatialToStacBbox(cmrCollection))
        .toEqual([-164.57369, -69.492822, -112.5376, -46.72885]);
    });

    it('should return a bounding box from given points', () => {
      cmrCollection = {
        points: ['30 -110', '70 133', '-45 166']
      };
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([-110, -45, 166, 70]);
    });

    it('should return a bounding box from given lines', () => {
      cmrGranule = {
        lines: ['33.1 -119.114 36.367 -116.086']
      };
      expect(cmrSpatialToStacBbox(cmrGranule)).toEqual([-119.114, 33.1, -116.086, 36.367]);
    });

    it('should return a bounding box given multiple lines', () => {
      cmrGranule = {
        lines: ['33.1 -119.114 36.367 -116.086', '15.1 -120.5 45.8 -119.12']
      };
      expect(cmrSpatialToStacBbox(cmrGranule)).toEqual([-120.5, 15.1, -116.086, 45.8]);
    });

    it('should return a bounding box from provided coordinates [west north east south]', () => {
      cmrCollection = {
        boxes: ['-74.6 -123.4 33.3 54.9 ']
      };
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([-123.4, -74.6, 54.9, 33.3]);
    });

    it('should reorder values to fit stac spec [west north east south]', () => {
      cmrCollection = {
        boxes: ['-90 -180 90 180']
      };
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([-180, -90, 180, 90]);
    });

    it('should rqeturn a bounding box containing the WHOLE_WORLD_BBOX', () => {
      cmrCollection = {};
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([]);
    });
  });

  describe('cmrGranuleToStac', () => {
    const event = { headers: { Host: 'example.com' }, multiValueQueryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran', () => {
      const stacItem = cmrGranuleToStac(event,
                                        exampleData.examplesByName.lpdaacCmrColl,
                                        exampleData.examplesByName.lpdaacCmrGran);
      expect(stacItem).toEqual(exampleData.examplesByName.lpdaacStacGran);
    });
  });

  describe('cmrGranuleToStac', () => {
    const cmrGran = exampleData.examplesByName.lancemodisCmrCcGran;
    const expectedStacGran = exampleData.examplesByName.lancemodisStacCcGran;

    const event = { headers: { Host: 'example.com' }, multiValueQueryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran containing a eo:cloud_cover field', () => {
      const stacItem = cmrGranuleToStac(event, exampleData.examplesByName.lancemodisCmrColl, cmrGran);
      expect(stacItem).toEqual(expectedStacGran);
    });
  });

  describe('cmrGranuleToStac', () => {
    const cmrGran = exampleData.examplesByName.lancemodisCmrCcGranAdditionalAttributes;
    const expectedStacGran = exampleData.examplesByName.lancemodisStacCcGran;

    const event = { headers: { Host: 'example.com' }, multiValueQueryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran containing a CLOUD_COVERAGE value Additional Attributes field', () => {
      const stacItem = cmrGranuleToStac(event, exampleData.examplesByName.lancemodisCmrColl, cmrGran);
      expect(stacItem).toEqual(expectedStacGran);
    });
  });

  describe('cmrGranulesToStac', () => {
    beforeEach(() => {
      mockFunction(cmr, 'cmrCollectionToStacId', 'landsat.v1');
    });

    afterEach(() => {
      revertFunction(cmr, 'cmrCollectionToStacId');
    });

    const parentColls = {"10": {
      "id": 10,
      "short_name": "cmrGranulesToStacParent",
      "version_id": "2"
    }};

    const cmrGran = [{
      id: 1,
      title: 1,
      collection_concept_id: "10",
      dataset_id: 'datasetId',
      short_name: 'landsat',
      version_id: '1',
      summary: 'summary',
      time_start: '0',
      time_end: '1',
      links: [
        {
          href: 'http://example.com/stac/collections/id',
          rel: 'self',
          title: 'Info about this collection',
          type: 'application/json'
        }
      ],
      data_center: 'USA',
      points: ['77,139']
    }];

    const event = { headers: { Host: 'example.com' }, path: '/stac', queryStringParameters: [] };

    it('should return a CMR Granules search result to a FeatureCollection', () => {
      const items = cmrGranulesToStac(event, parentColls, cmrGran, 1);
      expect(items).toEqual({
        type: 'FeatureCollection',
        stac_version: settings.stac.version,
        numberMatched: 1,
        numberReturned: 1,
        features: [{
          id: 1,
          stac_version: settings.stac.version,
          stac_extensions: [],
          collection: 'landsat.v1',
          geometry: { type: 'Point', coordinates: [139, 77] },
          bbox: [139, 77, 139, 77],
          properties: {
            datetime: '0',
            start_datetime: '0',
            end_datetime: '1'
          },
          type: 'Feature',
          assets: {
            metadata: {
              href: 'http://localhost:3003/concepts/1.xml',
              type: 'application/xml'
            }
          },
          links: [
            {
              rel: 'self',
              href: 'https://example.com/stac/USA/collections/landsat.v1/items/1'
            },
            {
              rel: 'parent',
              href: 'https://example.com/stac/USA/collections/landsat.v1'
            },
            {
              rel: 'collection',
              href: 'https://example.com/stac/USA/collections/landsat.v1'
            },
            {
              rel: 'root',
              href: 'https://example.com/stac/'
            },
            {
              rel: 'provider',
              href: 'https://example.com/stac/USA'
            },
            {
              rel: 'via',
              href: 'http://localhost:3003/concepts/1.json'
            },
            {
              rel: 'via',
              href: 'http://localhost:3003/concepts/1.umm_json'
            }
          ]
        }],
        links: [
          {
            rel: 'self',
            href: 'https://example.com/stac'
          },
          {
            rel: 'root',
            href: 'https://example.com/stac/'
          }
        ]
      });
    });
  });

  describe('cmrGranuleToStac', () => {
    const cmrGran = {
      id: 1,
      collection_concept_id: "10",
      dataset_id: 'datasetId',
      short_name: 'landsat',
      version_id: '1',
      summary: 'summary',
      time_start: '0',
      time_end: '1',
      links: [
        {
          rel: "http://esipfed.org/ns/fedsearch/1.1/service#",
          title: "OPeNDAP request URL",
          hreflang: "en-US",
          href: "https://opendap.earthdata.nasa.gov/collections/C1940473819-POCLOUD/granules/20220726101001-JPL-L2P_GHRSST-SSTskin-MODIS_A-D-v02.0-fv01.0"
        }
      ],
      data_center: 'USA',
      points: ['77,139']
    };

    const event = { headers: { Host: 'example.com' }, multiValueQueryStringParameters: [] };

    it('opendap url should be taken from the the service relatedUrls', () => {
      const stacItem = cmrGranuleToStac(event, {
        "short_name": "mini",
        "version_id": "3"
      }, cmrGran);
      expect(stacItem.assets.opendap).toEqual({
        title: 'OPeNDAP request URL',
        href: 'https://opendap.earthdata.nasa.gov/collections/C1940473819-POCLOUD/granules/20220726101001-JPL-L2P_GHRSST-SSTskin-MODIS_A-D-v02.0-fv01.0'
      });
    });
  });
});
