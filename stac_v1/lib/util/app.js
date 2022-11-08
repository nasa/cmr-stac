/**
 * Extract desired type from an href
 * @param href
 * @returns {string}
 */
function extractTypeFromHref (href) {
  let type;
  if (href.includes('.txt') || href.includes('.text')) {
    type = 'application/text';
  } else if (href.includes('.native')) {
    type = 'application/xml';
  } else if (href.includes('.xml')) {
    type = 'application/xml';
  } else if (href.includes('.html')) {
    type = 'text/html';
  } else {
    type = null;
  }
  return type;
}

const createLink = (rel, href = '', title, type = 'application/json', method = null) => {
  type = extractTypeFromHref(href) || type;

  if (href.includes('.native')) {
    href = href.replace('.native', '.xml');
  }

  const link = { rel, href, title, type };
  if (method) {
    link.method = method;
  }
  return link;
};

const createAssetLink = (href = '', title, type = 'application/json') => {
  type = extractTypeFromHref(href) || type;

  if (href.includes('.native')) {
    href = href.replace('.native', '.xml');
  }

  if (!title) {
    return { href: href, type: type };
  } else {
    return { href: href, title: title, type: type };
  }
};

module.exports = {
  wfs: {
    createLink,
    createAssetLink
  }
};
