const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

function loadOpenApiYaml (swaggerYaml) {
  if (!swaggerYaml) throw new Error('Missing Yaml path');
  const yamlSchemaFile = path.isAbsolute(swaggerYaml) ? swaggerYaml : path.join(__dirname, swaggerYaml);
  return yaml.safeLoad(fs.readFileSync(yamlSchemaFile));
}

function getSchemaCollection (schemaJson) {
  if (!schemaJson) throw new Error('Missing schema object');
  if (!schemaJson.components) throw new Error('Missing component collection');
  if (!schemaJson.components.schemas) throw new Error('Missing collection schemas');
  return schemaJson.components.schemas;
}

function getSchema (schemaCollection, schemaComponent) {
  if (!schemaCollection) throw new Error('Missing schema collection parameter');
  if (!schemaComponent) throw new Error('Missing schema component name');
  if (!schemaCollection[schemaComponent]) throw new Error('Component not found in collection');
  return schemaCollection[schemaComponent];
}

function createSchemaValidator (schema) {
  if (!schema) throw new Error('Missing a schema.');
  return ajv.compile(schema);
}

function validateSchema (componentName, dataObject, yamlSchemaFile = '../../docs/OAcore+STAC.yaml') {
  if (!componentName || !dataObject) throw new Error('Missing parameters');
  const load = loadOpenApiYaml(yamlSchemaFile);
  const schemaCollection = getSchemaCollection(load);
  const componentSchema = getSchema(schemaCollection, componentName);
  const validator = createSchemaValidator(componentSchema);
  return validator(dataObject);
}

function createStacValidator (stacItem) {
  if (!stacItem.stac_version || !stacItem.id || !stacItem.description || !stacItem.links) throw Error('Missing required fields');
}

function validateStac (stacItem) {
  if (!stacItem) throw new Error('Missing stacItem');
  try {
    createStacValidator(stacItem);
  } catch (e) {
    return false;
  }

  return true;
}

module.exports = {
  loadOpenApiYaml,
  getSchema,
  getSchemaCollection,
  createSchemaValidator,
  validateSchema,
  createStacValidator,
  validateStac
};
