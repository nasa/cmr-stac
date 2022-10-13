const _ = require('lodash');
const axios = require('axios');
const settings = require('./settings');
const {
  logger,
  makeCmrSearchLbUrl,
  toArray,
  errors
} = require('./util');

const {
  cacheConceptId,
  cacheSearchAfter,
  getCachedConceptId,
  getSearchAfterParams
} = require('./cache');

const {convertDateTimeToCMR} = require('./convert/datetime');
const {convertGeometryToCMR} = require('./convert/coordinate');

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

/**
 * A CMR V2 Facet Group
 * @typedef {Object} CmrFacetV2
 * @property {string} title
 * @property {string} type
 * @property {boolean} applied
 * @property {boolean} has_children
 * @property {number} count
 * @property {Array} links
 * @property {Array.<CmrFacetV2>} children
 */

const DEFAULT_HEADERS = {
  'Client-Id': settings.clientId
};

/**
 * Execute an  async query a CMR Search endpoint with optional parameters
 * Pathshould be search path (e.g., granules.json, collections, etc)
 * @param {string} path CMR path to append to search URL (e.g., granules.json, collections.json)
 * @param {object} params Set of CMR parameters
 */
async function cmrSearch (path, params = {}) {
  if (!path) throw new Error('Missing url');
  if (!params) throw new Error('Missing parameters');

  const url = makeCmrSearchLbUrl(path);
  const [saParams, saHeaders] = await getSearchAfterParams(params, DEFAULT_HEADERS);

  logger.info(`GET CMR [${path}][${JSON.stringify(saParams)}][${JSON.stringify(saHeaders)}]`);

  const response = await axios.get(url, {
    params: saParams,
    headers: saHeaders
  });

  if (response.headers['cmr-search-after']) {
    await cacheSearchAfter(params, response);
  }
  return response;
}

/**
 * Query a CMR Search endpoint with optional parameters using POST
 * should be search path (e.g., granules.json, collections, etc)
 * @param {string} path CMR path to append to search URL (e.g., granules.json, collections.json)
 * @param {object} params Set of CMR parameters
 */
async function cmrSearchPost (path, params) {
  if (!path) throw new Error('Missing url');
  if (!params) throw new Error('Missing parameters');

  const url = makeCmrSearchLbUrl(path);
  const headers = {...DEFAULT_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded'};

  const [saParams, saHeaders] = await getSearchAfterParams(params, headers);

  logger.info(`POST CMR [${path}][${JSON.stringify(saParams)}][${JSON.stringify(saHeaders)}]`);

  const response = await axios.post(url, saParams, { headers: saHeaders });

  if (response.headers['cmr-search-after']) {
    await cacheSearchAfter(params, response);
  }
  return response;
}

/**
 * Get a list of providers from CMR.
 */
async function getProviders () {
  logger.debug(`Fetching list of providers`);
  let ingestUrl = '/ingest';
  if (settings.cmrLbUrl.includes('localhost')) {
    ingestUrl = ':3002';
  }
  const providerUrl = `${settings.cmrLbUrl}${ingestUrl}/providers`;

  const { data } = await axios.get(providerUrl);
  return data;
}

/**
 * Fetch the list of holdings for the provider.
 *
 * @param {string} providerId The CMR Provider ID
 */
async function getProviderHoldings (providerId) {
  logger.debug(`Fetching provider [${providerId}] details`);
  const { data } = await cmrSearch('provider_holdings.json', { providerId });
  return data;
}

/**
 * Search CMR for collections matching query parameters.
 *
 * @param {object} params CMR Query parameters
 */
async function findCollections (params = {}) {
  logger.debug(`findCollections [${JSON.stringify(params)}]`);

  const response = await cmrSearch('/collections.json', params);
  return response.data.feed.entry;
}

/**
 * Fetch a concept from CMR by conceptId
 */
async function fetchConcept (cmrConceptId, opts = {format: "json"}) {
  logger.debug(`fetchConcept [${cmrConceptId}][${JSON.stringify(opts)}]`);

  const { format } = opts;
  const extension = format ? `.${format}` : "";

  const { status, data } = await cmrSearch(`/concepts/${cmrConceptId}${extension}`);
  if (status !== 200) {
    throw new errors.NotFound(`Concept with ID [${cmrConceptId}] was not found.`);
  }
  return data;
}

/**
 * Search CMR for granules matching CMR query parameters
 * @param {object} params Object of CMR Search parameters
 */
async function findGranules(params = {}) {
  const usePost = settings.cmrStacRelativeRootUrl === '/cloudstac';

  const { status: jsonStatus, data: gJson, headers } = usePost ?
        await cmrSearchPost('/granules.json', params) :
        await cmrSearch('/granules.json', params);

  if (jsonStatus !== 200) {
    throw new Error(`Could not fetch JSON granule data from CMR.`, gJson);
  }

  const { status: ummStatus, data: gUmm } = usePost ?
        await cmrSearchPost('/granules.umm_json', params) :
        await cmrSearch('/granules.umm_json', params);

  if (ummStatus !== 200) {
    throw new Error(`Could not fetch UMM_JSON granule data from CMR.`, gUmm);
  }

  // merge the umm into the json
  // TODO convert to single graphql call
  const granules = gJson.feed.entry.map(gj => {
    const { umm } = gUmm.items.find((gu) => _.get(gu, 'meta.concept-id') === gj.id);
    return {...gj, umm };
  });

  return {granules,
          hits: _.get(headers, 'cmr-hits')};
}

/**
 * Convert a STAC Collection ID to set of CMR query parameters
 * @param {string} providerId The CMR Provider ID
 * @param {string} collectionId The STAC Collection ID
 */
function stacCollectionToCmrParams (providerId, collectionId) {
  const cmrParams = { provider_id: providerId };

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
 * Map CMR Collection ID to STAC Collection ID
 *
 * @param {string} providerId CMR Provider ID
 * @param {string} collectionId CMR Collection ID
 */
function cmrCollectionToStacId (shortName, version) {
  const invalidVersions = ['Not provided', 'NA'];
  if (version && !invalidVersions.includes(version)) {
    return `${shortName}.v${version}`;
  }
  return shortName;
}

/**
 *
 */
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

/**
 * Async
 *
 * @param {object} params
 * @param {string} [year]
 * @param {string} [month]
 * @param {string} [day]
 */
async function getGranuleTemporalFacets (params, year, month, day) {
  const facetParams = getFacetParams(year, month, day);
  const cmrParams = {...params, ...facetParams};
  delete cmrParams.cloud_hosted;

  const response = await cmrSearch('/granules.json', cmrParams);
  const cmrFacets = _.get(response, 'data.feed.facets');

  const facets = {
    years: [],
    months: [],
    days: [],
    itemids: []
  };

  if (!cmrFacets.has_children) return facets;

  const yearFacets = cmrFacets
        .children.find(({ title }) => title === 'Temporal')
        .children.find(({ title }) => title === 'Year');
  facets.years = yearFacets.children.map(({ title }) => title);

  if (year) {
    // get the months for that year
    const monthFacets = yearFacets
          .children.find(({ title }) => title === year)
          .children.find(({ title }) => title === 'Month');
    facets.months = monthFacets.children.map(({ title }) => title);

    if (month) {
      // get the months for that year
      const dayFacets = monthFacets
            .children.find(({ title }) => title === month)
            .children.find(({ title }) => title === 'Day');
      facets.days = dayFacets.children.map(({ title }) => title);

      if (day) {
        // get items for that day
        const itemIds = response.data.feed.entry.map(({ title }) => title);
        facets.itemids = itemIds;
      }
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
 * @param {object} [params] parameters
 */
async function convertParams (providerId, params = {}) {
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

  const convertedParams = fromEntries(converted);
  return {...convertedParams, provider: providerId};
};

module.exports = {
  cmrCollectionToStacId,
  cmrSearch,
  cmrSearchPost,
  convertParams,
  findCollections,
  findGranules,
  fetchConcept,
  getFacetParams,
  getGranuleTemporalFacets,
  getProviderHoldings,
  getProviders,
  stacCollectionToCmrParams,
  stacIdToCmrCollectionId,
};
