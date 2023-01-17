const express = require('express');

const { makeAsyncHandler } = require('../util');
const { getItems } = require('./wfs');

/**
 * Primary search function for STAC.
 */
async function search (request, response) {
  return getItems(request, response);
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(search));
routes.post('/:providerId/search', makeAsyncHandler(search));

module.exports = {
  search,
  routes
};
