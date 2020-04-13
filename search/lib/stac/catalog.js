const { inspect } = require('util');

const settings = require('../settings');
const { logger } = require('../util');
const link = require('./link');

class Catalog {
  constructor () {
    this.id = '';
    this.title = '';
    this.description = '';
    this.links = [];
  }

  createSelf (href) {
    this.links.push(link.createSelf(this.title, href));
  }

  createRoot (href) {
    this.links.push(link.createRoot('Root Catalog', href));
  }

  addChild (title, relativeUrl) {
    const root = this.links.find((l) => l.rel === link.RELATION_TYPES.self);
    const child = link.createChild(title, `${root.href}${relativeUrl}`);
    this.links.push(child);
  }
}

function createRootCatalog (stacBaseUrl) {
  const rootCatalog = new Catalog();

  rootCatalog.stac_version = settings.stac.version;
  rootCatalog.id = 'root';
  rootCatalog.title = 'Root Catalog';
  rootCatalog.description = 'Generated root catalog for CMR.';

  rootCatalog.createRoot(stacBaseUrl);
  rootCatalog.createSelf(stacBaseUrl);

  logger.debug(inspect(rootCatalog));

  return rootCatalog;
}

module.exports = {
  Catalog,
  createRootCatalog
};
