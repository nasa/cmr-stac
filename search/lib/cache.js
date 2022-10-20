const settings = require('./settings');
const {
  logger,
  ddbClient
} = require('./util');

const {
  BatchExecuteStatementCommand,
  DescribeTableCommand,
  GetItemCommand,
  PutItemCommand,
  ScanCommand
} = require("@aws-sdk/client-dynamodb");

const CONCEPT_CACHE_TABLE = `${settings.stac.name}-conceptTable`;
const SEARCH_AFTER_TABLE = `${settings.stac.name}-searchAfterTable`;

/**
 * Cache a conceptId.
 */
async function cacheConceptId(providerId, stacId, conceptId) {
  if (!(stacId && conceptId)) return;

  logger.debug(`Caching stacId to conceptId [${providerId}][${stacId}] => [${conceptId}]`);
  const ddbPutCommand = new PutItemCommand({
    TableName: CONCEPT_CACHE_TABLE,
    Item: {
      stacId: { S: `${stacId}` },
      providerId: { S: `${providerId}` },
      conceptId: { S: `${conceptId}` },
      expdate: { N: `${ttlInHours(1)}` }
    }
  });

  await ddbClient.send(ddbPutCommand);
  return stacId;
}

/**
 * Retrieve a conceptId from the cache.
 */
async function getCachedConceptId(providerId, stacId) {
  if (!stacId) {
    return null;
  }

  logger.debug(`Checking conceptCache for stacId [${providerId}][${stacId}]`);
  const ddbGetCommand = new GetItemCommand({
    TableName: CONCEPT_CACHE_TABLE,
    Key: {
      stacId: { S: `${stacId}` },
      providerId: { S: `${providerId}` }
    }
  });

  try {
    const { Item } = await ddbClient.send(ddbGetCommand);
    if (Item) {
      const conceptId = Item.conceptId.S;
      logger.debug(`Found cached stacId [${providerId}][${stacId}] => [${conceptId}]`);
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
async function getSearchAfterParams(params = {}, headers = {}) {
  const pageNum = getPageNumFromParams(params);

  const saParams = { ...params };
  const saHeaders = { ...headers };
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
async function cacheSearchAfter(params, response) {
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
      query: { S: `${saParamString}` },
      page: { N: `${nextPage}` },
      searchAfter: { S: `${saResponse}` },
      expdate: { N: `${ttlInHours(1)}` }
    }
  });

  await ddbClient.send(ddbPutCommand);
  return;
}

async function scanTable(table) {
  const scan = new ScanCommand({
    TableName: table
  });

  const { Count: count, Items: items } = await ddbClient.send(scan);
  return { count, items };
}

/**
 * Returns a delete statement for an item in a table.
 */
function deleteByKeysStatement(table, item) {
  const { KeySchema } = table;
  // use the whole key schema to generate the lookup for each item
  const clauses = KeySchema.map(({ AttributeName }) => {
    const clause = `${AttributeName}=?`;
    const parameter = item[AttributeName];
    return [clause, parameter];
  });

  const selector = clauses.map(([clause, _]) => clause).join(" and ");
  const parameters = clauses.map(([_, parameter]) => parameter);

  return {
    Statement: `DELETE FROM "${table.TableName}" WHERE ${selector}`,
    Parameters: parameters
  };
}

/**
 * Return information about a DDB table.
 */
async function describeTable(table) {
  const { Table } = await ddbClient.send(new DescribeTableCommand({ TableName: table }));
  return Table;
}

/**
 * Remove all items from the table;
 */
async function clearTable(tableName) {
  const tableInfo = await describeTable(tableName);
  const { items } = await scanTable(tableName);

  const deleteParams = {
    Statements: items.map((item) => deleteByKeysStatement(tableInfo, item))
  };

  await ddbClient.send(
    new BatchExecuteStatementCommand(deleteParams)
  );
}

/**
 * Returns the page_num value as a number.
 */
function getPageNumFromParams(params) {
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
  tables: {
    CONCEPT_CACHE_TABLE,
    SEARCH_AFTER_TABLE
  },
  cacheConceptId,
  cacheSearchAfter,
  getCachedConceptId,
  getSearchAfterParams,
  clearTable,
  scanTable
};
