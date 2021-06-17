const { firstIfArray } = require('../../lib/util');
const { extractParam } = require('../../lib/util');
const { generateAppUrl } = require('../../lib/util');
const settings = require('../../lib/settings');

describe('firstIfArray', () => {
  it('should return value if not an array.', () => {
    expect(firstIfArray('test')).toBe('test');
  });

  it('should return value if not a single element array.', () => {
    expect(firstIfArray([])).toEqual([]);
    expect(firstIfArray([1, 2])).toEqual([1, 2]);
  });

  it('should return the first element if single element array.', () => {
    expect(firstIfArray([1])).toBe(1);
  });
});

describe('extractParam', () => {
  it('should return the default value if requested param does not exist.', () => {
    expect(extractParam({}, 'test', 'default')).toBe('default');
  });

  it('should return the param if it exists.', () => {
    expect(extractParam({ test: 'value' }, 'test', 'default')).toBe('value');
  });

  it('should return the first value of array in param.', () => {
    expect(extractParam({ test: ['value'] }, 'test', 'default')).toBe('value');
  });
});

describe('generateAppUrl', () => {
  let event, path, params;

  beforeEach(() => {
    event = { headers: { Host: 'example.com' } };
    path = '/path/to/resource';
    params = { param: 'test' };
  });

  it('should create a URL based on event input.', () => {
    expect(generateAppUrl(event, path)).toBe('https://example.com/stac/path/to/resource');
  });

  it('should create a URL based on event input with proper query params.', () => {
    expect(generateAppUrl(event, path, params))
      .toBe('https://example.com/stac/path/to/resource?param=test');
  });

  it('should create a insecure url if http protocol in settings.', () => {
    settings.protocol = 'http';
    expect(generateAppUrl(event, path))
      .toBe('http://example.com/stac/path/to/resource');
  });
});
