const {
  cmrCollSpatialToExtents,
  stacSearchWithCurrentParams,
  cmrGranuleSearchWithCurrentParams,
  cmrCollToWFSColl
} = require('../../lib/convert/collections');
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

  describe('stacSearchWithCurrentParams', () => {
    const collID = 'landsat-8-l1';
    const collProvider = 'LPDAAC';

    const event = {
      headers: {
        Host: 'example.com'
      },
      queryStringParameters: {
        eo_cloud_cover: 2
      }
    };

    const otherEvent = {
      headers: {
        Host: 'example.com'
      },
      queryStringParameters: {}
    };

    it('should return a search url with current params', () => {
      expect(stacSearchWithCurrentParams(event, collID, collProvider)).toEqual('http://example.com/stac/LPDAAC/search?eo_cloud_cover=2&collections=landsat-8-l1');
    });

    it('should return a search url with no params', () => {
      expect(stacSearchWithCurrentParams(otherEvent, collID, collProvider)).toEqual('http://example.com/stac/LPDAAC/search?collections=landsat-8-l1');
    });
  });

  describe('cmrGranuleSearchWithCurrentParams', () => {
    const collID = 'landsat-8-l1';
    const event = {
      queryStringParameters: {
        collection_concept_id: 'C1234567-PODAAC',
        cloud_cover: 0.2
      }
    };

    const otherEvent = {};

    it('should return a CMR search url containing given parameters', () => {
      expect(cmrGranuleSearchWithCurrentParams(event, collID)).toEqual('https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=landsat-8-l1&cloud_cover=0.2');
    });

    it('should return a CMR search url without any parameters', () => {
      expect(cmrGranuleSearchWithCurrentParams(otherEvent, collID)).toEqual('https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=landsat-8-l1');
    });
  });

  describe('cmrCollToWFSCol', () => {
    const cmrColl = {
      id: 'id',
      license: 'Apache-2.0',
      dataset_id: 'datasetId',
      data_center: 'LPDAAC',
      summary: 'summary',
      time_start: '0',
      time_end: '1'
    };

    const cmrCollTemporal = {
      id: 'id',
      dataset_id: 'datasetId',
      data_center: 'LPDAAC',
      short_name: 'id-LPDAAC',
      summary: 'summary',
      time_start: '2009-01-01T00:00:00Z'
    };

    const event = { headers: { Host: 'example.com' }, queryStringParameters: [] };

    it('should return a WFS Collection from a CMR collection.', () => {
      expect(cmrCollToWFSColl(event, cmrColl)).toEqual({
        description: 'summary',
        extent: {
          crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
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
          },
          trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian'
        },
        links: [
          {
            href: 'http://example.com/stac/LPDAAC/collections/id',
            rel: 'self',
            title: 'Info about this collection',
            type: 'application/json'
          }, {
            rel: 'provider',
            href: 'http://example.com/stac/LPDAAC',
            title: 'Root for this provider',
            type: 'application/json'
          }, {
            href: 'http://example.com/stac/LPDAAC/search?collections=id',
            rel: 'stac',
            title: 'STAC Search this collection',
            type: 'application/json'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=id',
            rel: 'cmr',
            title: 'CMR Search this collection',
            type: 'application/json'
          }, {
            href: 'http://example.com/stac/LPDAAC/collections/id/items',
            rel: 'items',
            title: 'Granules in this collection',
            type: 'application/json'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.html',
            rel: 'overview',
            title: 'HTML metadata for collection',
            type: 'text/html'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.xml',
            rel: 'metadata',
            title: 'Native metadata for collection',
            type: 'application/xml'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.umm_json',
            rel: 'metadata',
            title: 'JSON metadata for collection',
            type: 'application/json'
          }
        ],
        id: 'id',
        title: 'datasetId',
        stac_version: settings.stac.version,
        license: 'Apache-2.0'
      });
    });

    it('should return null as the temporal extent end time', () => {
      expect(cmrCollToWFSColl(event, cmrCollTemporal)).toEqual({
        description: 'summary',
        extent: {
          crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
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
          },
          trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian'
        },
        links: [
          {
            href: 'http://example.com/stac/LPDAAC/collections/id',
            rel: 'self',
            title: 'Info about this collection',
            type: 'application/json'
          }, {
            rel: 'provider',
            href: 'http://example.com/stac/LPDAAC',
            title: 'Root for this provider',
            type: 'application/json'
          }, {
            href: 'http://example.com/stac/LPDAAC/search?collections=id',
            rel: 'stac',
            title: 'STAC Search this collection',
            type: 'application/json'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/granules.json?collection_concept_id=id',
            rel: 'cmr',
            title: 'CMR Search this collection',
            type: 'application/json'
          }, {
            href: 'http://example.com/stac/LPDAAC/collections/id/items',
            rel: 'items',
            title: 'Granules in this collection',
            type: 'application/json'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.html',
            rel: 'overview',
            title: 'HTML metadata for collection',
            type: 'text/html'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.xml',
            rel: 'metadata',
            title: 'Native metadata for collection',
            type: 'application/xml'
          }, {
            href: 'https://cmr.earthdata.nasa.gov/search/concepts/id.umm_json',
            rel: 'metadata',
            title: 'JSON metadata for collection',
            type: 'application/json'
          }
        ],
        id: 'id',
        title: 'datasetId',
        short_name: 'id-LPDAAC',
        stac_version: settings.stac.version,
        license: 'not-provided'
      });
    });
  });
});
