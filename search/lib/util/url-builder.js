class UrlBuilder {
  static create () {
    return new UrlBuilder();
  }

  constructor () {
    this.protocol = 'http';
    this.path = '';
    this.relativeRootUrl = '';
  }

  withProtocol (protocol) {
    this.protocol = protocol || 'http';
    return this;
  }

  withHost (hostname) {
    this.host = hostname;
    return this;
  }

  withRelativeRootUrl (root) {
    this.relativeRootUrl = root;
    return this;
  }

  withQuery (paramMap) {
    if (!paramMap) return this;

    this.queryString = Object.keys(paramMap)
      .map((key) => `${key}=${paramMap[key]}`)
      .join('&');
    return this;
  }

  withPath (path) {
    if (!path) return this;

    this.path = path[0] === '/' ? path : `/${path}`;
    return this;
  }

  build () {
    if (!this.host) throw new Error('Missing hostname in UrlBuilder');

    const baseUrl = `${this.protocol}://${this.host}${this.relativeRootUrl}${this.path}`;
    return this.queryString ? `${baseUrl}?${this.queryString}` : `${baseUrl}`;
  }
}

module.exports = {
  UrlBuilder
};
