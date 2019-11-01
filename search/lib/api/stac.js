const express = require('express');

const settings = require('../settings');
const cmr = require('../cmr');
const cmrConverter = require('../convert');
const { createRootCatalog, Catalog } = require('../stac').catalog;

const { createRedirectUrl, logger } = require('../util');

async function search (event, params) {
  const cmrParams = cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
  const granules = await cmr.findGranules(cmrParams);
  return cmrConverter.cmrGranulesToFeatureCollection(event, granules);
}

async function getSearch (request, response) {
  logger.info('GET /stac/search');
  const event = request.apiGateway.event;
  const params = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, request.query);
  const result = await search(event, params);
  response.status(200).json(result);
}

async function postSearch (request, response) {
  logger.info('POST /stac/search');
  const event = request.apiGateway.event;
  const result = await search(event, request.body);
  response.status(200).json(result);
}

function getRootCatalog (request, response) {
  logger.info('GET /stac - root catalog');
  const rootCatalog = createRootCatalog();
  rootCatalog.addChild('Default Catalog', '/default');
  response.status(200).json(rootCatalog);
}

function createDefaultCatalog () {
  logger.info('Creating the default catalog');
  const catalog = new Catalog();
  catalog.stac_version = settings.stac.version;
  catalog.id = 'default';
  catalog.title = 'Default Catalog';
  catalog.description = 'Default catalog for a no parameter search against common metadata repository.';
  catalog.createRoot(`${settings.stac.baseUrl}`);
  catalog.createSelf(`${settings.stac.baseUrl}/default`);
  return catalog;
}

async function getCatalog (request, response) {
  const cmrCollections = await cmr.findCollections();
  const catalog = createDefaultCatalog();

  cmrCollections.forEach((item) => {
    catalog.addChild(item.title, `/${item.id}`);
  });

  response.status(200).json(catalog);
}

const routes = express.Router();

routes.get('/stac/search', (req, res) => getSearch(req, res));
routes.post('/stac/search', (req, res) => postSearch(req, res));

routes.get('/stac', (req, res) => getRootCatalog(req, res));
routes.get('/stac/:catalogId', (req, res) => getCatalog(req, res));
routes.get('/stac/:catalogId/:collectionId', (req, res) => res.redirect(createRedirectUrl(req.apiGateway.event, `/collections/${req.params.collectionId}`)));

module.exports = {
  getSearch,
  postSearch,
  getRootCatalog,
  getCatalog,
  routes
};
