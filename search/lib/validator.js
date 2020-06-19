const _ = require('lodash');
const fs = require('fs');
const { promisify } = require('util');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });
const readFile = promisify(fs.readFile);
const { logger } = require('./util');
const settings = require('./settings');

// Caches an ajv validator function by name in memory.
const getSchemaValidator = _.memoize(async (schemaName) => {
  const fileName = `${__dirname}/../docs/${schemaName}.json`;
  const contents = (await readFile(fileName)).toString();
  const parsed = JSON.parse(contents);
  // Remove the id from the schema to avoid collisions in AJV.
  delete parsed['$id'];
  return ajv.compile(parsed);
}, _.identity);

async function validateSchema (schemaName, dataObject) {
  const validator = await getSchemaValidator(schemaName);
  if (validator(dataObject)) {
    return null;
  }
  return validator.errors;
}

async function assertValid (schemaName, dataObject) {
  const errors = await validateSchema(schemaName, dataObject);
  if (errors) {
    logger.error(`dataObject: ${JSON.stringify(dataObject, null, 2)}`);
    logger.error(`Schema validation failed: ${JSON.stringify(errors, null, 2)}`);

    if (settings.invalidResponseIsError) {
      throw new Error(`Created invalid data agaisnt schema ${schemaName}`);
    }
  }
}

module.exports = {
  schemas: {
    catalog: 'catalog',
    collection: 'collection',
    collections: 'collections',
    item: 'item',
    items: 'items'
  },
  validateSchema,
  assertValid
};
