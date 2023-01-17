const { chunk } = require('lodash');
const { max, min } = Math;

const WHOLE_WORLD_BBOX = [-180, -90, 180, 90];

/**
 * Determines whether a bounding box crosses over the antimeridian
 *
 * @param bbox in a `[W, S, E, N]` format
 * @returns true if the box crosses the antimeridian, false otherwise
 */
function crossesAntimeridian (bbox) {
  // true if W > E
  return bbox[0] > bbox[2];
}

/**
 *
 * @param bbox - An array of float coordinates in the format `[W, S, E, N]`
 * @param points - An array of of arrays of two float coordinates in the format [lon, lat]
 * @returns number[] - A single array of float coordinates in the format `[W, S, E, N]`
 */
function addPointsToBbox (bbox, points) {
  let w; let s; let e; let n;
  if (bbox) {
    [w, s, e, n] = bbox;
  }
  points.forEach(([lon, lat]) => {
    if (w) {
      w = min(w, lon);
      s = min(s, lat);
      e = max(e, lon);
      n = max(n, lat);
    } else {
      [w, s, e, n] = [lon, lat, lon, lat];
    }
  });
  return [w, s, e, n];
}

/**
 * Join two bounding boxes to create a single box that is the minimal bounding box
 * encompassing the two.
 *
 * @param box1 - A bounding-box array of floats in the `[W, S, E, N]` format
 * @param box2 - A bounding-box array of floats in the `[W, S, E, N]` format
 * @returns number[] - A single combined bounding-box in the `[W, S, E, N]` format
 */
function mergeBoxes (box1, box2) {
  if (!box1 && !box2) {
    return null;
  }
  if (!box1) {
    return box2;
  }
  if (!box2) {
    return box1;
  }

  let w;
  let e;
  if (crossesAntimeridian(box1) && crossesAntimeridian(box2)) {
    // both cross the antimeridian
    w = min(box1[0], box2[0]);
    e = max(box1[2], box2[2]);
    if (w <= e) {
      // if the result covers the whole world then we'll set it to that.
      w = -180.0;
      e = 180.0;
    }
  } else if (crossesAntimeridian(box1) || crossesAntimeridian(box2)) {
    // one crosses the antimeridian
    let b1;
    let b2;
    if (crossesAntimeridian(box2)) {
      b1 = box2;
      b2 = box1;
    } else {
      b1 = box1;
      b2 = box2;
    }
    const w1 = b1[0];
    const w2 = b2[0];
    const e1 = b1[2];
    const e2 = b2[2];
    // We could expand b1 to the east or to the west. Pick the shorter of the two
    const westDist = w1 - w2;
    const eastDist = e1 - e2;
    if (westDist <= 0 || eastDist >= 0) {
      w = w1;
      e = e1;
    } else if (eastDist < westDist) {
      w = w1;
      e = e2;
    } else {
      w = w2;
      e = e1;
    }

    if (w <= e) {
      // if the result covers the whole world then we'll set it to that.
      w = -180.0;
      e = 180.0;
    }
  } else {
    // neither cross the Antimeridian
    let b1;
    let b2;
    if (box1[0] > box2[0]) {
      b1 = box2;
      b2 = box1;
    } else {
      b1 = box1;
      b2 = box2;
    }
    const w1 = b1[0];
    const w2 = b2[0];
    const e1 = b1[2];
    const e2 = b2[2];

    w = min(w1, w2);
    e = max(e1, e2);

    // Check if it's shorter to cross the AM
    const dist = e - w;
    const altWest = w2;
    const altEast = e1;
    const altDist = (180.0 - altWest) + (altEast + 180.0);

    if (altDist < dist) {
      w = altWest;
      e = altEast;
    }
  }

  // latitude range union
  const n = max(box1[3], box2[3]);
  const s = min(box1[1], box2[1]);

  return [w, s, e, n];
}

/**
 *
 * @param numStr - A string of coordinate values, separated by spaces and/or commas
 * @returns - An array of float coordinate values
 */
function parseOrdinateString (numStr) {
  return numStr.split(/\s|,/).map(parseFloat);
}

/**
 *
 * @param pointStr - A string of coordinate values
 * @returns {unknown[][]} - An array containing arrays of 2 floating points representing coordinate points.
 */
function pointStringToPoints (pointStr) {
  const unorderedPoints = chunk(parseOrdinateString(pointStr), 2);
  return unorderedPoints.map(([lat, lon]) => [lon, lat]);
}

/**
 * Convert a CMR bounding box to GeoJSON
 *
 * @param cmrBox - Bounding box in CMR order [S, W, N, E]
 * @returns - Bounding box in GeoJSON order [W, S, E, N]
 */
function reorderBoxValues (cmrBox) {
  if (!cmrBox) {
    throw new Error('Missing arguments');
  }
  return [cmrBox[1], cmrBox[0], cmrBox[3], cmrBox[2]];
}

module.exports = {
  addPointsToBbox,
  mergeBoxes,
  parseOrdinateString,
  pointStringToPoints,
  reorderBoxValues,
  crossesAntimeridian,
  WHOLE_WORLD_BBOX
};
