const {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
} = require('../../lib/convert');

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

  describe('cmrGranToFeatureGeoJSON', () => {
    const cmrGran = {
      id: 1,
      collection_concept_id: 10,
      bbox: [90, -180, -90, 180],
      dataset_id: 'datasetId',
      summary: 'summary',
      time_start: 0,
      time_end: 1,
      assets: {},
      links: [
        {
          href: 'http://example.com/collections/id',
          rel: 'self',
          title: 'Info about this collection',
          type: 'application/json'
        },
        {
          rel: 'http://esipfed.org/ns/fedsearch/1.1/browse#',
          href: 'http://example.com/images/abc.jpg',
          type: 'application/json' // this is wrong on purpose to test converting
        }
      ],
      data_center: 'USA',
      points: ['77,39']
    };

    const event = { headers: { Host: 'example.com' }, queryStringParameters: [] };

    it('should return a FeatureGeoJSON from a cmrGran', () => {
      expect(cmrGranToFeatureGeoJSON(event, cmrGran)).toEqual({
        type: 'Feature',
        id: 1,
        bbox: undefined,
        collection: 10,
        geometry: { type: 'Point', coordinates: [77, 39] },
        properties: {
          datetime: '0',
          start_datetime: '0',
          end_datetime: '1'
        },
        assets: {
          browse: {
            href: 'http://example.com/images/abc.jpg',
            type: 'images/jpeg'
          },
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
      });
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
        features: [{
          id: 1,
          collection: 10,
          geometry: { type: 'Point', coordinates: [77, 39] },
          bbox: undefined,
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
