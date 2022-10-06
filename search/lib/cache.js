const settings = require('./settings');
const {
  logger,
  ddbClient
} = require('./util');

const {
  GetItemCommand,
  PutItemCommand
} = require("@aws-sdk/client-dynamodb");

const CONCEPT_CACHE_TABLE = `${settings.stac.name}-conceptCacheTable`;
const CONCEPT_ID_CACHE_TABLE = `${settings.stac.name}-conceptIdTable`;
const SEARCH_AFTER_TABLE = `${settings.stac.name}-searchAfterTable`;

/**
 * Retrieve a concept from the cache.
 */
async function getCachedConcept (cmrConceptId) {
  if (!cmrConceptId) {
    return null;
  }

  logger.debug(`Checking conceptCache for concept with id [${cmrConceptId}]`);
  const ddbGetCommand = new GetItemCommand({
    TableName: CONCEPT_CACHE_TABLE,
    Key: {
      conceptId: { S:`${cmrConceptId}` }
    }
  });

  try {
    const { Item }  = await ddbClient.send(ddbGetCommand);
    if (Item) {
      const concept = JSON.parse(Item.concept.S);
      logger.debug(`Using cached concept with conceptId [${cmrConceptId}]`);
      return concept;
    }
  } catch (err) {
    logger.error('A problem occurred reading from the concept cache', err);
  }
  return null;
}

/**
 * Cache a conceptId.
 */
async function cacheConcept (cmrConceptId, concept) {
  if (!(cmrConceptId && concept)) {
    return null;
  }

  logger.debug(`Caching concept with conceptId [${cmrConceptId}]`);
  const ddbPutCommand = new PutItemCommand({
    TableName: CONCEPT_CACHE_TABLE,
    Item: {
      conceptId: { S:`${cmrConceptId}` },
      concept: { S: `${JSON.stringify(concept)}`},
      expdate: { N:`${ttlInHours(1)}` }
    }
  });

  await ddbClient.send(ddbPutCommand);
  return cmrConceptId;;
}

/**
 * Cache a conceptId.
 */
async function cacheConceptId (stacId, conceptId) {
  if (!(stacId && conceptId)) {
    return null;
  }

  logger.debug(`Caching stacId to conceptId ${stacId} => ${conceptId}`);
  const ddbPutCommand = new PutItemCommand({
    TableName: CONCEPT_ID_CACHE_TABLE,
    Item: {
      stacId: { S:`${stacId}` },
      conceptId: { S:`${conceptId}` },
      expdate: { N:`${ttlInHours(1)}` }
    }
  });

  await ddbClient.send(ddbPutCommand);
  return stacId;
}

/**
 * Retrieve a conceptId from the cache.
 */
async function getCachedConceptId (stacId) {
  if (!stacId) {
    return null;
  }

  logger.debug(`Checking conceptCache for stacId ${stacId}`);
  const ddbGetCommand = new GetItemCommand({
    TableName: CONCEPT_ID_CACHE_TABLE,
    Key: {
      stacId: { S:`${stacId}` }
    }
  });

  try {
    const { Item }  = await ddbClient.send(ddbGetCommand);
    if (Item) {
      const conceptId = Item.conceptId.S;
      logger.debug(`Using cached stacId ${stacId} => ${conceptId}`);
      return conceptId;
    }
  } catch (err) {
    logger.error('A problem occurred reading from the concept id cache', err);
  }
  return null;
}

/**
 * Get cached header search-after for a page based on a query.
 * @returns tuple of params and header objects
 */
async function getSearchAfterParams (params = {}, headers = {}) {
  const pageNum = getPageNumFromParams(params);

  const saParams = Object.assign({}, params);
  const saHeaders = Object.assign({}, headers);

  delete saParams['page_num'];

  const saParamString = JSON.stringify(saParams);

  const ddbGetCommand = new GetItemCommand({
    TableName: SEARCH_AFTER_TABLE,
    Key: {
      query: { S: `${saParamString}` },
      page: { N: `${pageNum}` }
    },
    ProjectionExpression: 'searchAfter'
  });

  try {
    const { Item } = await ddbClient.send(ddbGetCommand);

    if (Item) {
      const searchAfter = Item.searchAfter.S;
      if (searchAfter) {
        logger.debug(`Using cached cmr-search-after [${saParamString}][${pageNum}] => ${searchAfter}`);
        saHeaders['cmr-search-after'] = searchAfter;
      }
      return [saParams, saHeaders];
    }
  } catch (err) {
    logger.error("An error occurred reading search-after cache", err);
  }

  return [params, headers];
}

/**
 * Cache a `cmr-search-after` header value from a response.
 */
async function cacheSearchAfter (params, response) {
  if (!(response && response.headers)) {
    logger.debug('No headers returned from response from CMR.');
    return;
  }

  const saResponse = response.headers['cmr-search-after'];
  if (!saResponse || saResponse.length === 0) {
    logger.debug('No cmr-search-after header value was returned in the response from CMR.');
    return;
  }

  const pageNum = getPageNumFromParams(params);
  const nextPage = pageNum + 1;
  const saParams = Object.assign({}, params);
  delete saParams['page_num'];
  const saParamString = JSON.stringify(saParams);

  logger.debug(`Caching cmr-search-after response [${saParamString}][${nextPage}] => [${saResponse}]`);
  const ddbPutCommand = new PutItemCommand({
    TableName: SEARCH_AFTER_TABLE,
    Item: {
      query: { S:`${saParamString}` },
      page: { N:`${nextPage}` },
      searchAfter: { S:`${saResponse}` },
      expdate: { N:`${ttlInHours(1)}` }
    }
  });

  await ddbClient.send(ddbPutCommand);
  return;
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
 * Return a unix timestamp N hours from NOW.
 */
function ttlInHours(n) {
  return Math.floor(((new Date()).getTime() + (n * 3600000)) / 1000);
}

module.exports = {
  cacheConcept,
  cacheConceptId,
  cacheSearchAfter,
  getCachedConcept,
  getCachedConceptId,
  getSearchAfterParams
};
