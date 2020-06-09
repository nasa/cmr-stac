const { getProviders } = require('../../lib/api/provider');

describe('getProviders', () => {
  it.skip('should return an array', async () => {
    const providerList = await getProviders();
    console.log(providerList);
    expect(providerList).toBe('true');
  });
});
