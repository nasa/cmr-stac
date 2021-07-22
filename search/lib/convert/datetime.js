const ISO_8601_DATE_RX = new RegExp(
  '(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2}):(\\d{2})[+-](\\d{2}):(\\d{2})');
const DATE_TIME_RX = new RegExp('\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{2,4})?Z');
const DATE_RX = new RegExp('\\d{4}-\\d{2}-\\d{2}');
const TIME_RX = new RegExp('\\d{2}:\\d{2}:\\d{2}([a|p]m)?', 'i');

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
 * Handle single date case. End on the same day even if given a time.
 */
function handleSingleDate (dateTimes) {
  const beginDate = new Date(dateTimes[0]);

  const begin = beginDate.toISOString().replace('.000', '');

  const endDate = new Date(beginDate);
  endDate.setDate(endDate.getDate() + 1);
  endDate.setUTCHours(0);
  endDate.setMinutes(0);
  endDate.setSeconds(0);
  endDate.setMilliseconds(0);

  const end = endDate.toISOString().replace('.000', '');

  return { begin, end };
}

/**
 * Handle a given range, only convert to valid CMR query string.
 */
function handleDateRange (dateTimes) {
  const beginDate = new Date(dateTimes[0]);
  const begin = beginDate.toISOString().replace('.000', '');

  const endDate = new Date(dateTimes[1]);
  const end = endDate.toISOString().replace('.000', '');

  return { begin, end };
}

/**
 * Convert a datetime to a temporal range value.
 * If a single datetime is given, duplicate it to be the end of the range.
 * @param dateTimes
 * @returns {*}
 */
function parseDateTimeHelper (dateTimes) {
  let range;
  if (dateTimes.length === 1) {
    range = handleSingleDate(dateTimes);
  } else {
    range = handleDateRange(dateTimes);
  }
  return `${range.begin},${range.end}`;
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
    const beginDate = new Date(dates[0]);

    // DST may alter expected outputs by an hour
    begin = beginDate.toISOString().replace('.000', '');

    const endDate = new Date(beginDate);
    endDate.setDate(endDate.getDate() + 1);
    end = endDate.toISOString().replace('.000', '');
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
 * @param dateTime
 * @returns {string}
 */
function convertDateTimeToCMR (dateTime) {
  const dates = splitOnDelimiters(dateTime, [',', '/']);

  let output;
  if (DATE_TIME_RX.test(dates[0]) || ISO_8601_DATE_RX.test(dates[0])) {
    output = parseDateTimeHelper(dates);
  } else if (DATE_RX.test(dates[0])) {
    output = parseDateHelper(dates);
  } else if (TIME_RX.test(dates[0])) {
    // identity
    output = dateTime;
  } else {
    throw new Error('Provided datetime value does match any valid date format.');
  }
  return output;
}

module.exports = {
  convertDateTimeToCMR
};
