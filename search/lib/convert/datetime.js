const DATE_TIME_RX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/;

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
 * Converts a datetime string to a CMR temporal range.
 * If the value is a time, identity.
 * If the value is a datetime => CMR range
 */
function parseDateTime (dt) {
  const dts = dt.split(',');

  let rc;
  if (dts[0].match(DATE_TIME_RX)) {
    rc = parseDateTimeHelper(dt);
  } else {
    rc = dt;
  }
  return rc;
}

module.exports = {
  parseDateTime
};
