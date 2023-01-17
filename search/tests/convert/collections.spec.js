const {
  cmrCollSpatialToExtents,
  cmrCollToWFSColl
} = require('../../lib/convert/collections');
const axios = require('axios');
const { WHOLE_WORLD_BBOX } = require('../../lib/convert');
const settings = require('../../lib/settings');

describe('collections', () => {
  describe('cmrCollSpatialToExtents', () => {
    let cmrCollection;

    it('should return a bounding box from given polygon', () => {
      cmrCollection = {
        polygons: [['-10 30 33 70 66 -145']]
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-145, -10, 70, 66]);
    });

    it('should return a bounding box from given points', () => {
      cmrCollection = {
        points: ['-10 30', '33 70', '66 -145']
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-145, -10, 70, 66]);
    });

    it('should return a bounding box from given lines', () => {
      cmrCollection = {
        id: 'sampleCollection',
        lines: ['33.1 -119.114 36.367 -116.086']
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-119.114, 33.1, -116.086, 36.367]);
    });

    it('should return a single box from multiple given line strings', () => {
      cmrCollection = {
        id: 'samplecollection',
        lines: ['33.1 -119.114 36.367 -116.086', '15.1 -120.5 45.8 -119.12']
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-120.5, 15.1, -116.086, 45.8]);
    });

    it('should return a bounding box from provided coordinates [west north east south]', () => {
      cmrCollection = {
        boxes: ['-74.6 -123.4 33.3 54.9 ']
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-123.4, -74.6, 54.9, 33.3]);
    });

    it('should reorder values to fit stac spec [west north east south]', () => {
      cmrCollection = {
        boxes: ['-90 -180 90 180']
      };
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual([-180, -90, 180, 90]);
    });

    it('should return a bounding box containing the WHOLE_WORLD_BBOX', () => {
      cmrCollection = {};
      expect(cmrCollSpatialToExtents(cmrCollection)).toEqual(WHOLE_WORLD_BBOX);
    });
  });

  describe('cmrCollToWFSCol', () => {
    beforeEach(() => {
      axios.get = jest.fn();
      const resp = { data: { feed: { facets: { children: [{
        title: 'Temporal',
        children: [{
          title: 'Year',
          children: [
            { title: '2001' },
            { title: '2002' },
            { title: '2003' },
            { title: '2004' },
            { title: '2005' }
          ]
        }]
      }] } } } };
      axios.get.mockResolvedValue(resp);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const cmrColl = {
      id: 'id',
      short_name: 'name',
      version_id: 'version',
      license: 'Apache-2.0',
      dataset_id: 'datasetId',
      data_center: 'LPDAAC',
      summary: 'summary',
      time_start: '0',
      time_end: '1'
    };

    const cmrCollTemporal = {
      id: 'id',
      short_name: 'name',
      version_id: 'version',
      dataset_id: 'datasetId',
      data_center: 'LPDAAC',
      summary: 'summary',
      time_start: '2009-01-01T00:00:00Z'
    };

    const event = { headers: { Host: 'example.com' }, queryStringParameters: [] };

    it('should return a WFS Collection from a CMR collection.', () => {
      expect(cmrCollToWFSColl(event, cmrColl)).toEqual({
        description: 'summary',
        extent: {
          spatial: {
            bbox: [
              [
                -180,
                -90,
                180,
                90
              ]
            ]
          },
          temporal: {
            interval: [
              [
                '0',
                '1'
              ]
            ]
          }
        },
        links: [
          {
            href: 'https://example.com/stac/LPDAAC/collections/name.vversion',
            rel: 'self',
            title: 'Info about this collection',
            type: 'application/json'
          }, {
            rel: 'root',
            href: 'https://example.com/stac',
            title: 'Root catalog',
            type: 'application/json'
          }, {
            rel: 'parent',
            href: 'https://example.com/stac/LPDAAC',
            title: 'Parent catalog',
            type: 'application/json'
          }, {
            href: 'https://example.com/stac/LPDAAC/collections/name.vversion/items',
            rel: 'items',
            title: 'Granules in this collection',
            type: 'application/json'
          }, {
            href: 'http://localhost:3003/concepts/id.html',
            rel: 'about',
            title: 'HTML metadata for collection',
            type: 'text/html'
          }, {
            href: 'http://localhost:3003/concepts/id.json',
            rel: 'via',
            title: 'CMR JSON metadata for collection',
            type: 'application/json'
          }
        ],
        id: 'name.vversion',
        title: 'datasetId',
        stac_version: settings.stac.version,
        type: 'Collection',
        license: 'Apache-2.0'
      });
    });

    it('should return null as the temporal extent end time', () => {
      expect(cmrCollToWFSColl(event, cmrCollTemporal)).toEqual({
        description: 'summary',
        extent: {
          spatial: {
            bbox: [
              [
                -180,
                -90,
                180,
                90
              ]
            ]
          },
          temporal: {
            interval: [
              [
                '2009-01-01T00:00:00Z',
                null
              ]
            ]
          }
        },
        links: [
          {
            href: 'https://example.com/stac/LPDAAC/collections/name.vversion',
            rel: 'self',
            title: 'Info about this collection',
            type: 'application/json'
          }, {
            rel: 'root',
            href: 'https://example.com/stac',
            title: 'Root catalog',
            type: 'application/json'
          }, {
            rel: 'parent',
            href: 'https://example.com/stac/LPDAAC',
            title: 'Parent catalog',
            type: 'application/json'
          }, {
            href: 'https://example.com/stac/LPDAAC/collections/name.vversion/items',
            rel: 'items',
            title: 'Granules in this collection',
            type: 'application/json'
          }, {
            href: 'http://localhost:3003/concepts/id.html',
            rel: 'about',
            title: 'HTML metadata for collection',
            type: 'text/html'
          }, {
            href: 'http://localhost:3003/concepts/id.json',
            rel: 'via',
            title: 'CMR JSON metadata for collection',
            type: 'application/json'
          }
        ],
        id: 'name.vversion',
        title: 'datasetId',
        stac_version: settings.stac.version,
        type: 'Collection',
        license: 'not-provided'
      });
    });
  });
});
