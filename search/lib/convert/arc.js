const { Coordinate } = require('./coordinate');

// Class for dealing with operations on great circle arcs
class Arc {
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
      return Coordinate.fromLatLng(northInflectionLat, northInflectionLon);
    }
    if (this.coversLongitude(southInflectionLon)) {
      return Coordinate.fromLatLng(southInflectionLat, southInflectionLon);
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

module.exports = {
  Arc
};
