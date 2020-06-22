let settings;

function getLoggerSettings () {
  const loggerSettings = {};

  loggerSettings.logLevel = process.env.LOG_LEVEL || 'error';
  loggerSettings.quiet = process.env.LOG_DISABLED === 'true';

  return loggerSettings;
}

function getStacSettings () {
  const stacSettings = {};

  stacSettings.version = process.env.STAC_VERSION || '1.0.0-beta.1';
  stacSettings.stacRelativePath = process.env.STAC_RELATIVE_PATH || '/stac';

  return stacSettings;
}

const testSettings = {
  throwCmrConvertParamErrors: true,
  invalidResponseIsError: true,
  logger: {
    logLevel: 'debug',
    quiet: false
  }
};

// These are currently the same as test
const localRunSettings = testSettings;

function addEnvSpecificSettings (settings) {
  if ('JEST_WORKER_ID' in process.env) {
    Object.assign(settings, testSettings);
  }
  if (process.env.IS_LOCAL === 'true') {
    Object.assign(settings, localRunSettings);
  }
  return settings;
}

function getSettings () {
  if (!settings) {
    settings = {};
    settings.logger = getLoggerSettings();
    settings.stac = getStacSettings();

    // If we want a invalid STAC response to result in an Internal Server Error
    settings.invalidResponseIsError = process.env.INVALID_RESPONSE_IS_ERROR === 'true';

    settings.cmrStacRelativeRootUrl = process.env.CMR_STAC_RELATIVE_ROOT_URL || '/cmr-stac';
    settings.cmrSearchHost = process.env.CMR_SEARCH_HOST || 'cmr.earthdata.nasa.gov/search';
    settings.cmrProviderHost = process.env.CMR_PROVIDER_HOST || 'cmr.earthdata.nasa.gov/ingest/providers'
    settings.cmrSearchProtocol = process.env.CMR_SEARCH_PROTOCOL || 'https';

    settings.throwCmrConvertParamErrors = process.env.THROW_CMR_CONVERT_PARAM_ERRORS === 'true';

    addEnvSpecificSettings(settings);
  }
  return settings;
}

module.exports = getSettings();
