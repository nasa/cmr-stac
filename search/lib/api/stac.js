const express = require('express');

// const settings = require('../settings');
const cmr = require('../cmr');
const cmrConverter = require('../convert');
// const { createRootCatalog, Catalog } = require('../stac').catalog;
const { validateStac } = require('../validator');
// const getStacBaseUrl = require('../util');
const { createRedirectUrl, logger } = require('../util');

let validResult = true;

async function search (event, params) {
  const cmrParams = cmr.convertParams(cmr.STAC_SEARCH_PARAMS_CONVERSION_MAP, params);
  const granules = await cmr.findGranules(cmrParams);
  return cmrConverter.cmrGranulesToFeatureCollection(event, granules);
}

async function getSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`GET /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.query);
  const convertedParams = cmr.convertParams(cmr.STAC_QUERY_PARAMS_CONVERSION_MAP, params);
  const result = await search(event, convertedParams);

  validResult = validateStac(result);
  validResult ? response.status(200).json(result) : response.status(400).json('Bad Request');
}

async function postSearch (request, response) {
  const providerId = request.params.providerId;
  logger.info(`POST /${providerId}/search`);
  const event = request.apiGateway.event;
  const params = Object.assign({ provider: providerId }, request.body);
  const result = await search(event, params);

  validResult = validateStac(result);
  validResult ? response.status(200).json(result) : response.status(400).json('Bad Request');
}

// function getRootCatalog (request, response) {
//   logger.info('GET /stac - root catalog');
//   const rootCatalog = createRootCatalog(getStacBaseUrl(request.apiGateway.event));
//   rootCatalog.addChild('Default Catalog', '/default');
//   response.status(200).json(rootCatalog);
// }

// function createDefaultCatalog (event) {
//   logger.info('Creating the default catalog');
//   const catalog = new Catalog();
//   const stacBaseUrl = getStacBaseUrl(event);
//   catalog.stac_version = settings.stac.version;
//   catalog.id = 'default';
//   catalog.title = 'Default Catalog';
//   catalog.description = 'Default catalog for a no parameter search against common metadata repository.';
//   catalog.createRoot(stacBaseUrl);
//   catalog.createSelf(`${stacBaseUrl}/default`);
//   return catalog;
// }

// async function getCatalog (request, response) {
//   const cmrCollections = await cmr.findCollections();
//   const catalog = createDefaultCatalog(request.apiGateway.event);
//
//   cmrCollections.forEach((item) => {
//     if (typeof item.href === 'string' && item.href.includes('providers')) {
//       catalog.addNext(item.title, `/${item.id}`);
//     }
//     catalog.addChild(item.title, `/${item.id}`);
//   });
//
//   validResult = validateStac(catalog);
//   validResult ? response.status(200).json(catalog) : response.status(400).json('Bad Request');
// }

const routes = express.Router();

routes.get('/:providerId/search', (req, res, next) => getSearch(req, res).catch(next));
routes.post('/:providerId/search', (req, res, next) => postSearch(req, res).catch(next));

routes.get('/:providerId', (req, res) => res.redirect(createRedirectUrl(req.apiGateway.event, `/${req.params.providerId}/collections`)));
// routes.get('/:providerId/:catalogId', (req, res) => getCatalog(req, res));
// routes.get('/:providerId/:catalogId/:collectionId', (req, res) => res.redirect(createRedirectUrl(req.apiGateway.event, `/collections/${req.params.collectionId}`)));

module.exports = {
  getSearch,
  postSearch,
  // getRootCatalog,
  // getCatalog,
  routes
};
