const _ = require('lodash');
const { parseOrdinateString } = require('./bounding-box');

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Convert a GeoJSON Polygon to coordinates used in CMR queries
function convertPolygonToCMR (coordinates) {
  if (coordinates.length > 1) {
    throw new Error('Interior LinearRings are not supported');
  }
  return _.flattenDeep(_.first(coordinates)).join(',');
}

// Convert a GeoJSON LineString to coordinates used in CMR queries
function convertLineStringToCMR (coordinates) {
  return _.flattenDeep(coordinates).join(',');
}

// Convert a GeoJSON Point to coordinates used in CMR queries
function convertPointToCMR (coordinates) {
  return coordinates.join(',');
}

// Class for converting GeoJSON to CMR query parameters
function convertGeometryToCMR (geometry) {
  switch (geometry.type) {
    case 'Polygon': return [['polygon', convertPolygonToCMR(geometry.coordinates)]];
    case 'LineString': return [['line', convertLineStringToCMR(geometry.coordinates)]];
    case 'Point': return [['point', convertPointToCMR(geometry.coordinates)]];
    case 'MultiPolygon':
      return [
        ['polygon', geometry.coordinates.map(convertPolygonToCMR)],
        ['options[polygon][or]', 'true']
      ];
    case 'MultiLineString':
      return [
        ['line', geometry.coordinates.map(convertLineStringToCMR)],
        ['options[line][or]', 'true']
      ];
    case 'MultiPoint':
      return [
        ['point', geometry.coordinates.map(convertPointToCMR)],
        ['options[point][or]', 'true']
      ];
    default: throw new Error(`Unsupported Geometry type ${geometry.type}`);
  }
}

// Class for dealing with conversions between lat/lng, phi/theta, and x/y/z as well
// as operations on the various forms.
// Consider properties on this class to be immutable.  Changing, say, 'x' will not
// update `phi` or `theta` and will throw normalization out of whack.
class Coordinate {
  constructor (phi, theta, x, y, z) {
    this.phi = phi;
    this.theta = theta;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static fromLatLng (...args) {
    let lat;
    let lng;

    if (args.length === 1) {
      const point = parseOrdinateString(args.toString());
      [lat, lng] = (point);
    } else {
      [lat, lng] = (args);
    }
    return Coordinate.fromPhiTheta(lat * DEG_TO_RAD, lng * DEG_TO_RAD);
  }

  static fromPhiTheta (phi, theta) {
    let newPhi = phi;
    let newTheta = theta;
    const { PI, cos, sin } = Math;

    const origTheta = newTheta;

    // Normalize phi to the interval [-PI / 2, PI / 2]
    while (newPhi >= PI) { newPhi -= 2 * PI; }
    while (newPhi < PI) { newPhi += 2 * PI; }

    if (newPhi > (PI / 2)) {
      newPhi = PI - newPhi;
      newTheta += PI;
    }
    if (newPhi < (-PI / 2)) {
      newPhi = -PI - newPhi;
      newTheta += PI;
    }

    while (newTheta >= PI) { newTheta -= 2 * PI; }
    while (newTheta < -PI) { newTheta += 2 * PI; }

    // Maintain the same sign as the original when theta is +/- PI
    if ((newTheta === -PI) && (origTheta > 0)) { newTheta = PI; }

    // At the poles, preserve the input longitude
    if (Math.abs(newPhi) === (PI / 2)) { newTheta = origTheta; }

    const x = cos(newPhi) * cos(newTheta);
    const y = cos(newPhi) * sin(newTheta);
    const z = sin(newPhi);

    return new Coordinate(newPhi, newTheta, x, y, z);
  }

  // +X axis passes through the (anti-)meridian at the equator
  // +Y axis passes through 90 degrees longitude at the equator
  // +Z axis passes through the north pole
  static fromXYZ (x, y, z) {
    let newX = x;
    let newY = y;
    let newZ = z;
    let d = (newX * newX) + (newY * newY) + (newZ * newZ);
    if (d === 0) {
      newX = 1;
      d = 1;
    } // Should never happen, but stay safe

    // We normalize so that x, y, and z fall on a unit sphere
    const scale = 1 / Math.sqrt(d);
    newX *= scale;
    newY *= scale;
    newZ *= scale;

    const theta = Math.atan2(newY, newX);
    const phi = Math.asin(newZ);

    return new Coordinate(phi, theta, newX, newY, newZ);
  }

  // Dot product
  dot (other) {
    return (this.x * other.x) + (this.y * other.y) + (this.z * other.z);
  }

  // Normalized cross product
  cross (other) {
    const x = (this.y * other.z) - (this.z * other.y);
    const y = (this.z * other.x) - (this.x * other.z);
    const z = (this.x * other.y) - (this.y * other.x);
    return Coordinate.fromXYZ(x, y, z);
  }

  // Distance to other coordinate on a unit sphere.
  // Same as the angle between the two points at the origin.
  distanceTo (other) {
    return Math.acos(this.dot(other));
  }

  toLatLng () {
    const lat = RAD_TO_DEG * this.phi;
    const lng = RAD_TO_DEG * this.theta;
    return { lat, lng };
  }

  toString () {
    const latlng = this.toLatLng();
    return `(${latlng.lat.toFixed(3)}, ${latlng.lng.toFixed(3)})`;
  }

  toXYZString () {
    return `<${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)}>`;
  }
}

module.exports = {
  convertGeometryToCMR,
  Coordinate
};
