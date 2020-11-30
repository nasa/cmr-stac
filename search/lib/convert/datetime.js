const DATE_TIME_RX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{2:4})?Z/;
const DATE_RX = /\d{4}-\d{2}-\d{2}/;

/**
 * Convert a datetime to a temporal range value.
 * If a single datetime is given, duplicate it to be the end of the range.
 */
function parseDateTimeHelper (dt) {
  const dts = dt.split(',');
  if (dts.length === 1) {
    dts.push(dts[0]);
  }
  return dts.join(',');
}

/**
 * Convert a date to a temporal range value.
 * If a single date is given, duplicate it to be the end of the range.
 */
function parseDateHelper (dt) {
  const dts = dt.split(',');
  let begin, end;
  if (dts.length === 1) {
    const date = new Date(dts[0]);

    // DST may alter expected outputs by an hour
    begin = date.toISOString();
    date.setDate(date.getDate() + 1);
    end = date.toISOString();

    begin = begin.replace('.000', '');
    end = end.replace('.000', '');
  } else {
    begin = `${dts[0]}T00:00:00Z`;
    end = `${dts[1]}T00:00:00Z`;
  }
  return `${begin},${end}`;
}

/**
 * Converts a datetime string to a CMR temporal range.
 * If the value is a time, identity.
 * If the value is a datetime => CMR range
 */
function parseDateTime (dt) {
  const dts = dt.split(',');

  let rc;
  if (dts[0].match(DATE_TIME_RX)) {
    rc = parseDateTimeHelper(dt);
  } else if (dts[0].match(DATE_RX)) {
    rc = parseDateHelper(dt);
  } else {
    // identity
    rc = dt;
  }
  return rc;
}

module.exports = {
  parseDateTime
};
