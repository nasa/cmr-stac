const express = require('express');

const { makeAsyncHandler } = require('../util');
const { getGranules, getCloudGranules } = require('./wfs');

/**
 * Primary search function for STAC.
 */
async function search (request, response) {
  return getGranules(request, response);
}

/**
 * Primary search function for CLOUDSTAC.
 */
async function cloudSearch (request, response) {
  return getCloudGranules(request, response);
}

const routes = express.Router();

routes.get('/:providerId/search', makeAsyncHandler(search));
routes.post('/:providerId/search', makeAsyncHandler(search));

const cloudroutes = express.Router();

cloudroutes.get('/:providerId/search', makeAsyncHandler(cloudSearch));
cloudroutes.post('/:providerId/search', makeAsyncHandler(cloudSearch));

module.exports = {
  search,
  cloudSearch,
  routes,
  cloudroutes
};
