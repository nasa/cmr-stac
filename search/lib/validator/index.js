const schemaValidator = require('./schemaValidator');
const stacValidator = require('./stacValidator');

module.exports = {
  ...schemaValidator,
  ...stacValidator
};
