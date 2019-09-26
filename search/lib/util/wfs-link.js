class WfsLink {
  static create (rel, href, title = '') {
    return { rel, href, title, type: 'application/json' };
  }
}

module.exports = {
  WfsLink
};
