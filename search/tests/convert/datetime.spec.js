const { convertDateTimeToCMR } = require('../../lib/convert/datetime');

describe('parseDateTime', () => {
  it('makes single datetimes into a range starting and stopping on the same time', () => {
    const dt = '2020-06-01T00:00:00Z';
    expect(convertDateTimeToCMR(dt)).toBe('2020-06-01T00:00:00Z,2020-06-02T00:00:00Z');
  });

  it('datetime range returns as identity', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart}/${dtEnd}`;

    expect(convertDateTimeToCMR(dt)).toBe(dt.split('/').join(','));
  });

  it('handles slash delimited datetimes', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart}/${dtEnd}`;

    expect(convertDateTimeToCMR(dt)).toBe(dt.split('/').join(','));
  });

  it('handles comma delimited datetimes', () => {
    const dtStart = '2020-06-01T00:00:00Z';
    const dtEnd = '2020-10-01T00:00:00Z';
    const dt = `${dtStart},${dtEnd}`;

    expect(convertDateTimeToCMR(dt)).toBe(dt);
  });

  it('handles slash delimited dates', () => {
    const dtStart = '2020-06-01';
    const dtEnd = '2020-07-23';
    const dt = `${dtStart}/${dtEnd}`;

    expect(convertDateTimeToCMR(dt)).toBe('2020-06-01T00:00:00Z,2020-07-23T00:00:00Z');
  });

  it('handles comma delimited dates', () => {
    const dtStart = '2018-06-01';
    const dtEnd = '2020-10-01';
    const dt = `${dtStart},${dtEnd}`;

    expect(convertDateTimeToCMR(dt)).toBe('2018-06-01T00:00:00Z,2020-10-01T00:00:00Z');
  });

  it('handles times', () => {
    expect(convertDateTimeToCMR('07:03:21am'))
      .toBe('07:03:21am');
  });

  it('handles ISO 8601 single datetimes', () => {
    expect(convertDateTimeToCMR('2012-10-06T00:00:00+00:00'))
      .toBe('2012-10-06T00:00:00Z,2012-10-07T00:00:00Z');
  });

  it('handles ISO 8601 datetimes ranges', () => {
    expect(convertDateTimeToCMR('2012-10-06T00:00:00+00:00/2013-05-01T00:00:00+00:00'))
      .toBe('2012-10-06T00:00:00Z,2013-05-01T00:00:00Z');
  });

  it('handles malformed dates', () => {
    expect(() => {
      convertDateTimeToCMR('2018-06-0');
    }).toThrowError('Provided datetime value does match any valid date format.');
  });

  it('handles malformed date ranges', () => {
    expect(() => {
      convertDateTimeToCMR('/2018-06-0');
    }).toThrowError('Provided datetime value does match any valid date format.');
  });

  it('does not extend to past midnight of the given date', () => {
    const dt = '2020-06-20T23:50:00Z';

    expect(convertDateTimeToCMR(dt)).toBe('2020-06-20T23:50:00Z,2020-06-21T00:00:00Z');
  });

  it('handles the end of the month correctly', () => {
    const dt = '2020-01-31T23:50:00Z';

    expect(convertDateTimeToCMR(dt)).toBe('2020-01-31T23:50:00Z,2020-02-01T00:00:00Z');
  });

  it('handles the end of the year correctly', () => {
    const dt = '2020-12-31T23:50:00Z';

    expect(convertDateTimeToCMR(dt)).toBe('2020-12-31T23:50:00Z,2021-01-01T00:00:00Z');
  });
});
