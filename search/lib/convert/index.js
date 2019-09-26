const boundingBox = require('./bounding-box');
const collections = require('./collections');
const granules = require('./granules');

module.exports = {
  ...boundingBox,
  ...collections,
  ...granules
};
