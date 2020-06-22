const _ = require('lodash');
const validator = require('../lib/validator');
const exampleData = require('./example-data');

const goodCollection = exampleData.stacColls[0];

const badCollection = _.merge({}, goodCollection, { stac_version: null });

describe('validator', () => {
  it('should throw an error if invalid', async () => {
    let thrown = false;
    try {
      await validator.assertValid(validator.schemas.collection, badCollection);
    } catch (error) {
      thrown = true;
    }
    expect(thrown).toEqual(true);
  });

  it('should not throw an error if valid', async () => {
    await validator.assertValid(validator.schemas.collection, goodCollection);
  });
});
