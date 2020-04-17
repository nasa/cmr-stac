const _ = require('lodash');

function firstIfArray (value) {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

const extractParam = (queryStringParams, param, defaultVal = null) => {
  if (queryStringParams && _.has(queryStringParams, param)) {
    return firstIfArray(queryStringParams[param]);
  }
  return defaultVal;
};

// function createLink(rel, href, title, type = 'application/json') {

// }

const createLink = (rel, href = '', title, type = 'application/json') => {
  if (href.includes('.txt') || href.includes('.text')) {
    type = 'application/text';
  }
  if (href.includes('.native')) {
    href.replace('.native', '.xml');
    type = 'application/xml';
  }
  if (href.includes('.xml')) {
    type = 'application/xml';
  }
  if (href.includes('.html')) {
    type = 'application/html';
  }

  return { rel: rel, href: href, title: title, type: type };
};

module.exports = {
  firstIfArray,
  extractParam,
  wfs: {
    createLink
  }
};
