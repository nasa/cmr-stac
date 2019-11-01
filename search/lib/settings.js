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
  stacSettings.relativeRootUrl = process.env.CMR_STAC_RELATIVE_ROOT_URL || ''
  baseUrl = process.env.CMR_STAC_BASE_URL || 'http://localhost:3000';
  stacSettings.baseUrl = `${baseUrl}${stacSettings.relativeRootUrl}/stac`

  return stacSettings;
}

function getSettings () {
  if (!settings) {
    settings = {};
    settings.logger = getLoggerSettings();
    settings.stac = getStacSettings();
  }
  return settings;
}

module.exports = getSettings();
