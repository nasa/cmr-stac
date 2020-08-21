// import { Coordinate } from './coordinate';
// import { Arc } from './arc';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

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

  static fromLngLat (...args) {
    console.log(`args: ${args}`);
    console.log(args.length);
    let lat;
    let lng;
    if (args.length === 1) {
      const point = [...args];
      [lng, lat] = [point[0], point[1]];
    } else {
      [lng, lat] = (args);
    }
    console.log(`Longitude: ${lng}, Lat: ${lat}`);
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

// Class for dealing with operations on great circle arcs
class Arc {
  /**
   * @param coordA - Coordinate object
   * @param coordB - Coordinate object
   */
  constructor (coordA, coordB) {
    let newCoordA = coordA;
    let newCoordB = coordB;
    if (newCoordB.theta < newCoordA.theta) {
      [newCoordB, newCoordA] = Array.from([newCoordA, newCoordB]);
    }

    if (Math.abs(newCoordB.theta - newCoordA.theta) > Math.PI) {
      this.coordB = newCoordA;
      this.coordA = newCoordB;
    } else {
      this.coordA = newCoordA;
      this.coordB = newCoordB;
    }
    this.normal = this.coordA.cross(this.coordB);
  }

  /**
   * @returns Coordinate object
   */
  inflection () {
    const normal = this.normal.toLatLng();

    const southInflectionLat = -90 + Math.abs(normal.lat);
    const northInflectionLat = -southInflectionLat;

    const southInflectionLon = normal.lng;
    let northInflectionLon = normal.lng + 180;
    if (northInflectionLon > 180) {
      northInflectionLon -= 360;
    }

    if (this.coversLongitude(northInflectionLon)) {
      return Coordinate.fromLngLat(northInflectionLon, northInflectionLat);
    }
    if (this.coversLongitude(southInflectionLon)) {
      return Coordinate.fromLngLat(southInflectionLon, southInflectionLat);
    }
    return null;
  }

  coversLongitude (lon) {
    const theta = (lon * Math.PI) / 180.0;
    const thetaMin = Math.min(this.coordA.theta, this.coordB.theta);
    const thetaMax = Math.max(this.coordA.theta, this.coordB.theta);
    if (Math.abs(thetaMax - thetaMin) < Math.PI) {
      return thetaMin < theta && theta < thetaMax;
    }
    return (theta > thetaMax) || (theta < thetaMin);
  }
}

/**
 * FIXME:
 * This is bad, we need to move everything above this line into separate files.
 * Jest was throwing errors at the import keyword, and we ran out of time to do an
 * elegant fix.
 */

/**
 * Circular max
 * @param lng0 - the first longitude
 * @param lng1 - the second longitude
 * @returns max - the right most longitude of the shortest arc joining the given longitudes
 */
function circularMax (lng0, lng1) {
  const [left, right] = Array.from(lng0 < lng1 ? [lng0, lng1] : [lng1, lng0]);
  if ((right - left) < 180) {
    return right;
  }
  return left;
}

/**
 * Circular min
 * @param lng0 - the first longitude
 * @param lng1  - the second longitude
 * @returns min - the left most longitude of the shortest arc joining the given longitudes
 */
function circularMin (lng0, lng1) {
  if (circularMax(lng0, lng1) === lng1) {
    return lng0;
  }
  return lng1;
}

/**
 * Finds simple bounding box with inflection to account for geodesic mapping
 * @param points - an array of [lon, lat] coordinate pairs
 * @returns a bounding box in the form
 */
function inflectBox (points) {
  let minLat = 91;
  let maxLat = -91;
  let minLng = 181;
  let maxLng = -181;

  const coords = (points.map((point) => Coordinate.fromLngLat(point)));

  const len = coords.length;
  const latLngsWithInflections = [];
  coords.forEach((coord, i) => {
    latLngsWithInflections.push(coord.toLatLng());
    const next = coords[(i + 1) % len];
    const inflection = new Arc(coord, next).inflection();
    if (inflection) {
      const latLng = inflection.toLatLng();
      if (Math.abs(latLng.lat) !== 90) {
        // Has an inflection point, and it's not at the pole (which is handled
        // separately for MBRs)
        latLngsWithInflections.push(latLng);
      }
    }
  });

  const first = latLngsWithInflections[0];
  maxLat = first.lat;
  minLat = maxLat;
  maxLng = first.lng;
  minLng = maxLng;

  latLngsWithInflections.slice(1).forEach(({ lat, lng }) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    if (Math.abs(lat) !== 90) {
      minLng = circularMin(minLng, lng);
      maxLng = circularMax(maxLng, lng);
    } else {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  });

  return [minLat, minLng, maxLat, maxLng];
}

module.exports = {
  inflectBox
};
