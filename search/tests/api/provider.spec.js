const { getProviders } = require('../../lib/api/provider');

describe('getProviders', () => {
  const testEvent = {
    headers: {
      host: 'http://example.com'
    }
  };

  it('should require an event parameter', async () => {
    expect(() => getProviders().resolve()).toThrow();
  });

  it('should return an array', async () => {
    const providerList = await getProviders(testEvent);
    expect(Array.isArray(providerList)).toEqual(true);
  });

  it('should return an array containing at least one object', async () => {
    const providerList = await getProviders(testEvent);
    expect(providerList.length).toBeGreaterThan(0);
    expect(typeof providerList[0]).toBe('object');
  });
});
