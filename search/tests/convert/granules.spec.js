const settings = require('../../lib/settings');
const {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
} = require('../../lib/convert');
const exampleData = require('../example-data');

const schemaValidator = require('../../lib/validator');

describe('granuleToItem', () => {
  describe('cmrPolygonToGeoJsonPolygon', () => {
    it('should return an array of coordinates for a GeoJson Polygon given one ring', () => {
      const polygon = ['10,110,30,110,30,120,10,120,10,110'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual({
        type: 'Polygon',
        coordinates: [[[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]]]
      });
    });

    it('should return an array of coordinates for a GeoJson Polygon given multiple rings', () => {
      const polygon = ['10,110,30,110,30,120,10,120,10,110', '10,110,30,110,30,120,10,120,10,110'];
      expect(cmrPolygonToGeoJsonPolygon(polygon)).toEqual({
        type: 'Polygon',
        coordinates: [
          [[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]],
          [[110, 10], [110, 30], [120, 30], [120, 10], [110, 10]]
        ]
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
        points: ['12,123']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({ coordinates: [123, 12], type: 'Point' });
    });

    it('should return a collection of GeoJSON geometries given multiple points', () => {
      cmrSpatial = {
        points: ['12,134', '45,167']
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'GeometryCollection',
        geometries: [{
          type: 'Point',
          coordinates: [134, 12]
        },
        {
          type: 'Point',
          coordinates: [167, 45]
        }]
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
        coordinates: [[[134, 12], [178, 56]]]
      });
    });

    it('should return an object with multiple GeoJSON geometries for the given polygons', () => {
      cmrSpatial = {
        polygons: [['12,134,56,178'], ['90,176,54,132']]
      };
      expect(cmrSpatialToGeoJSONGeometry(cmrSpatial)).toEqual({
        type: 'GeometryCollection',
        geometries: [{
          type: 'Polygon',
          coordinates: [[[134, 12], [178, 56]]]
        },
        {
          type: 'Polygon',
          coordinates: [[[176, 90], [132, 54]]]
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
    let cmrGranule;

    it('should return a bounding box from given polygon', () => {
      cmrCollection = {
        polygons: [['-46.728858 -130.072843 -51.176483 -163.057516 -69.364972 -164.573697 -61.968957 -112.537606 -46.728858 -130.072843']]
      };
      expect(cmrSpatialToStacBbox(cmrCollection))
        .toEqual([-164.573697, -69.492825, -112.537606, -46.728858]);
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

    it('should return a bounding box containing the WHOLE_WORLD_BBOX', () => {
      cmrCollection = {};
      expect(cmrSpatialToStacBbox(cmrCollection)).toEqual([]);
    });
  });

  describe('cmrGranToFeatureGeoJSON', () => {
    const cmrGran = exampleData.examplesByName.lancemodisCmrGran;
    const expectedStacGran = exampleData.examplesByName.lancemodisStacGran;

    const event = { headers: { Host: 'example.com' }, queryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran', () => {
      const stacItem = cmrGranToFeatureGeoJSON(event, cmrGran);
      expect(stacItem).toEqual(expectedStacGran);
    });

    it('should return a valid FeatureGeoJSON against STAC Spec', async () => {
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

      const errors = await schemaValidator.validateSchema(schemaValidator.schemas.item,
        expectedStacGran);
      expect(errors).toBeValid();
    });
  });

  describe('cmrGranulesToFeatureCollection', () => {
    const cmrGran = [{
      id: 1,
      collection_concept_id: 10,
      dataset_id: 'datasetId',
      short_name: 'landsat',
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
      expect(cmrGranulesToFeatureCollection(event, cmrGran, [], 1)).toEqual({
        type: 'FeatureCollection',
        stac_version: settings.stac.version,
        features: [{
          id: 1,
          stac_version: settings.stac.version,
          stac_extensions: [],
          collection: 10,
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
              href: 'https://cmr.earthdata.nasa.gov/search/concepts/1.xml',
              type: 'application/xml'
            }
          },
          links: [
            {
              rel: 'self',
              href: 'http://example.com/stac/USA/collections/10/items/1'
            },
            {
              rel: 'parent',
              href: 'http://example.com/stac/USA/collections/10'
            },
            {
              rel: 'collection',
              href: 'http://example.com/stac/USA/collections/10'
            },
            {
              rel: 'root',
              href: 'http://example.com/stac/'
            },
            {
              rel: 'provider',
              href: 'http://example.com/stac/USA'
            }
          ]
        }],
        links: [
          {
            rel: 'self',
            href: 'http://example.com/stac'
          },
          {
            rel: 'root',
            href: 'http://example.com/stac/'
          }
        ]
      });
    });
  });
});
