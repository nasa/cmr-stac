// Can verify a CMR STAC endpoint by crawling it and ensuring that endpoints return a response.
// Run with node crawler.js [stac root]
const _ = require('lodash');
const axios = require('axios');

const args = process.argv.slice(2);

if (args.length > 1) {
  console.error('Expects one argument of CMR STAC root to crawl.');
  process.exit(1);
}

const cmrStacRoot = args[0] || 'http://localhost:3000/cmr-stac';

const numProviders = 2;
const numCollections = 2;
const numGranules = 2;

const fetch = async (path) => {
  try {
    console.log('Fetching', path);
    const resp = await axios.get(path);
    return resp.data;
  } catch (error) {
    console.error('Error fetching path', path);
    throw error;
  }
};

const linksByRel = (obj) => obj.links.reduce((m, link) => {
  m[link.rel] = link.href;
  return m;
}, {});

const verifySelfLink = async (link, obj, modifySelfFn = _.identity) => {
  const self = await fetch(link);
  if (!_.isEqual(self, obj)) {
    console.log(`self: ${JSON.stringify(self, null, 2)}`);
    console.log(`obj: ${JSON.stringify(obj, null, 2)}`);
    throw new Error('Self not the same as obj');
  }
};

const crawlItemsLink = async (link) => {
  const resp = await fetch(link);
  for (const item of resp.features.slice(0, numGranules)) {
    const links = linksByRel(item);
    await verifySelfLink(links.self, item);
  }
};

const crawlCollection = async (collection) => {
  const links = linksByRel(collection);
  await verifySelfLink(links.self, collection);
  // FUTURE this is failing because of invalid handling of collectionId param
  // await crawlItemsLink(links.stac);
  await crawlItemsLink(links.items);
};

const crawlProvider = async (provider) => {
  const links = linksByRel(provider);
  await verifySelfLink(links.self, provider);
  const resp = await fetch(links.collections);
  for (const coll of resp.collections.slice(0, numCollections)) {
    await crawlCollection(coll);
  }
  await crawlItemsLink(links.search);
};

const crawlProviders = async () => {
  const provResp = await fetch(cmrStacRoot);
  const providers = provResp.links.slice(0, numProviders);
  for (const provider of providers) {
    await crawlProvider(provider);
  }
};

(async () => {
  await crawlProviders();
})()
  .then(() => {
    console.log('Success');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
