const { errorHandler } = require('../lib/error-handler');
const { logger } = require('./util');

const { logger: appLogger, errors } = require('../lib/util');

beforeAll(() =>{
  logger.silent = true;
  appLogger.silent = true;
});

afterAll(() => {
  logger.silent = false;
  appLogger.silent = false;
});

describe('errorHandler', () => {
  let request, response, next;

  beforeEach(() => {
    request = { url: '/stac', app: { logger } };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    next = jest.fn();
  });

  it('should call the next callback.', () => {
    errorHandler({ message: 'a test error' }, request, response, next);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      message: 'If the problem persists please contact cmr-support@earthdata.nasa.gov',
      errors: ['An unexpected error occurred. We have been alerted and are working to resolve the problem.',
               'a test error']
    });
    expect(next).toHaveBeenCalled();
  });

  it('should return a 4xx error with the CMR errors attached.', () => {
    const error = new errors.HttpError('problem', 403, { errors: ['a cmr error'] });

    errorHandler(error, request, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({ message: 'problem', errors: ['a cmr error'] });
    expect(next).toHaveBeenCalled();
  });

  it('should handle a NotFound', () => {
    const error = new errors.NotFound('something was not found');
    errorHandler(error, request, response, next);

    expect(response.status).toHaveBeenLastCalledWith(404);
    expect(response.json).toHaveBeenLastCalledWith({errors: ['something was not found']});
  });
});
