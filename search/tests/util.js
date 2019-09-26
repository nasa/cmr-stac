const { createLogger } = require('../lib/util');
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Function to take an object and a function name and replace with a
 * jest mock function.
 * @param obj object with property to mock
 * @param name string name of the property from the obj
 * @returns {object} obj
 */
function mockFunction (obj, name) {
  if (!hasOwnProperty.call(obj, name)) return obj;

  obj[`__orig__${name}`] = obj[name];
  obj[name] = jest.fn();

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

const logger = createLogger({ logLevel: 'silly' });

module.exports = {
  mockFunction,
  revertFunction,
  logger
};
