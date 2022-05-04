let settings;

function getLoggerSettings () {
  const loggerSettings = {};

  loggerSettings.logLevel = process.env.LOG_LEVEL || 'error';
  loggerSettings.quiet = process.env.LOG_DISABLED === 'true';

  return loggerSettings;
}

function getStacSettings () {
  const stacSettings = {};

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

    // comma separated list of URL aliases
    settings.cmrStacRouteAliases = process.env.CMR_STAC_ROOT_ALIASES || '/cmr-stac';
    settings.cmrStacRelativeRootUrl = process.env.CMR_STAC_RELATIVE_ROOT_URL || '/stac';
    settings.cmrUrl = process.env.CMR_URL;
    settings.protocol = process.env.CMR_STAC_PROTOCOL || 'https';
    settings.cacheTtl = process.env.CMR_STAC_CACHE_TTL || 14400;
    settings.maxLimit = process.env.CMR_STAC_MAX_LIMIT || 250;

    settings.throwCmrConvertParamErrors = process.env.THROW_CMR_CONVERT_PARAM_ERRORS === 'true';

    addEnvSpecificSettings(settings);
  }
  return settings;
}

module.exports = getSettings();
