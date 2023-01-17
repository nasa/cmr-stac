const { get } = require('lodash');
const settings = require('./settings');
const { errors } = require('./util');
const stacExtension = require('./stac/extension');

function errorHandler(error, req, res, next) {
  req.app.logger.error(`Error during request to URL [${req.url}] [${error.message}]`);

  if (error instanceof errors.NotFound) {
    res
      .status(404)
      .json({ errors: [error.message] });
  } else if (error instanceof stacExtension.errors.InvalidSortPropertyError) {
    res
      .status(422)
      .json({ errors: [error.message] });
  } else if (error instanceof errors.HttpError) {
    res
      .status(error.status || 500)
      .json({ message: error.message, ...error.body } );
  } else if (get(error, 'code') === 'ECONNREFUSED') {
    // handle bad connections
    res
      .status(500)
      .json({
        message: `If the problem persists please contact ${settings.supportAddress}`,
        errors: ["A problem occurred communicating with CMR. Please try your request later."]
      });
  } else {
    // default error handler
    res
      .status(500)
      .json({
        message: `If the problem persists please contact ${settings.supportAddress}`,
        errors: ['An unexpected error occurred. We have been alerted and are working to resolve the problem.',
          error.message]
      });
  }

  next();
}

module.exports = {
  errorHandler
};
