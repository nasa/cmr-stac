const { parseDateTime } = require('../../lib/convert/datetime');

describe('parseDateTime', () => {
  it('makes single datetimes into a range starting and stopping on the same time', () => {
    const dt = '2020-06-01T00:00:00Z';
    expect(parseDateTime(dt)).toBe('2020-06-01T00:00:00Z,2020-06-02T00:00:00Z');
  });

  it('datetime range returns as identity', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart}/${dtEnd}`;

    expect(parseDateTime(dt)).toBe(dt.split('/').join(','));
  });

  it('handles slash delimited datetimes', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart}/${dtEnd}`;

    expect(parseDateTime(dt)).toBe(dt.split('/').join(','));
  });

  it('handles comma delimited datetimes', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart},${dtEnd}`;

    expect(parseDateTime(dt)).toBe(dt);
  });

  it('handles slash delimited dates', () => {
    const dtStart = '2020-06-01';
    const dtEnd = '2020-07-23';
    const dt = `${dtStart}/${dtEnd}`;

    expect(parseDateTime(dt)).toBe('2020-06-01T00:00:00Z,2020-07-23T00:00:00Z');
  });

  it('handles comma delimited dates', () => {
    const dtStart = '2018-06-01';
    const dtEnd = '2020-10-01';
    const dt = `${dtStart},${dtEnd}`;

    expect(parseDateTime(dt)).toBe('2018-06-01T00:00:00Z,2020-10-01T00:00:00Z');
  });
});
