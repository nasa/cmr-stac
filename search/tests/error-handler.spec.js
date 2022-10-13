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
      errors: ['An unexpected error occurred. We have been alerted and are are working to resolve the problem.',
               'a test error']
    });
    expect(next).toHaveBeenCalled();
  });

  it('should return a 400 error with the CMR errors attached.', () => {
    const error = {
      message: 'some other test error',
      response: { data: { errors: ['an error'] } }
    };
    errorHandler(error, request, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ errors: ['an error'] });
    expect(next).toHaveBeenCalled();
  });

  it('should return a 401 error with the CMR errors attached.', () => {
    const error = {
      message: 'invalid credentials',
      response: { status: 401,
                  data: { errors: ['401 error'] } }
    };
    errorHandler(error, request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ errors: ['401 error'] });
    expect(next).toHaveBeenCalled();
  });

  it('should handle a NotFound', () => {
    errorHandler(new errors.NotFound('not found'), request, response, next);

    expect(response.status).toHaveBeenLastCalledWith(404);
    expect(response.json).toHaveBeenLastCalledWith({errors: ['not found']});
  });
});
