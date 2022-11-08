const ISO_8601_DATE_RX = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})[+-](\d{2}):(\d{2})$/;
const RFC_3339_RX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

const splitOnDelimiters = (str: string, delimiters: Array<string>) => {
    let splits: any;
  
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

const isValidDateFormat = (dates: Array<string>) => {
    if(dates.length > 2) {
        return false;
    }
    let isValid = true;
    dates.forEach(date => {
        if(!(RFC_3339_RX.test(date) || ISO_8601_DATE_RX.test(date) || date === '..')) {
            isValid = false;
        }
    });
    return isValid;
}

export const convertDateTime = (dateTime?: any) => {
    if(!dateTime) {
        return "";
    }
    const dateTimeString = dateTime;
    const dateTimeArray = splitOnDelimiters(dateTimeString, [',', '/']);

    if(dateTimeArray.length === 1) {
        if(dateTimeArray[0].substring(dateTimeArray[0].length - 2, dateTimeArray[0].length) === '..') {
            return dateTimeArray[0].substring(0, dateTimeArray[0].length - 2);
        } else {
            return `${dateTimeArray[0]}/${dateTimeArray[0]}`;
        }
    }

    if(dateTimeArray.length === 2) {
        if(dateTimeArray[0] === '..') {
            return `0000-12-31/${dateTimeArray[1]}`;
        }
        if(dateTimeArray[1] === '..') {
            return `${dateTimeArray[0]}/9999-12-31`;
        }
    }

    return dateTimeString;
}

export const validDateTime = (dateTimeString?: string) => {
    if(!dateTimeString) {
        return true;
    }
    const dates = splitOnDelimiters(dateTimeString, [',', '/']);
    if(!isValidDateFormat(dates)) {
        return false;
    }
    return true;
}

