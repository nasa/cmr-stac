const { prepare, InvalidSortPropertyError } = require('../../../lib/stac/extensions/sort');

/**
 * @jest-environment node
 */
describe('STAC API sort extension', () => {
  describe('prepare()', () => {
    it('strips the sortby param', () => {
      expect(
        prepare({ sortby: 'short_name' }).sortby
      ).toBeUndefined();
      expect(
        prepare({ sortby: {} }).sortby
      ).toBeUndefined();
    });
    it('is a noop if no argument is given', () => {
      expect(
        prepare({ anotherParam: '123' })
      ).toEqual({ anotherParam: '123' });
    });

    describe('given a string', () => {
      it('returns a sort argument for CMR', async () => {
        expect(
          prepare({ sortby: 'short_name' })
        ).toEqual(
          { sort_key: ['+short_name'] }
        );
      });

      it('manages sorting by multiple properties', async () => {
        expect(
          prepare({ sortby: 'short_name,-properties.start_datetime,+properties.end_datetime' })
        ).toEqual(
          { sort_key: ['+short_name', '-start_date', '+end_date'] }
        );
      });

      it('raises an error given a bad property', async () => {
        expect(
          () => prepare({ sortby: 'wack-property,-properties.start_datetime' })
        ).toThrow(InvalidSortPropertyError);
      });
    });

    describe('given an object', () => {
      it('returns a sort argument for CMR', async () => {
        expect(
          prepare({ sortby: [{ field: 'short_name', direction: 'asc' }] })
        ).toEqual(
          { sort_key: ['+short_name'] }
        );
      });

      it('raises an error given a bad property', async () => {
        expect(
          () => prepare({ sortby: [{ field: 'short_name', direction: 'desc' }, {
            field: 'not-a-real-field',
            direction: 'asc'
          }] })
        ).toThrow(InvalidSortPropertyError);
      });

      it('manages sorting by multiple properties', async () => {
        expect(
          prepare({
            sortby: [{ field: 'short_name', direction: 'desc' }, {
              field: 'properties.start_datetime',
              direction: 'asc'
            }]
          })
        ).toEqual(
          { sort_key: ['-short_name', '+start_date'] }
        );
      });
    });
  });
});
