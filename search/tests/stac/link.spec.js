const link = require('../../lib/stac/link');

describe('Link', () => {
  it('should look like a STAC link.', () => {
    const testLink = link.create('rel', 'title', 'http://localhost:3000/');
    expect(testLink.rel).toBe('rel');
    expect(testLink.type).toBe('application/json');
    expect(testLink.title).toBe('title');
    expect(testLink.href).toBe('http://localhost:3000/');
  });

  it('should be able to create a root link.', () => {
    expect(link.createRoot().rel).toBe('root');
  });

  it('should be able to create a self link.', () => {
    expect(link.createSelf().rel).toBe('self');
  });

  it('should be able to create a parent link.', () => {
    expect(link.createParent().rel).toBe('parent');
  });

  it('should be able to create a child link.', () => {
    expect(link.createChild().rel).toBe('child');
  });

  it('should be able to create a next link.', () => {
    expect(link.createNext().rel).toBe('next');
  });

  it('should be able to create an item link.', () => {
    expect(link.createItem().rel).toBe('item');
  });
});
