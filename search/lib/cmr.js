const AWS = require('aws-sdk');
// TODO get region from settings
AWS.config.update({ region: "us-east-1" });

const _ = require('lodash');
const axios = require('axios');
const {
  logger,
  makeCmrSearchLbUrl,
  toArray
} = require('./util');
const settings = require('./settings');

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
  const url = makeCmrSearchLbUrl(path);

  const [saParams, saHeaders] = await getSearchAfterParams(path, params);
  const response = await axios.get(url, {
    params: saParams,
    headers: saHeaders
  });
  await cacheSearchAfter(path, params, response);
  return response;
}

/**
 * Returns the page_num value as a number.
 */
function getPageNumFromParams (params) {
  return Number.isNaN(Number(params['page_num']))
    ? 1
    : Number(params['page_num'], 10);
}

/**
 * Get cached header search-after for a page based on a query.
 */
function getSearchAfterParams (path, params = {}, headers = DEFAULT_HEADERS) {
  const pageNum = getPageNumFromParams(params);

  const saParams = Object.assign({}, params);
  const saHeaders = Object.assign({}, headers);

  delete saParams['page_num'];

  const saParamString = JSON.stringify(saParams);

  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });
  const ddbParams = {
    TableName: "SearchAfterCache",
    Key: {
      key: {
        S: `${path}--${saParamString}--${pageNum - 1}`
      }
    }
  };

  return new Promise((resolve) => {
    ddb.getItem(ddbParams, (err, data) => {
      if (err) {
        logger.error(err, err.stack);

        logger.debug('No Search After Found');
        resolve([params, headers]);
      }

      if (data && data.Item.length) {
        const searchAfter = data.Item.value.S;
        logger.debug(`cmr-search-after [${JSON.stringify(saParams)}] => ${searchAfter}`);
        saHeaders['cmr-search-after'] = searchAfter;
        resolve([saParams, saHeaders]);
      }
    });
  });
}

/**
 * Cache a `cmr-search-after` header value from a response.
 */
function cacheSearchAfter (path, params, response) {
  if (!(response && response.headers)) {
    logger.info('No headers returned from response from CMR.');
    return Promise.resolve();
  }

  const saResponse = response.headers['cmr-search-after'];
  if (!saResponse || saResponse.length === 0) {
    logger.info(
      'No cmr-search-after header value was returned in the response from CMR.'
    );
    return Promise.resolve();
  }

  const pageNum = getPageNumFromParams(params);
  const saParams = Object.assign({}, params);
  delete saParams['page_num'];
  const saParamString = JSON.stringify(saParams);

  const ddb = new AWS.DynamoDB({ apiVersion: "2012-10-08" });

  const ddbParams = {
    TableName: "SearchAfterCache",
    Item: {
      key: {
        S: `${path}--${saParamString}--${pageNum}`
      },
      value: {
        S: ''
      },
      expdate: {
        N: `${ttlInHours(4)}`
      }
    }
  };

  return new Promise((resolve) => {
    ddb.putItem(ddbParams, (err, data) => {
      if (err) {
        logger.error(err, err.stack);
      }
      logger.debug(data);
      resolve(data);
    });
  });
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

  const [saParams, saHeaders] = await getSearchAfterParams(path, params, headers);

  const response = await axios.post(url, saParams, { headers: saHeaders });
  cacheSearchAfter(path, params, response);
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
 * Search CMR for granules in UMM_JSON format
 */
async function getGranulesUmm(params = {}, opts = settings) {
  if (opts.cmrStacRelativeRootUrl === '/cloudstac') {
    return await cmrSearchPost('/granules.umm_json', params);
  }
  return await cmrSearch('/granules.umm_json', params);
}

/**
 * Search CMR for granules in JSON format.
 */
async function getGranulesJson(params = {}, opts = settings) {
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
  // TODO swap these for single request for STAC format
  const jsonResponse = await getGranulesJson(params);
  const ummResponse = await getGranulesUmm(params);

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
  // TODO replace cache code with dynamo db calls
  // let collectionId = conceptCache.get(stacId);
  // if (collectionId) {
  //   return collectionId;
  // }
  const cmrParams = stacCollectionToCmrParams(providerId, stacId);
  let collections = [];
  if (cmrParams) {
    collections = await findCollections(cmrParams);
  }
  if (collections.length === 0) {
    return null;
  }
  const collectionId = collections[0].id;
  // TODO replace with dynamodb
  // conceptCache.set(stacId, collectionId, settings.cacheTtl);
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
  delete cmrParams.tag_key;

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
    if (collections.length === 0) {
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

/**
 * Returns a unix timestamp N hours from NOW.
 */
function ttlInHours(n) {
  return Math.floor(((new Date()).getTime() + (n * 3600000)) / 1000);
}

module.exports = {
  cmrCollectionToStacId,
  cmrSearch,
  convertParams,
  findCollections,
  findGranules,
  getFacetParams,
  getGranuleTemporalFacets,
  getGranulesJson,
  getGranulesUmm,
  getProvider,
  getProviderList,
  stacCollectionToCmrParams,
  stacIdToCmrCollectionId,
};
