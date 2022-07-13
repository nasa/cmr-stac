const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const defaultParams = {
  region: 'us-east-1'
};

/**
 * Return a DynamoDB client.
 */
const createDdbClient = ((params) => {
  return new DynamoDBClient(Object.assign({}, defaultParams, params));
});

module.exports = { createDdbClient };
