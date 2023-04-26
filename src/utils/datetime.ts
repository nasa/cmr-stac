const ISO_8601_DATE_RX =
  /^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d[,.]\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/i;

const RFC_3339_RX = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)Z$/i;

const dateOnlyRx = /^\d{4}-\d{2}-\d{2}$/;

const validTimeZoneRx = /[+-]?(\d{2}:\d{2})$|Z$/i;

const splitOnDelimiters = (str: string, delimiters: string[]) => {
  const splits = delimiters
    .filter((delimiter) => str.indexOf(delimiter) !== -1)
    .flatMap((delimiter) => str.split(delimiter));

  if (!splits.length) return [str];
  return splits;
};

const isValidDate = (date: string) => {
  if (date === "" || date === "..") return true;

  if (dateOnlyRx.test(date)) return false;
  if (!validTimeZoneRx.test(date)) return false;
  if (!(ISO_8601_DATE_RX.test(date) || RFC_3339_RX.test(date))) return false;

  return !Number.isNaN(new Date(date).getTime());
};

export const dateTimeToRange = (dateTime?: string) => {
  if (!dateTime) return;

  const dateTimeArray = splitOnDelimiters(dateTime, [",", "/"]);

  if (dateTimeArray.length === 1) {
    if (dateTimeArray[0].substring(dateTimeArray[0].length - 2, dateTimeArray[0].length) === "..") {
      return dateTimeArray[0].substring(0, dateTimeArray[0].length - 2);
    } else {
      return `${dateTimeArray[0]}/${dateTimeArray[0]}`;
    }
  }

  if (dateTimeArray.length === 2) {
    if (dateTimeArray[0] === "..") {
      return `0000-12-31T00:00:00.00Z/${dateTimeArray[1]}`;
    }
    if (dateTimeArray[1] === "..") {
      return `${dateTimeArray[0]}/9999-12-31T23:59:59.999Z`;
    }
  }

  return dateTime;
};

const invalidUnboundRanges = ["/", "../..", "/..", "../"];

const isValidRange = (dates: string[]) => {
  const [start, end] = dates;

  if (!start || start === ".." || start === "") return true;
  if (!end || end === ".." || end === "") return true;

  return Number(new Date(end)) - Number(new Date(start)) > 0;
};

export const validDateTime = (dateTimeString?: string) => {
  if (!dateTimeString) return;
  if (invalidUnboundRanges.find((invalid) => invalid === dateTimeString)) return false;

  const dates = splitOnDelimiters(dateTimeString, [",", "/"]);
  if (dates.length > 2) return false;

  return dates.reduce((validAcc, d) => validAcc && isValidDate(d), true) && isValidRange(dates);
};
