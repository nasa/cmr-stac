const { get } = require('lodash');

function errorHandler (error, req, res, next) {
  req.app.logger.error(`Error during request to URL [${req.url}] [${JSON.stringify(error) }]`, );

  if (get(error, 'response.data.errors')) {
    // pass through CMR errors
    const statusCode = get(error, 'response.status') || 400;

    res
      .status(statusCode)
      .json({errors: [error.response.data.errors]});
  } else if (get(error, 'code') === 'ECONNREFUSED') {
    // handle bad connections
    res
      .status(500)
      .json({ errors: ["A problem occurred communicating with CMR. Please try your request later."] });
  } else {
    // default error handler
    res
      .status(500)
      .json({ errors: ['An unexpected error occurred. We are working on fixing the problem.'] });
  }

  next();
}

module.exports = {
  errorHandler
};
