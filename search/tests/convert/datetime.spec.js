const { parseDateTime } = require('../../lib/convert/datetime');

describe('parseDateTime', () => {
  it('makes single datetimes into a range starting and stopping on the same time', () => {
    const dt = '2020-06-01T00:00:00Z';
    expect(parseDateTime(dt)).toBe(`${dt},${dt}`);
  });

  it('datetime range returns as identity', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart},${dtEnd}`;

    expect(parseDateTime(dt)).toBe(dt);
  });
});
