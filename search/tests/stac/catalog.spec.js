const settings = require('../../lib/settings');
const { createRootCatalog } = require('../../lib/stac/catalog');
const {logger} = require('../../lib/util');

beforeAll(() =>{
  logger.silent = true;
});

afterAll(() => {
  logger.silent = false;
});

describe('createRootCatalog', () => {
  let rootCatalog;

  beforeEach(() => {
    rootCatalog = createRootCatalog('/stac/stac');
  });

  it('should contain a collection of links.', () => {
    expect(rootCatalog.links).toBeDefined();
    expect(Array.isArray(rootCatalog.links)).toBe(true);
  });

  it('should create a catalog with a self link.', () => {
    const selfLink = rootCatalog.links.find((link) => link.rel === 'self');
    expect(selfLink).toBeDefined();
    expect(selfLink.href).toBe('/stac/stac');
    expect(selfLink.type).toBe('application/json');
    expect(selfLink.title).toBe('Root Catalog');
  });

  it('should create a catalog with a self link that does not contain a question mark.', () => {
    const newRootCatalog = createRootCatalog('/stac/stac?');
    const selfLink = newRootCatalog.links.find((link) => link.rel === 'self');
    expect(selfLink).toBeDefined();
    expect(selfLink.href).toBe('/stac/stac');
    expect(selfLink.type).toBe('application/json');
    expect(selfLink.title).toBe('Root Catalog');
  });

  it('should create a catalog with a root link to itself.', () => {
    const selfLink = rootCatalog.links.find((link) => link.rel === 'self');
    const rootLink = rootCatalog.links.find((link) => link.rel === 'root');
    expect(rootLink).toBeDefined();
    expect(rootLink.href).toEqual(selfLink.href);
  });

  it('should have a stac version.', () => {
    expect(rootCatalog.stac_version).toBe(settings.stac.version);
  });

  it('should have an id.', () => {
    expect(rootCatalog.id).toBe('root');
  });

  it('should have a title.', () => {
    expect(rootCatalog.title).toBe('Root Catalog');
  });

  it('should have a description.', () => {
    expect(rootCatalog.description).toBe('Generated root catalog for CMR.');
  });

  it('should be able to add a child catalog or collection.', () => {
    rootCatalog.addChild('Default Catalog', '/default');
    const childLink = rootCatalog.links.find((link) => link.rel === 'child');
    expect(childLink).toBeDefined();
    expect(childLink.href).toBe('/stac/stac/default');
  });

  it('should be able to add a next rel to pagination links', () => {
    rootCatalog = createRootCatalog('/stac/stac/provider');
    rootCatalog.addNext('Page 2', '/page/2');
    const paginationLink = rootCatalog.links.find(link => link.rel === 'next');
    expect(paginationLink).toBeDefined();
    expect(paginationLink.rel).toBe('next');
    expect(paginationLink.href).toBe('/stac/stac/provider/page/2');
  });

  it('should be able to add a parent catalog.', () => {
    rootCatalog.createParent('/stac');
    const parentLink = rootCatalog.links.find((link) => link.rel === 'parent');
    expect(parentLink).toBeDefined();
    expect(parentLink.href).toBe('/stac');
    expect(parentLink.rel).toBe('parent');
    expect(parentLink.title).toBe('Parent Catalog');
  });

  it('should be able to add an item.', () => {
    rootCatalog.addItem('stac item', 'provider', 'collection', 'id');
    const itemLink = rootCatalog.links.find((link) => link.rel === 'item');
    expect(itemLink).toBeDefined();
    expect(itemLink.href).toBe('/stac/stac/provider/collections/collection/items/id');
    expect(itemLink.rel).toBe('item');
    expect(itemLink.title).toBe('stac item');
  });
});
