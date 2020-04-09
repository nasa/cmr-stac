let settings;

function getLoggerSettings () {
  const loggerSettings = {};

  loggerSettings.logLevel = process.env.LOG_LEVEL || 'error';
  loggerSettings.quiet = Boolean(process.env.LOG_DISABLED) || true;

  return loggerSettings;
}

function getStacSettings () {
  const stacSettings = {};

  stacSettings.version = process.env.STAC_VERSION || '0.8.0';
  stacSettings.license = process.env.license || { "name": "Apache License 2.0", "url": "http://www.apache.org/licenses/LICENSE-2.0" }
  stacSettings.stacRelativePath = process.env.STAC_RELATIVE_PATH || '/stac';

  return stacSettings;
}

function getSettings () {
  if (!settings) {
    settings = {};
    settings.logger = getLoggerSettings();
    settings.stac = getStacSettings();

    settings.cmrStacRelativeRootUrl = process.env.CMR_STAC_RELATIVE_ROOT_URL || '/cmr-stac';
    settings.cmrSearchHost = process.env.CMR_SEARCH_HOST || 'cmr.earthdata.nasa.gov/search';
    settings.cmrSearchProtocol = process.env.CMR_SEARCH_PROTOCOL || 'https';
  }
  return settings;
}

module.exports = getSettings();
