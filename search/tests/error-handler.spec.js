const { errorHandler } = require('../lib/error-handler');
const { logger } = require('./util');

describe('errorHandler', () => {
  let request, response, next;

  beforeEach(() => {
    request = { app: { logger: logger } };
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    next = jest.fn();
  });

  it('should call the next callback.', () => {
    errorHandler({}, request, response, next);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.send).toHaveBeenCalledWith('Internal server error');
    expect(next).toHaveBeenCalled();
  });

  it('should return a 400 error with the CMR errors attached.', () => {
    const error = { response: { data: { errors: ['an error'] } } };
    errorHandler(error, request, response, next);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith(['an error']);
    expect(next).toHaveBeenCalled();
  });
});
