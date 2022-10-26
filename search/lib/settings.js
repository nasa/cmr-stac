function getLoggerSettings () {
  const loggerSettings = {};

  loggerSettings.logLevel = process.env.LOG_LEVEL || 'error';
  loggerSettings.quiet = process.env.LOG_DISABLED === 'true';

  return loggerSettings;
}

function getDynamoDbSettings () {
  const ddbSettings = {};

  ddbSettings.region = process.env.AWS_REGION || 'us-east-1';

  return ddbSettings;
}

function getStacSettings () {
  const stacSettings = {};

  stacSettings.name = process.env.STAC_NAME || 'stac';
  stacSettings.version = process.env.STAC_VERSION || '1.0.0';
  stacSettings.stacRelativePath = process.env.STAC_RELATIVE_PATH || '/stac';

  return stacSettings;
}

const testSettings = {
  throwCmrConvertParamErrors: true,
  invalidResponseIsError: true,
  logger: {
    logLevel: 'debug',
    quiet: false
  },
  ddb: {
    awsRegion: 'localhost',
    endpoint: process.env.DDB_ENDPOINT || 'http://localhost:8000'
  }
};

// These are currently the same as test
const localRunSettings = testSettings;

function addEnvSpecificSettings (origSettings) {
  let settings = Object.assign({}, origSettings);

  if ('JEST_WORKER_ID' in process.env) {
    settings = Object.assign({}, settings, testSettings);
  }

  if (process.env.IS_LOCAL === 'true') {
    settings = Object.assign({}, settings, localRunSettings);
  }

  return settings;
}

function getSettings () {
  const settings = {};

  settings.logger = getLoggerSettings();
  settings.stac = getStacSettings();
  settings.ddb = getDynamoDbSettings();

  // If we want a invalid STAC response to result in an Internal Server Error
  settings.invalidResponseIsError = process.env.INVALID_RESPONSE_IS_ERROR === 'true';

  // comma separated list of URL aliases
  settings.cmrStacRouteAliases = process.env.CMR_STAC_ROOT_ALIASES || '/cmr-stac';
  settings.cmrStacRelativeRootUrl = process.env.CMR_STAC_RELATIVE_ROOT_URL || '/stac';
  settings.cmrUrl = process.env.CMR_URL || 'http://localhost';
  settings.cmrLbUrl = process.env.CMR_LB_URL || 'http://localhost';
  settings.protocol = process.env.CMR_STAC_PROTOCOL || 'https';
  settings.maxLimit = process.env.CMR_STAC_MAX_LIMIT || 250;
  settings.clientId = process.env.CMR_STAC_CLIENT_ID || 'cmr-stac-api-proxy';
  settings.supportAddress = process.env.CMR_SUPPORT_EMAIL || 'cmr-support@earthdata.nasa.gov';
  settings.graphQlUrl = process.env.GRAPHQL_URL || 'http://localhost:3003/dev/api';

  settings.throwCmrConvertParamErrors = process.env.THROW_CMR_CONVERT_PARAM_ERRORS === 'true';

  return addEnvSpecificSettings(settings);
}

module.exports = getSettings();
