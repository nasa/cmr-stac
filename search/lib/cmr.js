const _ = require('lodash');
const axios = require('axios');
const settings = require('./settings');
const {
  logger,
  makeCmrSearchLbUrl,
  toArray
} = require('./util');

const {
  cacheConcept,
  cacheConceptId,
  cacheSearchAfter,
  getCachedConcept,
  getCachedConceptId,
  getSearchAfterParams
} = require('./cache');

const {
  convertDateTimeToCMR
} = require('./convert/datetime');
const {
  convertGeometryToCMR
} = require('./convert/coordinate');

const Promise = require('bluebird');

const STAC_SEARCH_PARAMS_CONVERSION_MAP = {
  bbox: (v) => [['bounding_box', _.toString(v)]],
  datetime: (v) => [['temporal', convertDateTimeToCMR(v)]],
  intersects: convertGeometryToCMR,
  limit: (v) => [['page_size', _.identity(v)]],
  page: (v) => [['page_num', _.identity(v)]],
  collections: (v) => [['collection_concept_id', toArray(v)]],
  ids: (v) => [['granule_ur', toArray(v)]]
};

const DEFAULT_HEADERS = {
  'Client-Id': settings.clientId
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
  const url = makeCmrSearchLbUrl(path);

  const [saParams, saHeaders] = await getSearchAfterParams(params, DEFAULT_HEADERS);
  logger.info(`GET CMR [${path}][${JSON.stringify(saParams)}][${JSON.stringify(saHeaders)}]`);
  const response = await axios.get(url, {
    params: saParams,
    headers: saHeaders
  });

  await cacheSearchAfter(params, response);
  return response;
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

  const url = makeCmrSearchLbUrl(path);
  const headers = Object.assign({}, DEFAULT_HEADERS, {
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  const [saParams, saHeaders] = await getSearchAfterParams(params, headers);

  logger.info(`POST CMR [${path}][${JSON.stringify(saParams)}][${JSON.stringify(saHeaders)}]`);
  const response = await axios.post(url, saParams, { headers: saHeaders });
  if (response.headers['cmr-search-after']) {
    cacheSearchAfter(params, response);
  }
  return response;
}

/**
 * Get list of providers
 */
async function getProviderList () {
  let ingestUrl = '/ingest';
  if (settings.cmrLbUrl.includes('localhost')) {
    ingestUrl = ':3002';
  }
  const providerUrl = `${settings.cmrLbUrl}${ingestUrl}/providers`;
  const rawProviders = await axios.get(providerUrl);
  return rawProviders.data;
}

/**
 * Get set of collections for provider
 * @param {string} providerId The CMR Provider ID
 */
async function getProvider (providerId) {
  logger.debug(`getProvider [${providerId}]`);
  const response = await cmrSearch('provider_holdings.json', { providerId });
  return response.data;
}

/**
 * Search CMR for collections matching query parameters
 * @param {object} params CMR Query parameters
 */
async function findCollections (params = {}) {
  logger.debug(`findCollections [${JSON.stringify(params)}]`);
  const response = await cmrSearch('/collections.json', params);
  return response.data.feed.entry;
}

/**
 * Fetch a concept from CMR by conceptId.
 * Will use a cached version of the concept if available.
 */
async function fetchConcept (cmrConceptId, opts = {format: "json"}) {
  logger.debug(`fetchConcept [${cmrConceptId}][${JSON.stringify(opts)}]`);
  let cachedConcept = await getCachedConcept(cmrConceptId);
  if (cachedConcept) {
    return cachedConcept;
  }

  const { format } = opts;
  const extraOpts = Object.assign({}, opts);
  delete extraOpts.format;

  const response = await cmrSearch(`/concepts/${cmrConceptId}.${format}`, extraOpts);
  logger.info(response.data);
  logger.info(response.headers);
  logger.info(response.status);

  if (response.status === 200) {
    await cacheConcept(cmrConceptId, response.data);
    return response.data;
  }
  return null;
}

/**
 * Search CMR for granules in UMM_JSON format
 */
async function getGranulesUmmResponse(params = {}, opts = settings) {
  if (opts.cmrStacRelativeRootUrl === '/cloudstac') {
    return await cmrSearchPost('/granules.umm_json', params);
  }
  return await cmrSearch('/granules.umm_json', params);
}

/**
 * Search CMR for granules in JSON format.
 */
async function getGranulesJsonResponse(params = {}, opts = settings) {
  if (opts.cmrStacRelativeRootUrl === '/cloudstac') {
    return await cmrSearchPost('/granules.json', params);
  }
  return await cmrSearch('/granules.json', params);
}

/**
 * Merge a list of umm and json formatted granules into a list of STAC granules.
 */
function buildStacGranules(jsonGranules = [], ummGranules = []) {
  const granules = jsonGranules.reduce(
    (obj, item) => ({
      ...obj,
      [item.id]: item
    }),
    {}
  );
  ummGranules.forEach((g) => {
    granules[g.meta['concept-id']].meta = g.meta;
    granules[g.meta['concept-id']].umm = g.umm;
  });

  return granules;
}
/**
 * Search CMR for granules matching CMR query parameters
 * @param {object} params Object of CMR Search parameters
 */
async function findGranules (params = {}) {
  // TODO convert this to single call to graphQL
  const jsonResponse = await getGranulesJsonResponse(params);
  const ummResponse = await getGranulesUmmResponse(params);

  const granules = buildStacGranules(jsonResponse.data.feed.entry,
                                     ummResponse.data.items);

  // get total number of hits for this query from the returned header
  const hits = _.get(jsonResponse, 'headers.cmr-hits', granules.length);
  return { granules: Object.values(granules), hits };
}

/**
 * Convert a STAC Collection ID to set of CMR query parameters
 * @param {string} providerId The CMR Provider ID
 * @param {string} collectionId The STAC Collection ID
 */
function stacCollectionToCmrParams (providerId, collectionId) {
  const cmrParams = {
    provider_id: providerId
  };
  const parts = collectionId.split('.v');
  if (parts.length === 1) {
    cmrParams.short_name = collectionId;
  } else {
    cmrParams.version = parts.pop();
    cmrParams.short_name = parts.join('.');
  }
  if (settings.cmrStacRelativeRootUrl === '/cloudstac') {
    cmrParams.cloud_hosted = 'true';
  }
  return cmrParams;
}

/**
 * Map STAC Collection ID to CMR Collection ID - uses cache to save mappings
 * @param {string} providerId CMR Provider ID
 * @param {string} stacId A STAC COllection ID
 */
async function stacIdToCmrCollectionId (providerId, stacId) {
  let collectionId = await getCachedConceptId(stacId);

  if (collectionId) {
    return collectionId;
  }

  const cmrParams = stacCollectionToCmrParams(providerId, stacId);
  let collections = [];
  if (cmrParams) {
    collections = await findCollections(cmrParams);
  }

  if (!collections.length) {
    return null;
  }

  collectionId = collections[0].id;
  cacheConceptId(stacId, collectionId);
  return collectionId;
}

/**
 * Map CMR Collection ID to STAC Collection ID - uses cache to save mappings
 * @param {string} providerId CMR Provider ID
 * @param {string} collectionId CMR Collection ID
 */
function cmrCollectionToStacId (shortName, version = null) {
  const invalidVersions = ['Not provided', 'NA'];
  if (version && !invalidVersions.includes(version)) {
    return `${shortName}.v${version}`;
  }
  return shortName;
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
  const cmrParams = Object.assign(params, getFacetParams(year, month, day));
  delete cmrParams.cloud_hosted;

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

  const temporalFacets = cmrFacets.children.find((f) => f.title === 'Temporal');
  // always a year facet
  const yearFacet = temporalFacets.children.find((f) => f.title === 'Year');
  const years = yearFacet.children.map((y) => y.title);
  facets.years = years;
  if (year) {
    // if year provided, get months
    const monthFacet = yearFacet
          .children.find((y) => y.title === year)
          .children.find((y) => y.title === 'Month');
    const months = monthFacet.children.map((y) => y.title);
    facets.months = months;
    if (month) {
      // if month also provided, get days
      const days = monthFacet
            .children.find((y) => y.title === month)
            .children.find((y) => y.title === 'Day')
            .children.map((y) => y.title);
      facets.days = days;
    }
    if (day) {
      const itemids = response.data.feed.entry.map((i) => i.title);
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
    const collections = await Promise.reduce(
      toArray(value),
      async (result, v) => {
        const collectionId = await stacIdToCmrCollectionId(providerId, v);
        // if valid collection, return CMR ID for it
        if (collectionId) {
          result.push(collectionId);
        }
        return result;
      },
      []
    );
    if (!collections.length) {
      return [[]];
    }
    return [['collection_concept_id', collections]];
  }
  return STAC_SEARCH_PARAMS_CONVERSION_MAP[key](value);
}

/**
 * Converts STAC parameters to CMR parameters
 * @param {string} providerId CMR Provider ID
 * @param {object} params STAC parameters
 */
async function convertParams (providerId, params = {}) {
  try {
    // async map to do all param conversions in parallel
    const converted = await Promise.reduce(
      Object.entries(params),
      async (result, [k, v]) => {
        const param = await convertParam(providerId, k, v);
        param.forEach((p) => {
          if (p.length === 2) {
            result.push(p);
          }
        });
        return result;
      },
      []
    );
    logger.debug(`Converting Params: ${JSON.stringify(params)} => ${JSON.stringify(converted)}`);
    return Object.assign({ provider: providerId }, fromEntries(converted));
  } catch (error) {
    logger.info('A problem occurred converting parameters', error.message);
    if (settings.throwCmrConvertParamErrors) {
      throw error;
    }
  }
}

module.exports = {
  cmrCollectionToStacId,
  cmrSearch,
  convertParams,
  findCollections,
  findGranules,
  fetchConcept,
  getFacetParams,
  getGranuleTemporalFacets,
  getProvider,
  getProviderList,
  stacCollectionToCmrParams,
  stacIdToCmrCollectionId,
};
