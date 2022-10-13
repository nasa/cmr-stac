const { get } = require('lodash');
const settings = require('./settings');
const { errors } = require('./util');

function errorHandler (error, req, res, next) {
  req.app.logger.error(`Error during request to URL [${req.url}] [${JSON.stringify(error) }]`);

  if (get(error, 'response.data.errors')) {
    // pass through CMR errors
    const statusCode = get(error, 'response.status') || 400;
    req.app.logger.error(JSON.stringify(error.response.data));

    res
      .status(statusCode)
      .json(error.response.data);
  } else if (error instanceof errors.NotFound) {
    res
      .status(404)
      .json({ errors: [error.message] });
  } else if (get(error, 'code') === 'ECONNREFUSED') {
    // handle bad connections
    res
      .status(500)
      .json({ message: `If the problem persists please contact ${settings.supportAddress}`,
              errors: ["A problem occurred communicating with CMR. Please try your request later."] });
  } else {
    // default error handler
    res
      .status(500)
      .json({ message: `If the problem persists please contact ${settings.supportAddress}`,
              errors: ['An unexpected error occurred. We have been alerted and are working to resolve the problem.',
                      error.message] });
  }

  next();
}

module.exports = {
  errorHandler
};
