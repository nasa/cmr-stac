const { createLogger } = require('../lib/util');
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Function to take an object and a function name and replace with a
 * jest mock function.
 * @param obj object with property to mock
 * @param name string name of the property from the obj
 * @param returnVal The return value for the mock function
 * @returns {object} obj
 */
function mockFunction (obj, name, returnVal = undefined) {
  if (!hasOwnProperty.call(obj, name)) return obj;

  obj[`__orig__${name}`] = obj[name];
  obj[name] = jest.fn().mockReturnValue(returnVal);

  return obj;
}

/**
 * Function to revert a mock to its original form.
 * @param obj object that has a mocked function
 * @param name string name of the property that was mocked.
 * @returns {object} obj
 */
function revertFunction (obj, name) {
  if (!hasOwnProperty.call(obj, `__orig__${name}`)) return obj;

  obj[name] = obj[`__orig__${name}`];
  delete obj[`__orig__${name}`];

  return obj;
}


function createMockResponse (statusCode = 200, data = {}) {
  this.data = data;
  const mockResp = {
    status: (v) => {
      data.status = v;
      return mockResp;
    },
    setHeader: (v) => {
      data.headers = v;
      return mockResp;
    },
    json: (v) => {
      data.json = v;
      return mockResp;
    },
    getData: () => data,
    expect: (expectedData) => {
      expect(data).toHaveProperty('json', expectedData);
      if (statusCode !== 200) {
        expect(data).toHaveProperty('status', statusCode);
      }
    }
  };
  return mockResp;
}

const logger = createLogger({ logLevel: 'silly' });

function createRequest (additionalData) {
  return Object.assign({
    apiGateway: {
      event: {
        headers: { Host: 'example.com' },
        httpMethod: 'GET'
      }
    },
    body: '{}',
    app: { logger },
    query: {},
    params: {}
  }, additionalData);
}

module.exports = {
  mockFunction,
  revertFunction,
  createMockResponse,
  createRequest,
  logger
};
