const boundingBox = require('./bounding-box');
const collections = require('./collections');
const datetime = require('./datetime');
const granules = require('./granules');

module.exports = {
  ...boundingBox,
  ...collections,
  ...datetime,
  ...granules
};
