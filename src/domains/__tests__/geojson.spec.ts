import { expect } from "chai";
import { cmrPolygonToGeoJsonCoordinates } from "../geojson";

describe("cmrPolygonToGeoJsonCoordinates", () => {
  describe("given a single polygon string", () => {
    it("should return a valid set of coordinates", () => {
      // lat1 lon1 lat2 lon2...
      const polygonStr = ["-10 -10   -10 10   10 10   10 -10   -10 -10"];
      expect(cmrPolygonToGeoJsonCoordinates(polygonStr)).to.deep.equal([
        [
          [-10, -10],
          [-10, 10],
          [10, 10],
          [10, -10],
          [-10, -10],
        ],
      ]);
    });
  });
});
