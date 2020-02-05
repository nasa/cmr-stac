const { UrlBuilder } = require('../../lib/util/url-builder');

describe('UrlBuilder', () => {
  it('should exist.', () => {
    expect(UrlBuilder).toBeDefined();
  });

  it('should have a static create method.', () => {
    expect(UrlBuilder.create).toBeDefined();
  });

  it('should create a new instance of UrlBuilder.', () => {
    expect(UrlBuilder.create() instanceof UrlBuilder).toBe(true);
  });

  it('should create a url with a host.', () => {
    const url = UrlBuilder.create().withHost('example.com').build();
    expect(url).toBe('http://example.com');
  });

  it('should throw if building a URL with no host.', () => {
    expect(() => UrlBuilder.create().build()).toThrow();
  });

  it('should create a url with host and protocol.', () => {
    const url = UrlBuilder.create()
      .withProtocol('https')
      .withHost('example.com')
      .build();
    expect(url).toBe('https://example.com');
  });

  it('should default the protocol if an empty one is passed in.', () => {
    const url = UrlBuilder.create()
      .withProtocol('')
      .withHost('example.com')
      .build();
    expect(url).toBe('http://example.com');
  });

  it('should create a url with query params.', () => {
    const url = UrlBuilder.create()
      .withHost('example.com')
      .withQuery({ param1: 'value', param2: 'value' })
      .build();
    expect(url).toBe('http://example.com?param1=value&param2=value');
  });

  it('should be able to handle an empty query map.', () => {
    const url = UrlBuilder.create()
      .withHost('example.com')
      .withQuery({})
      .build();
    expect(url).toBe('http://example.com');
  });

  it('should be able to handle an undefined query map.', () => {
    const url = UrlBuilder.create()
      .withHost('example.com')
      .withQuery(undefined)
      .build();
    expect(url).toBe('http://example.com');
  });

  it('should create a url with a path.', () => {
    const url = UrlBuilder.create()
      .withHost('example.com')
      .withPath('/a/b/c')
      .build();
    expect(url).toBe('http://example.com/a/b/c');

    const url2 = UrlBuilder.create()
      .withHost('example.com')
      .withPath('a/b/c')
      .build();
    expect(url2).toBe('http://example.com/a/b/c');
  });
});
