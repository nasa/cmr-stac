const path = require('path');
const {
  createSchemaValidator,
  loadOpenApiYaml,
  getSchema,
  getSchemaCollection,
  validateSchema,
  createStacValidator,
  validateStac
} = require('../../lib/validator');

describe('createSchemaValidator', () => {
  const testSchema = {
    properties: {
      name: {
        type: 'string'
      },
      price: {
        type: 'number'
      }
    }
  };

  it('should exist', () => {
    expect(() => createSchemaValidator).toBeDefined();
  });

  it('should require one input parameter', () => {
    expect(() => createSchemaValidator()).toThrow();
  });

  it('return a validation function', () => {
    expect(typeof createSchemaValidator(testSchema)).toEqual('function');
  });

  it('should validate an object', () => {
    const validObj = {
      name: 'coffee',
      price: 2.20
    };
    const validator = createSchemaValidator(testSchema);
    expect(validator(validObj)).toEqual(true);
    expect(validator.errors).toEqual(null);
  });

  it('should invalidate an object', () => {
    const invalidObj = {
      name: 42,
      price: 'hello'
    };
    const validator = createSchemaValidator(testSchema);
    expect(validator(invalidObj)).toEqual(false);
    expect(validator.errors).toEqual(
      [{ keyword: 'type',
        dataPath: '.name',
        schemaPath: '#/properties/name/type',
        params: { type: 'string' },
        message: 'should be string' },
      { keyword: 'type',
        dataPath: '.price',
        schemaPath: '#/properties/price/type',
        params: { type: 'number' },
        message: 'should be number' }]
    );
  });
});

describe('loadOpenApiYaml', () => {
  it('should exist', () => {
    expect(() => loadOpenApiYaml).toBeDefined();
  });

  it('should require a single parameter', () => {
    expect(() => loadOpenApiYaml()).toThrow();
  });

  it('should be able to load a file with a relative path', () => {
    expect(loadOpenApiYaml('../../tests/validator/test.yaml')).toEqual({ test: 'test' });
  });

  it('should be able to accept an absolute path', () => {
    expect(loadOpenApiYaml(path.join(__dirname, '../../tests/validator/test.yaml'))).toEqual({ test: 'test' });
  });
});

describe('getSchemaCollection', () => {
  const validSchema = {
    components: {
      schemas: {
        testComponent: {
          name: {
            type: 'string'
          },
          age: {
            type: 'number'
          }
        },
        testComponent2: {
          price: {
            type: 'number'
          }
        }
      }
    }
  };

  const invalidSchema = {
    test: 'test',
    test2: 'test'
  };

  it('should exist', () => {
    expect(getSchemaCollection).toBeDefined();
  });

  it('should require a schema object with a component collection as a parameter', () => {
    expect(() => getSchemaCollection()).toThrow('Missing schema object');
    expect(() => getSchemaCollection(invalidSchema)).toThrow('Missing component collection');
  });

  it('should return a component collection', () => {
    expect(getSchemaCollection(validSchema)).toEqual({
      testComponent: {
        name: {
          type: 'string'
        },
        age: {
          type: 'number'
        }
      },
      testComponent2: {
        price: {
          type: 'number'
        }
      }
    });
  });
});

describe('getSchema', () => {
  const validTestComponent = 'testComponent';
  const invalidTestComponent = 'testComponent3';
  const testCollection = {
    testComponent: {
      name: {
        type: 'string'
      },
      age: {
        type: 'number'
      }
    },
    testComponent2: {
      price: {
        type: 'number'
      }
    }
  };

  it('should exist', () => {
    expect(getSchema).toBeDefined();
  });

  it('should require a component collection and schema component name as parameters', () => {
    expect(() => getSchema()).toThrow();
    expect(() => getSchema(testCollection)).toThrow();
  });

  it('should require the component to be a key in the collection', () => {
    expect(() => getSchema(testCollection, invalidTestComponent)).toThrow('Component not found in collection');
    expect(() => getSchema(testCollection, validTestComponent)).not.toThrow();
  });

  it('should return the schema for the given component', () => {
    expect(getSchema(testCollection, validTestComponent)).toEqual({
      name: {
        type: 'string'
      },
      age: {
        type: 'number'
      }
    });
  });
});

describe('validateSchema', () => {
  const testBbox = [-110, 39.5, -105, 40.5];

  it('should exist', () => {
    expect(validateSchema).toBeDefined();
  });

  it('should take in a componentName and collectionObject as parameters', () => {
    expect(() => validateSchema()).toThrow();
  });

  it('should take in a OA/STAC component name and a collection object and return a boolean', () => {
    expect(typeof validateSchema('bbox', testBbox)).toEqual('boolean');
  });

  it('should validate the test object against the schema for the given component', () => {
    expect(validateSchema('bbox', testBbox)).toEqual(true);
  });
});

describe('createStacValidator', () => {
  it('should exist', () => {
    expect(createStacValidator).toBeDefined();
  });

  it('should take in a stacItem as a parameter', () => {
    expect(() => createStacValidator()).toThrow();
  });
});

describe('validateStac', () => {
  const validStacFeature = {
    stac_version: '0.8.0',
    id: '1',
    description: 'description',
    links: []
  };

  const invalidStacFeature = {
    stac_version: '0.8.0',
    id: '1',
    description: '',
    links: []
  };

  it('should exist', () => {
    expect(validateStac).toBeDefined();
  });

  it('should take in a stacItem as a parameter', () => {
    expect(() => validateStac()).toThrow();
  });

  it('should take in a stacItem and return a boolean', () => {
    expect(typeof validateStac(validStacFeature)).toEqual('boolean');
  });

  it('should check for required fields', () => {
    expect(validateStac(invalidStacFeature)).toEqual(false);
  });

  it('should validate a stacItem with required fields', () => {
    expect(validateStac(validStacFeature)).toEqual(true);
  });
});
