const { WfsLink } = require('../../lib/util/wfs-link');

describe('WfsLink', () => {
  it('should exist.', () => {
    expect(WfsLink).toBeDefined();
  });

  it('should be able to create a WFS Link representation.', () => {
    expect(WfsLink.create).toBeDefined();
  });

  it('should create a valid wfs link with rel and href. Title being optional.', () => {
    expect(WfsLink.create('self', 'http://example.com')).toEqual({
      rel: 'self',
      href: 'http://example.com',
      title: '',
      type: 'application/json'
    });
  });

  it('should create a valid link with rel, href, and title.', () => {
    expect(WfsLink.create('self', 'http://example.com', 'title'))
      .toEqual({
        rel: 'self',
        href: 'http://example.com',
        title: 'title',
        type: 'application/json'
      });
  });
});
