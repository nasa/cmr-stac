const { mockFunction, revertFunction } = require('../util');
const cmr = require('../../lib/cmr');
const convert = require('../../lib/convert');
const {
  getCollections,
  getCollection,
  getGranules,
  getGranule
} = require('../../lib/api/wfs');

describe('wfs routes', () => {
  let request, response;

  beforeEach(() => {
    request = {
      apiGateway: {
        event: { headers: { Host: 'example.com' } }
      },
      params: {
        collectionId: '1',
        itemId: '1'
      }
    };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getCollections', () => {
    it('should generate a collections response.', async () => {
      const expectedResponse = {
        collections: [[]],
        links: [
          {
            href: 'http://example.com/cmr-stac/collections',
            rel: 'self',
            title: 'this document',
            type: 'application/json'
          }
        ]
      };
      request.query = {};

      mockFunction(cmr, 'findCollections');
      mockFunction(convert, 'cmrCollToWFSColl');

      cmr.findCollections.mockReturnValue(Promise.resolve([{}]));
      convert.cmrCollToWFSColl.mockReturnValue([]);

      await getCollections(request, response);

      expect(cmr.findCollections).toHaveBeenCalled();
      expect(convert.cmrCollToWFSColl).toHaveBeenCalled();
      expect(response.json).toHaveBeenCalledWith(expectedResponse);

      revertFunction(cmr, 'findCollections');
      revertFunction(convert, 'cmrCollToWFSColl');
    });
  });

  describe('getCollection', () => {
    it('should generate a single collections metadata response.', async () => {
      mockFunction(cmr, 'getCollection');
      mockFunction(convert, 'cmrCollToWFSColl');

      cmr.getCollection.mockReturnValue(Promise.resolve([]));
      convert.cmrCollToWFSColl.mockReturnValue([]);

      await getCollection(request, response);

      expect(cmr.getCollection).toHaveBeenCalled();
      expect(convert.cmrCollToWFSColl).toHaveBeenCalled();
      expect(response.json).toHaveBeenCalledWith([]);

      revertFunction(cmr, 'getCollection');
      revertFunction(convert, 'cmrCollToWFSColl');
    });
  });

  describe('getGranules', () => {
    it('should generate a item collection response.', async () => {
      request.query = {}

      mockFunction(cmr, 'findGranules');
      mockFunction(convert, 'cmrGranToFeatureGeoJSON');

      cmr.findGranules.mockReturnValue(Promise.resolve([{}]));
      convert.cmrGranToFeatureGeoJSON.mockReturnValue({ response: 'okay' });

      await getGranules(request, response);

      expect(cmr.findGranules).toHaveBeenCalled();
      expect(convert.cmrGranToFeatureGeoJSON).toHaveBeenCalled();
      expect(response.json).toHaveBeenCalledWith({ features: [{ response: 'okay' }], links: [{ rel: 'self', href: 'http://example.com' }, { rel: 'next', href: 'http://example.com?page_num=2' }], type: 'FeatureCollection' });

      revertFunction(cmr, 'findGranules');
      revertFunction(convert, 'cmrGranToFeatureGeoJSON');
    });

    // it('should generate an item collection response with a prev link', async () => {

    // })
  });

  describe('getGranule', () => {
    it('should generate a item response.', async () => {
      mockFunction(cmr, 'findGranules');
      mockFunction(convert, 'cmrGranToFeatureGeoJSON');

      cmr.findGranules.mockReturnValue(Promise.resolve([]));
      convert.cmrGranToFeatureGeoJSON.mockReturnValue({ response: 'okay' });

      await getGranule(request, response);

      expect(cmr.findGranules).toHaveBeenCalled();
      expect(convert.cmrGranToFeatureGeoJSON).toHaveBeenCalled();
      expect(response.json).toHaveBeenCalledWith({ response: 'okay' });

      revertFunction(cmr, 'findGranules');
      revertFunction(convert, 'cmrGranToFeatureGeoJSON');
    });
  });
});
