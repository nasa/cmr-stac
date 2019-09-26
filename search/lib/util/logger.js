const winston = require('winston');

function createFormat () {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  );
}

function createTransports () {
  return [
    new winston.transports.Console()
  ];
}

function createLogger (loggerSettings) {
  const options = {};
  options.level = loggerSettings.logLevel;
  options.format = createFormat();
  options.transports = createTransports();
  options.silent = loggerSettings.quiet;
  return winston.createLogger(options);
}

module.exports = {
  createLogger
};
