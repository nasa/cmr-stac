const { prepare } = require('../../../lib/stac/extensions/query');

/**
 * @jest-environment node
 */
describe('STAC API query extension', () => {
  describe('prepare()', () => {
    it('strips the query param', () => {
      expect(
        prepare({ query: { 'eo:cloud_cover': { gte: 0, lte: 100 } } }).query
      ).toBeUndefined();
      expect(
        prepare({ query: {} }).query
      ).toBeUndefined();
    });

    it('is a noop if no argument is given', () => {
      expect(
        prepare({ anotherParam: '123' })
      ).toEqual({ anotherParam: '123' });
    });

    describe('given an eo:cloud_cover query object', () => {
      it('returns a cloud_cover argument for CMR', async () => {
        expect(
          prepare({ query: { 'eo:cloud_cover': { gte: 0, lte: 100 } } })
        ).toEqual(
          { cloud_cover: '0,100' }
        );
      });
    });
  });
});
