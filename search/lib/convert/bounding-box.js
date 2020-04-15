const { chunk } = require('lodash');

const WHOLE_WORLD_BBOX = [-180, -90, 180, 90];

function addPointsToBbox (bbox, points) {
  let w; let s; let e; let n;
  if (bbox) {
    [w, s, e, n] = bbox;
  }
  points.forEach(([lon, lat]) => {
    if (w) {
      w = Math.min(w, lon);
      s = Math.min(s, lat);
      e = Math.max(e, lon);
      n = Math.max(n, lat);
    } else {
      [w, s, e, n] = [lon, lat, lon, lat];
    }
  });
  return [w, s, e, n];
}

function mergeBoxes (box1, box2) {
  if (box1 === null) {
    return box2;
  }
  return [
    Math.min(box1[0], box2[0]),
    Math.min(box1[1], box2[1]),
    Math.max(box1[2], box2[2]),
    Math.max(box1[3], box2[3])
  ];
}

function parseOrdinateString (numStr) {
  return numStr.split(/\s|,/).map(parseFloat);
}

function pointStringToPoints (pointStr) {
  return chunk(parseOrdinateString(pointStr), 2);
}

module.exports = {
  addPointsToBbox,
  mergeBoxes,
  parseOrdinateString,
  pointStringToPoints,
  WHOLE_WORLD_BBOX
};
