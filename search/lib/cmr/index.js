const _ = require('lodash');
const axios = require('axios');
const { UrlBuilder } = require('../util/url-builder');
const { parseOrdinateString, identity, logger } = require('../util');

const publicCmrSearchHost = process.env.PUBLIC_CMR_SEARCH_HOST || 'cmr.earthdata.nasa.gov';
const publicCmrSearchProtocol = process.env.PUBLIC_CMR_SEARCH_PROTOCOL || 'https';
const publicCmrSearchRelativeRootUrl = process.env.PUBLIC_CMR_SEARCH_RELATIVE_ROOT_URL || '/search';
const cmrSearchHost = process.env.CMR_SEARCH_HOST || 'cmr.earthdata.nasa.gov';
const cmrSearchProtocol = process.env.CMR_SEARCH_PROTOCOL || 'https';
const cmrSearchRelativeRootUrl = process.env.CMR_SEARCH_RELATIVE_ROOT_URL || '/search';

const STAC_SEARCH_PARAMS_CONVERSION_MAP = {
  bbox: ['bounding_box', (v) => v.join(',')],
  time: ['temporal', identity],
  intersects: ['polygon', (v) => _.flattenDeep(_.first(v.coordinates)).join(',')],
  limit: ['page_size', identity],
  collectionId: ['collection_concept_id', identity]
};

const STAC_QUERY_PARAMS_CONVERSION_MAP = {
  limit: ['limit', (v) => parseInt(v, 10)],
  bbox: ['bbox', parseOrdinateString],
  time: ['time', identity]
};

const WFS_PARAMS_CONVERSION_MAP = {
  bbox: ['bounding_box', _.identity],
  time: ['temporal', _.identity],
  limit: ['page_size', _.identity]
};

const makeCmrSearchUrl = (path, queryParams = null, isPublic = true) => {
  return UrlBuilder.create()
    .withProtocol(isPublic ? publicCmrSearchProtocol : cmrSearchProtocol)
    .withHost(isPublic ? publicCmrSearchHost : cmrSearchHost)
    .withRelativeRootUrl(isPublic ? publicCmrSearchRelativeRootUrl : cmrSearchRelativeRootUrl)
    .withPath(path)
    .withQuery(queryParams)
    .build();
};

const headers = {
  'Client-Id': 'cmr-stac-api-proxy'
};

async function cmrSearch (path, params) {
  if (!path || !params) throw new Error('Missing path or parameters');
  const url = makeCmrSearchUrl(path, null, false);
  logger.debug(`CMR Search: ${url} with params: ${params}`);
  return axios.get(url, { params, headers });
}

async function findCollections (params = {}) {
  params.has_granules = true;
  params.downloadable = true;
  const response = await cmrSearch('/collections.json', params);
  return response.data.feed.entry;
}

async function getCollection (conceptId) {
  const collections = await findCollections({ concept_id: conceptId });
  if (collections.length > 0) return collections[0];
  return null;
}

async function findGranules (params = {}) {
  const response = await cmrSearch('/granules.json', params);
  return response.data.feed.entry;
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
  if (!converterPair) return [key, value];

  const [newName, converter] = converterPair;
  return [newName, converter(value)];
}

function convertParams (conversionMap, params) {
  try {
    const converted = Object.entries(params)
      .map(([k, v]) => convertParam(conversionMap[k], k, v));
    return fromEntries(converted);
  } catch (error) {
    logger.error(error.message);
    return params;
  }
}

module.exports = {
  STAC_SEARCH_PARAMS_CONVERSION_MAP,
  STAC_QUERY_PARAMS_CONVERSION_MAP,
  WFS_PARAMS_CONVERSION_MAP,
  makeCmrSearchUrl,
  cmrSearch,
  findCollections,
  findGranules,
  getCollection,
  convertParams,
  fromEntries
};
