const { validateStac } = require('../../lib/validator');

describe('stacValidator', () => {
  describe('validateStac', () => {
    const validStacFeature = {
      stac_version: '1.0.0-beta.1',
      id: '1',
      description: 'description',
      links: []
    };

    const invalidStacFeature = {
      stac_version: '1.0.0-beta.1',
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
});
