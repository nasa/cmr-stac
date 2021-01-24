const _ = require('lodash');
const axios = require('axios');
const { UrlBuilder } = require('./util/url-builder');
const {
  logger,
  makeCmrSearchUrl
} = require('./util');
const settings = require('./settings');

const {
  convertDateTimeToCMR
} = require('./convert/datetime');
const NodeCache = require('node-cache');
const myCache = new NodeCache();

const STAC_SEARCH_PARAMS_CONVERSION_MAP = {
  bbox: ['bounding_box', _.identity],
  datetime: ['temporal', convertDateTimeToCMR],
  intersects: ['polygon', (v) => _.flattenDeep(_.first(v.coordinates)).join(',')],
  limit: ['page_size', _.identity],
  page: ['page_num', _.identity],
  collections: ['collection_concept_id', _.identity],
  ids: ['concept_id', _.identity]
};

const DEFAULT_HEADERS = {
  'Client-Id': 'cmr-stac-api-proxy'
};

function stacCollectionToCmrParams (providerId, collectionId) {
  const collectionIds = collectionId.split('.v');
  const version = collectionIds.pop();
  const shortName = collectionIds.join('.');
  return {
    provider_id: providerId,
    short_name: shortName,
    version
  };
}

async function cmrSearch (url, params) {
  if (!url || !params) throw new Error('Missing url or parameters');
  logger.debug(`CMR Search: ${url} with params: ${JSON.stringify(params)}`);
  return axios.get(url, { params, headers: DEFAULT_HEADERS });
}

async function findCollections (params = {}) {
  params.has_granules = true;
  const response = await cmrSearch(makeCmrSearchUrl('/collections.json'), params);
  return response.data.feed.entry;
}

async function cmrCollectionIdToStacId (collectionId) {
  let stacId = myCache.get(`collection_${collectionId}`);
  if (stacId) {
    return stacId;
  }
  const collections = await findCollections({ concept_id: collectionId });
  stacId = `${collections[0].short_name}.v${collections[0].version_id}`;
  myCache.set(`collection_${collectionId}`, stacId, 14400);
  return stacId;
}

async function findGranules (params = {}) {
  const response = await cmrSearch(makeCmrSearchUrl('/granules.json'), params);
  const granules = response.data.feed.entry.reduce(
    (obj, item) => ({
      ...obj,
      [item.id]: item
    }),
    {}
  );
  // get UMM version
  const responseUmm = await cmrSearch(makeCmrSearchUrl('/granules.umm_json'), params);
  responseUmm.data.items.forEach((g) => {
    granules[g.meta['concept-id']].meta = g.meta;
    granules[g.meta['concept-id']].umm = g.umm;
  });

  const hits = _.get(response, 'headers.cmr-hits', granules.length);
  return { granules: Object.values(granules), hits: hits };
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

  const facets = {};
  const response = await cmrSearch(makeCmrSearchUrl('/granules.json'), cmrParams);
  const temporalFacets = response.data.feed.facets.children.find(f => f.title === 'Temporal');
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

async function getProvider (providerId) {
  const url = UrlBuilder.create()
    .withProtocol(settings.cmrSearchProtocol)
    .withHost(`${settings.cmrSearchHost}/provider_holdings.json`)
    .withQuery({ providerId })
    .build();
  const response = await axios.get(url);
  return response.data;
}

async function getProviders () {
  const providerUrl = UrlBuilder.create()
    .withProtocol(settings.cmrSearchProtocol)
    .withHost(settings.cmrProviderHost)
    .build();
  const rawProviders = await axios.get(providerUrl);
  return rawProviders.data;
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

function convertParam (converterPair, key, value) {
  if (!converterPair) {
    throw Error(`Unsupported parameter ${key}`);
  }

  const [newName, converter] = converterPair;
  return [newName, converter(value)];
}

function convertParams (conversionMap, params) {
  try {
    const converted = Object.entries(params || {})
      .map(([k, v]) => convertParam(conversionMap[k], k, v));
    return fromEntries(converted);
  } catch (error) {
    logger.error(error.message);
    if (settings.throwCmrConvertParamErrors) {
      throw error;
    }
    return params;
  }
}

module.exports = {
  STAC_SEARCH_PARAMS_CONVERSION_MAP,
  stacCollectionToCmrParams,
  makeCmrSearchUrl,
  cmrSearch,
  findCollections,
  cmrCollectionIdToStacId,
  findGranules,
  getFacetParams,
  getGranuleTemporalFacets,
  convertParams,
  fromEntries,
  getProvider,
  getProviders
};
