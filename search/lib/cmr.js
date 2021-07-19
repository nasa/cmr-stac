const _ = require('lodash');
const axios = require('axios');
const {
  logger,
  makeCmrSearchUrl,
  toArray
} = require('./util');
const settings = require('./settings');

const {
  convertDateTimeToCMR
} = require('./convert/datetime');
const NodeCache = require('node-cache');
const myCache = new NodeCache();
const Promise = require('bluebird');

const STAC_SEARCH_PARAMS_CONVERSION_MAP = {
  bbox: ['bounding_box', _.toString],
  datetime: ['temporal', convertDateTimeToCMR],
  intersects: ['polygon', (v) => _.flattenDeep(_.first(v.coordinates)).join(',')],
  limit: ['page_size', _.identity],
  page: ['page_num', _.identity],
  collections: ['collection_concept_id', toArray],
  ids: ['granule_ur', toArray]
};

const DEFAULT_HEADERS = {
  'Client-Id': 'cmr-stac-api-proxy'
};

/**
 * Query a CMR Search endpoint with optional parameters
 * @param {string} path CMR path to append to search URL (e.g., granules.json, collections.json)
 * @param {object} params Set of CMR parameters
 */
async function cmrSearch (path, params) {
  // should be search path (e.g., granules.json, collections, etc)
  if (!path) throw new Error('Missing url');
  if (!params) throw new Error('Missing parameters');
  const url = makeCmrSearchUrl(path);
  logger.debug(`CMR Search: ${url} with params: ${JSON.stringify(params)}`);
  return axios.get(url, { params, headers: DEFAULT_HEADERS });
}

/**
 * Query a CMR Search endpoint with optional parameters using POST
 * @param {string} path CMR path to append to search URL (e.g., granules.json, collections.json)
 * @param {object} params Set of CMR parameters
 */
async function cmrSearchPost (path, params) {
  // should be search path (e.g., granules.json, collections, etc)
  if (!path) throw new Error('Missing url');
  if (!params) throw new Error('Missing parameters');
  const url = makeCmrSearchUrl(path);
  return axios.post(url, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
}

/**
 * Get list of providers
 */
async function getProviderList () {
  const providerUrl = `${settings.cmrUrl}/ingest/providers`;
  const rawProviders = await axios.get(providerUrl);
  return rawProviders.data;
}

/**
 * Get set of collections for provider
 * @param {string} providerId The CMR Provider ID
 */
async function getProvider (providerId) {
  const response = await cmrSearch('provider_holdings.json', { providerId });
  return response.data;
}

/**
 * Search CMR for collections matching query parameters
 * @param {object} params CMR Query parameters
 */
async function findCollections (params = {}) {
  const response = await cmrSearch('/collections.json', params);
  return response.data.feed.entry;
}

/**
 * Search CMR for granules matching CMR query parameters
 * @param {object} params Object of CMR Search parameters
 */
async function findGranules (params = {}) {
  let response, responseUmm;
  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    response = await cmrSearchPost('/granules.json', params);
  } else {
    response = await cmrSearch('/granules.json', params);
  }
  const granules = response.data.feed.entry.reduce(
    (obj, item) => ({
      ...obj,
      [item.id]: item
    }),
    {}
  );
  // get UMM version
  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    responseUmm = await cmrSearchPost('/granules.umm_json', params);
  } else {
    responseUmm = await cmrSearch('/granules.umm_json', params);
  }
  if (_.has(responseUmm.data, 'items')) {
    // associate and add UMM granule to standard granule
    responseUmm.data.items.forEach((g) => {
      granules[g.meta['concept-id']].meta = g.meta;
      granules[g.meta['concept-id']].umm = g.umm;
    });
  }
  // get total number of hits for this query from the returned header
  const hits = _.get(response, 'headers.cmr-hits', granules.length);
  return { granules: Object.values(granules), hits: hits };
}

/**
 * Convert a STAC Collection ID to set of CMR query parameters
 * @param {string} providerId The CMR Provider ID
 * @param {string} collectionId The STAC Collection ID
 */
function stacCollectionToCmrParams (providerId, collectionId) {
  const parts = collectionId.split('.v');
  if (parts.length < 2) {
    return null;
  }
  const version = parts.pop();
  const shortName = parts.join('.');
  const cmrParams = {
    provider_id: providerId,
    short_name: shortName,
    version
  };
  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    cmrParams.tag_key = 'gov.nasa.earthdatacloud.s3';
  }
  return cmrParams;
}

/**
 * Map STAC Collection ID to CMR Collection ID - uses cache to save mappings
 * @param {string} providerId CMR Provider ID
 * @param {string} stacId A STAC COllection ID
 */
async function stacIdToCmrCollectionId (providerId, stacId) {
  let collectionId = myCache.get(stacId);
  if (collectionId) {
    return collectionId;
  }
  const cmrParams = stacCollectionToCmrParams(providerId, stacId);
  let collections = [];
  if (cmrParams) {
    collections = await findCollections(cmrParams);
  }
  if (collections.length === 0) {
    return null;
  } else {
    collectionId = collections[0].id;
    myCache.set(stacId, collectionId, settings.cacheTtl);
    return collectionId;
  }
}

/**
 * Map CMR Collection ID to STAC Collection ID - uses cache to save mappings
 * @param {string} providerId CMR Provider ID
 * @param {string} collectionId CMR Collection ID
 */
function cmrCollectionToStacId (shortName, version = null) {
  const collectionId = `${shortName}.v${version}`;
  return collectionId;
}

function getFacetParams (year, month, day) {
  // add temporal facet specific paramters
  const facetParams = {
    include_facets: 'v2',
    page_size: 0
  };
  if (year) {
    facetParams[`temporal_facet[0][year]`] = year;
  }
  if (month) {
    facetParams[`temporal_facet[0][month]`] = month;
  }
  if (day) {
    facetParams[`temporal_facet[0][day]`] = day;
    facetParams.page_size = 1000;
  }
  return facetParams;
}

async function getGranuleTemporalFacets (params = {}, year, month, day) {
  const { tag_key, ...cmrParams } = Object.assign(params, getFacetParams(year, month, day));

  const facets = {
    years: [],
    months: [],
    days: [],
    itemids: []
  };
  const response = await cmrSearch('/granules.json', cmrParams);
  const cmrFacets = response.data.feed.facets;
  if (!cmrFacets.has_children) {
    return facets;
  }

  const temporalFacets = cmrFacets.children.find(f => f.title === 'Temporal');
  // always a year facet
  const yearFacet = temporalFacets.children.find(f => f.title === 'Year');
  const years = yearFacet.children.map(y => y.title);
  facets.years = years;
  if (year) {
    // if year provided, get months
    const monthFacet = yearFacet
      .children.find(y => y.title === year)
      .children.find(y => y.title === 'Month');
    const months = monthFacet.children.map(y => y.title);
    facets.months = months;
    if (month) {
      // if month also provided, get days
      const days = monthFacet
        .children.find(y => y.title === month)
        .children.find(y => y.title === 'Day')
        .children.map(y => y.title);
      facets.days = days;
    }
    if (day) {
      const itemids = response.data.feed.entry.map(i => i.id);
      facets.itemids = itemids;
    }
  }

  return facets;
}

/**
 * Patch for Object.fromEntries which is introduced in NodeJS 12.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries
 * @param entries Array of Name/Value pairs to be converted to object. e.g. [["name", "value"]]
 * @returns object e.g. {name: "value"}
 */
function fromEntries (entries) {
  if (!entries) throw new Error('Missing entries!');

  return entries.reduce((obj, entry) => {
    obj[entry[0]] = entry[1];
    return obj;
  }, {});
}

/**
 * Converts STAC parameter to equivalent CMR parameter
 * @param {string} providerId CMR Provider ID
 * @param {string} key The STAC field name
 * @param {string} value The STAC value
 */
async function convertParam (providerId, key, value) {
  // Invalid STAC parameter
  if (!Object.keys(STAC_SEARCH_PARAMS_CONVERSION_MAP).includes(key)) {
    throw new Error(`Unsupported parameter ${key}`);
  }
  if (key === 'limit' && value > settings.maxLimit) {
    throw new Error(`Maximum limit parameter of ${settings.maxLimit}`);
  }
  // If collection parameter need to translate to CMR parameter
  if (key === 'collections') {
    // async map to do collection ID conversions in parallel
    const collections = await Promise.reduce(toArray(value), async (result, v) => {
      const collectionId = await stacIdToCmrCollectionId(providerId, v);
      // if valid collection, return CMR ID for it
      if (collectionId) {
        result.push(collectionId);
      }
      return result;
    }, []);
    if (collections.length === 0) {
      return [];
    } else {
      return ['collection_concept_id', collections];
    }
  } else {
    const [newName, converter] = STAC_SEARCH_PARAMS_CONVERSION_MAP[key];
    return [newName, converter(value)];
  }
}

/**
 * Converts STAC parameters to CMR parameters
 * @param {string} providerId CMR Provider ID
 * @param {object} params STAC parameters
 */
async function convertParams (providerId, params = {}) {
  try {
    // async map to do all param conversions in parallel
    const converted = await Promise.reduce(Object.entries(params), async (result, [k, v]) => {
      const param = await convertParam(providerId, k, v);
      if (param.length === 2) {
        result.push(param);
      }
      return result;
    }, []);
    logger.debug(`Params: ${JSON.stringify(params)}`);
    logger.debug(`Converted Params: ${JSON.stringify(converted)}`);
    return Object.assign({ provider: providerId }, fromEntries(converted));
  } catch (error) {
    logger.error(error.message);
    if (settings.throwCmrConvertParamErrors) {
      throw error;
    }
  }
}

module.exports = {
  cmrSearch,
  getProvider,
  getProviderList,
  findCollections,
  findGranules,
  stacCollectionToCmrParams,
  stacIdToCmrCollectionId,
  cmrCollectionToStacId,
  getFacetParams,
  getGranuleTemporalFacets,
  convertParams
};
