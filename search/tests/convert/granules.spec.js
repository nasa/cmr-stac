const {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
} = require('../../lib/convert');

const schemaValidator = require('../../lib/validator/schemaValidator');

describe('granuleToItem', () => {
  describe('cmrPolygonToGeoJsonPolygon', () => {
    it('should return an array of coordinates for a GeoJson Polygon given one ring', () => {
      const polygon = ['10,10,30,10,30,20,10,20,10,10'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual({
        type: 'Polygon',
        coordinates: [[[10, 10], [30, 10], [30, 20], [10, 20], [10, 10]]]
      });
    });

    it('should return an array of coordinates for a GeoJson Polygon given multiple rings', () => {
      const polygon = ['10,10,30,10,30,20,10,20,10,10', '10,10,30,10,30,20,10,20,10,10'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual({
        type: 'Polygon',
        coordinates: [[[10, 10], [30, 10], [30, 20], [10, 20], [10, 10]], [[10, 10], [30, 10], [30, 20], [10, 20], [10, 10]]]
      });
    });
  });

  describe('cmrBoxToGeoJsonPolygon', () => {
    it('turn a CMR bounding box into a GeoJSON Polygon', () => {
      const cmrBox = '33,-56,27.2,80';
      expect(cmrBoxToGeoJsonPolygon(cmrBox)).toEqual({
        type: 'Polygon',
        coordinates: [[
          [-56, 33],
          [80, 33],
          [80, 27.2],
          [-56, 27.2],
          [-56, 33]
        ]]
      });
    });
  });

  describe('cmrSpatialToGeoJSONGeometry', () => {
    let cmrSpatial;

    it('should return a single GeoJSON geometry for given one point', () => {
      cmrSpatial = {
        points: ['12,23']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({ coordinates: [12, 23], type: 'Point' });
    });

    it('should return a collection of GeoJSON geometries given multiple points', () => {
      cmrSpatial = {
        points: ['12,34', '45,67']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'GeometryCollection',
        geometries: [{
          type: 'Point',
          coordinates: [12, 34]
        },
        {
          type: 'Point',
          coordinates: [45, 67]
        }]
      });
    });

    it('should return a single GeoJSON geometry for a given polygon', () => {
      cmrSpatial = {
        polygons: [['12,34,56,78']]
      };

      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'Polygon',
        coordinates: [[[12, 34], [56, 78]]]
      });
    });

    it('should return an object with multiple GeoJSON geometries for the given polygons', () => {
      cmrSpatial = {
        polygons: [['12,34,56,78'], ['98,76,54,32']]
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'GeometryCollection',
        geometries: [{
          type: 'Polygon',
          coordinates: [[[12, 34], [56, 78]]]
        },
        {
          type: 'Polygon',
          coordinates: [[[98, 76], [54, 32]]]
        }]
      });
    });

    it('should return a single geoJSON gemoetry for a given box', () => {
      cmrSpatial = {
        boxes: ['32,44,10,18']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'Polygon',
        coordinates: [[
          [44, 32],
          [18, 32],
          [18, 10],
          [44, 10],
          [44, 32]
        ]]
      });
    });

    it('should return an object with multiple GeoJSON gemoetries for the given boxes', () => {
      cmrSpatial = {
        boxes: ['22,44.4,93.9,77', '32,44,10,18'] // s, w, n, e
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'GeometryCollection',
        geometries: [{
          type: 'Polygon',
          coordinates: [[
            [44.4, 22],
            [77, 22],
            [77, 93.9],
            [44.4, 93.9],
            [44.4, 22]
          ]]
        },
        {
          type: 'Polygon',
          coordinates: [[
            [44, 32],
            [18, 32],
            [18, 10],
            [44, 10],
            [44, 32]
          ]]
        }]
      });
    });

    it('should return an error if their is no geometry', () => {
      cmrSpatial = {
        points: [],
        boxes: [],
        polygons: []
      };
      expect(() => cmrSpatialToGeoJSONGeometry(cmrSpatial)).toThrow(Error);
    });
  });

  describe('cmrSpatialToStacBbox', () => {
    let cmrCollection;

    it('should return a bounding box from given polygon', () => {
      cmrCollection = {
        polygons: [['30 -10 70 33 -145 66']]
      };
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([-145, -10, 70, 66]);
    });

    it('should return a bounding box from given points', () => {
      cmrCollection = {
        points: ['30 -10', '70 33', '-145 66']
      };
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([-145, -10, 70, 66]);
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

    it('should return a bounding box containing the WHOLE_WORLD_BBOX', () => {
      cmrCollection = {};
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([]);
    });
  });

  describe('cmrGranToFeatureGeoJSON', () => {
    const cmrGran = {
      producer_granule_id: 'MYD04_3K.A2020162.1920.061.2020162201359.NRT.hdf',
      time_start: '2020-06-10T19:20:00.000Z',
      updated: '2020-06-10T20:15:38.392Z',
      dataset_id: 'MODIS/Aqua Aerosol 5-Min L2 Swath 3km - NRT',
      data_center: 'LANCEMODIS',
      title: 'LANCEMODIS:1028118084',
      coordinate_system: 'GEODETIC',
      day_night_flag: 'DAY',
      time_end: '2020-06-10T19:25:00.000Z',
      id: 'G1847797781-LANCEMODIS',
      original_format: 'ECHO10',
      granule_size: '11.7814311981201',
      browse_flag: false,
      polygons: [
        [
          '29.151569 -79.893256 25.657247 -103.152651 7.973287 -97.87194 10.993152 -76.875089 29.151569 -79.893256'
        ]
      ],
      collection_concept_id: 'C1426717545-LANCEMODIS',
      online_access_flag: true,
      links: [
        {
          rel: 'http://esipfed.org/ns/fedsearch/1.1/data#',
          type: 'application/x-hdfeos',
          hreflang: 'en-US',
          href: 'https://nrt3.modaps.eosdis.nasa.gov/archive/allData/61/MYD04_3K/2020/162/MYD04_3K.A2020162.1920.061.NRT.hdf'
        },
        {
          inherited: true,
          rel: 'http://esipfed.org/ns/fedsearch/1.1/data#',
          hreflang: 'en-US',
          href: 'https://earthdata.nasa.gov/earth-observation-data/near-real-time/download-nrt-data/modis-nrt'
        },
        {
          inherited: true,
          rel: 'http://esipfed.org/ns/fedsearch/1.1/data#',
          hreflang: 'en-US',
          href: 'http://lance3.modaps.eosdis.nasa.gov/data_products/'
        },
        {
          inherited: true,
          rel: 'http://esipfed.org/ns/fedsearch/1.1/data#',
          hreflang: 'en-US',
          href: 'https://nrt3.modaps.eosdis.nasa.gov/allData/61/MYD04_3K/'
        },
        {
          inherited: true,
          rel: 'http://esipfed.org/ns/fedsearch/1.1/metadata#',
          hreflang: 'en-US',
          href: 'http://modis.gsfc.nasa.gov/sci_team/'
        }
      ]
    };

    const expectedStacGran = {
      type: 'Feature',
      id: 'G1847797781-LANCEMODIS',
      stac_version: '1.0.0-beta.1',
      collection: 'C1426717545-LANCEMODIS',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [
              29.151569,
              -79.893256
            ],
            [
              25.657247,
              -103.152651
            ],
            [
              7.973287,
              -97.87194
            ],
            [
              10.993152,
              -76.875089
            ],
            [
              29.151569,
              -79.893256
            ]
          ]
        ]
      },
      bbox: [
        7.973287,
        -103.152651,
        29.151569,
        -76.875089
      ],
      links: [
        {
          rel: 'self',
          href: 'http://example.com/cmr-stac/collections/C1426717545-LANCEMODIS/items/G1847797781-LANCEMODIS'
        },
        {
          rel: 'parent',
          href: 'http://example.com/cmr-stac/collections/C1426717545-LANCEMODIS'
        },
        {
          rel: 'collection',
          href: 'http://example.com/cmr-stac/collections/C1426717545-LANCEMODIS'
        },
        {
          rel: 'root',
          href: 'http://example.com/cmr-stac'
        },
        {
          provider: 'LANCEMODIS'
        }
      ],
      properties: {
        datetime: '2020-06-10T19:20:00.000Z',
        start_datetime: '2020-06-10T19:20:00.000Z',
        end_datetime: '2020-06-10T19:25:00.000Z'
      },
      assets: {
        data: {
          href: 'https://nrt3.modaps.eosdis.nasa.gov/archive/allData/61/MYD04_3K/2020/162/MYD04_3K.A2020162.1920.061.NRT.hdf',
          type: 'application/x-hdfeos'
        },
        metadata: {
          href: 'https://cmr.earthdata.nasa.gov/search/concepts/G1847797781-LANCEMODIS.xml',
          type: 'application/xml'
        }
      }
    };

    const event = { headers: { Host: 'example.com' }, queryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran', () => {
      const stacItem = cmrGranToFeatureGeoJSON(event, cmrGran);
      expect(stacItem).toEqual(expectedStacGran);
    });

    it.skip('should return a valid FeatureGeoJSON against STAC Spec', async () => {
      expect.extend({
        toBeValid: (errors) => {
          if (errors) {
            return {
              message: () => JSON.stringify(errors, null, 2),
              pass: false
            };
          }
          return { pass: true };
        }
      });

      const errors = await schemaValidator.validateSchema(schemaValidator.schemas.item, expectedStacGran);
      expect(errors).toBeValid();
    });
  });

  describe('cmrGranulesToFeatureCollection', () => {
    const cmrGran = [{
      id: 1,
      collection_concept_id: 10,
      dataset_id: 'datasetId',
      summary: 'summary',
      time_start: 0,
      time_end: 1,
      links: [
        {
          href: 'http://example.com/cmr-stac/collections/id',
          rel: 'self',
          title: 'Info about this collection',
          type: 'application/json'
        }
      ],
      data_center: 'USA',
      points: ['77,39']
    }];

    const event = { headers: { Host: 'example.com' }, path: '/cmr-stac', queryStringParameters: [] };

    it('should return a cmrGranule to a FeatureCollection', () => {
      expect(cmrGranulesToFeatureCollection(event, cmrGran)).toEqual({
        type: 'FeatureCollection',
        stac_version: '1.0.0-beta.1',
        features: [{
          id: 1,
          stac_version: '1.0.0-beta.1',
          collection: 10,
          geometry: { type: 'Point', coordinates: [77, 39] },
          bbox: [77, 39, 77, 39],
          properties: {
            datetime: '0',
            start_datetime: '0',
            end_datetime: '1'
          },
          type: 'Feature',
          assets: {
            metadata: {
              href: 'https://cmr.earthdata.nasa.gov/search/concepts/1.xml',
              type: 'application/xml'
            }
          },
          links: [
            {
              rel: 'self',
              href: 'http://example.com/cmr-stac/collections/10/items/1'
            },
            {
              rel: 'parent',
              href: 'http://example.com/cmr-stac/collections/10'
            },
            {
              rel: 'collection',
              href: 'http://example.com/cmr-stac/collections/10'
            },
            {
              rel: 'root',
              href: 'http://example.com/cmr-stac'
            },
            {
              provider: 'USA'
            }
          ]
        }],
        links: [
          {
            self: 'http://example.com/cmr-stac',
            next: 'http://example.com/cmr-stac?page_num=2'
          }
        ]
      });
    });
  });
});
