const axios = require('axios');
const { wfs, generateAppUrl } = require('../util');

async function getProviders (event) {
  try {
    const rawProviders = await axios.get('https://cmr.earthdata.nasa.gov/ingest/providers');
    const providers = rawProviders.data;
    const providerList = [];
    for (const provider of providers) {
      console.log(provider)
      const providerId = provider['provider-id']
      providerList.push({
        id: providerId,
        title: provider['short-name'],
        rel: 'provider',
        type: 'application/json',
        links: [
          wfs.createLink('collections', generateAppUrl(event, `/${providerId}/collections`),
            'Collections for this provider'),
          wfs.createLink('search', generateAppUrl(event, `/${providerId}/search`),
            'STAC Search endpoint for this provider')
        ]
      });
    }
    return providerList;
  } catch (error) {
    return error;
  }
}

module.exports = {
  getProviders
};
