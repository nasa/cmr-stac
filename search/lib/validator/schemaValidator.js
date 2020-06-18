const _ = require('lodash');
const fs = require('fs');
const { promisify } = require('util');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });
const readFile = promisify(fs.readFile);

// Caches an ajv validator function by name in memory.
const getSchemaValidator = _.memoize(async (schemaName) => {
  const fileName = `${__dirname}/../../docs/${schemaName}.json`;
  const contents = (await readFile(fileName)).toString();
  return ajv.compile(JSON.parse(contents));
}, _.identity);

async function validateSchema (schemaName, dataObject) {
  const validator = await getSchemaValidator(schemaName);
  if (validator(dataObject)) {
    return null;
  }
  return validator.errors;
}

module.exports = {
  schemas: {
    catalog: 'catalog',
    collection: 'collection',
    item: 'item'
  },
  validateSchema
};
