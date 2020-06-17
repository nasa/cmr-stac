const cmr = require('../../lib/cmr');
const cmrConverter = require('../../lib/convert');
const { getSearch, postSearch } = require('../../lib/api/stac');

const { mockFunction, revertFunction, logger } = require('../util');

describe('getSearch', () => {
  it('should return a set of collections that match a simple query', async () => {
    const request = { apiGateway: {}, app: { logger: logger }, params: { providerId: 'LPDAAC' } };
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockFunction(cmr, 'convertParams');
    mockFunction(cmr, 'findGranules');
    mockFunction(cmrConverter, 'cmrGranulesToFeatureCollection');

    cmr.convertParams.mockReturnValue([]);
    cmr.findGranules.mockReturnValue(Promise.resolve([]));
    cmrConverter.cmrGranulesToFeatureCollection.mockReturnValue(Promise.resolve([]));

    await getSearch(request, response);

    expect(response.json).toHaveBeenCalled();
    expect(cmr.convertParams).toHaveBeenCalledTimes(2);

    revertFunction(cmr, 'convertParams');
    revertFunction(cmr, 'findGranules');
    revertFunction(cmrConverter, 'cmrGranulesToFeatureCollection');
  });
});

describe('postSearch', () => {
  it('should return a set of collections that match a simple query', async () => {
    const request = { apiGateway: { event: {} }, body: '{}', app: { logger: logger }, params: { providerId: 'LPDAAC' } };
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockFunction(cmr, 'convertParams');
    mockFunction(cmr, 'findGranules');
    mockFunction(cmrConverter, 'cmrGranulesToFeatureCollection');

    cmr.convertParams.mockReturnValue([]);
    cmr.findGranules.mockReturnValue(Promise.resolve([]));
    cmrConverter.cmrGranulesToFeatureCollection.mockReturnValue(Promise.resolve([]));

    await postSearch(request, response);

    expect(response.json).toHaveBeenCalled();
    expect(cmr.convertParams).toHaveBeenCalledTimes(1);

    revertFunction(cmr, 'convertParams');
    revertFunction(cmr, 'findGranules');
    revertFunction(cmrConverter, 'cmrGranulesToFeatureCollection');
  });
});
