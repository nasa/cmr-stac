const fs = require('fs').promises;

const fileExists = async (path) => !!(await fs.stat(path).catch(_ => false));

const ddbLogPath = '../ddb/dynamodb.log';
const tables = [
  'conceptTable',
  'searchAfterTable'
];

/**
 * Wait for the offline DynamoDB to be running and for migrations to be complete.
 */
const waitForDdb = async (path, opts = {}) => {
  const attempts = opts.attempts || 0;
  const { requiredTables } = opts;

  if (attempts <= 0) {
    console.error('DynamoDB did not start in allotted time');
    const ddbLog = await fs.readFile(path, 'utf-8');
    console.log(ddbLog);
    return false;
  }

  const up = await fileExists(path);

  if (!up) {
    opts.attempts = attempts - 1;
    return setTimeout(waitForDdb, 1000, path, opts);
  }

  console.log('DynamoDB is up but not yet ready.', opts);

  const data = await fs.readFile(path, 'utf-8');

  const foundTables = requiredTables.reduce((count, table) => {
    if (data.includes(table)) {
      console.info(`\t${table} is present`);
      count = count + 1;
    }
    return count;
  }, 0);

  if (requiredTables.length !== foundTables) {
    opts.attempts = attempts - 1;
    // DynamoDB is running but not ready yet
    return setTimeout(waitForDdb, 1000, path, opts);
  }

  console.info('DynamoDB is ready');
  return true;
};

console.info('Waiting for DyanmoDB Tables');
waitForDdb(ddbLogPath, { attempts: 60, requiredTables: tables });
