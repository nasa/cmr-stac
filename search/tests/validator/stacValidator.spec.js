const { validateStac } = require('../../lib/validator');

describe('stacValidator', () => {
  describe('validateStac', () => {
    const validStacFeatureCollection = {
      features: [
        {
          stac_version: '0.8.0',
          id: '1',
          description: 'description',
          links: [{ ref: 'test' }]
        }
      ]
    };

    const invalidStacFeatureCollection = {
      features: [
        {
          stac_version: '0.8.0',
          id: '1',
          description: ''
        }
      ]
    };

    it('should exist', () => {
      expect(validateStac).toBeDefined();
    });

    it('should take in a stacItem as a parameter', () => {
      expect(() => validateStac()).toThrow();
    });

    it('should take in a stacItem and return a boolean', () => {
      expect(typeof validateStac(validStacFeatureCollection)).toEqual('boolean');
    });

    it('should check for required fields', () => {
      expect(validateStac(invalidStacFeatureCollection)).toEqual(false);
    });

    it('should validate a stacItem with required fields', () => {
      expect(validateStac(validStacFeatureCollection)).toEqual(true);
    });
  });
});
