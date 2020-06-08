const axios = require('axios');
const { generateAppUrl } = require('../util');

async function getProviders (event) {
  try {
    const rawProviders = await axios.get('https://cmr.earthdata.nasa.gov/ingest/providers');
    const providers = rawProviders.data;
    const providerList = [];
    for (const provider of providers) {
      providerList.push({
        id: provider['provider-id'],
        title: provider['short-name'],
        rel: 'provider',
        href: generateAppUrl(event, `/${provider['provider-id']}`),
        type: 'application/json'
      });
    }
    return providerList;
  } catch (error) {
    return error;
  }
}

// function providerLink(provider) {
//
// }

module.exports = {
  getProviders
};
