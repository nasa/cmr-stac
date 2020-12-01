const DATE_TIME_RX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{2:4})?Z/;
const DATE_RX = /\d{4}-\d{2}-\d{2}/;

/**
 * Split a string on the first delimiter found. Returns the list of splits.
 * @param str
 * @param delimiters
 * @returns {*[]}
 */
function splitOnDelimiters (str, delimiters) {
  let splits;

  delimiters.forEach((d) => {
    if (!splits && str.indexOf(d) !== -1) {
      splits = str.split(d);
    }
  });

  if (!splits) {
    splits = [str];
  }
  return splits;
}

/**
 * Convert a datetime to a temporal range value.
 * If a single datetime is given, duplicate it to be the end of the range.
 * @param dateTimes
 * @returns {*}
 */
function parseDateTimeHelper (dateTimes) {
  let rc;
  if (dateTimes.length === 1) {
    const date = new Date(dateTimes[0]);

    const begin = date.toISOString().replace('.000', '');
    date.setDate(date.getDate() + 1);
    const end = date.toISOString().replace('.000', '');
    dateTimes.push(end);

    rc = `${begin},${end}`;
  } else {
    rc = dateTimes.join(',');
  }
  return rc;
}

/**
 * Convert a date to a temporal range value.
 * If a single date is given, duplicate it to be the end of the range.
 * @param dates Array of dates, only the first 2 are used
 * @returns {string}
 */
function parseDateHelper (dates) {
  let begin, end;
  if (dates.length === 1) {
    const date = new Date(dates[0]);

    // DST may alter expected outputs by an hour
    begin = date.toISOString().replace('.000', '');
    date.setDate(date.getDate() + 1);
    end = date.toISOString().replace('.000', '');
  } else {
    begin = `${dates[0]}T00:00:00Z`;
    end = `${dates[1]}T00:00:00Z`;
  }
  return `${begin},${end}`;
}

/**
 * Converts a datetime string to a CMR temporal range.
 * If the value is a time, identity.
 * If the value is a datetime => CMR range
 */
function parseDateTime (dt) {
  const dates = splitOnDelimiters(dt, [',', '/']);

  let rc;
  if (dates[0].match(DATE_TIME_RX)) {
    rc = parseDateTimeHelper(dates);
  } else if (dates[0].match(DATE_RX)) {
    rc = parseDateHelper(dates);
  } else {
    // identity
    rc = dt;
  }
  return rc;
}

module.exports = {
  parseDateTime
};
