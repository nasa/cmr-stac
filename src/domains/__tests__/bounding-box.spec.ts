import { expect } from "chai";

import {
  addPointsToBbox,
  mergeBoxes,
  reorderBoxValues,
  crossesAntimeridian,
} from "../bounding-box";

describe("bbox", () => {
  const testBbox = [-10, -10, 10, 10];
  const testBbox2 = [-20, 10, 44, 7];
  const points = [
    [100, 20],
    [5, -5],
  ];
  const lotsOfPoints = [
    [100, 20],
    [5, -5],
    [-40, 73],
  ];
  const WHOLE_WORLD_BBOX = [-180, -90, 180, 90];

  describe("reorderBoxValues", () => {
    const cmrWorldBox = [-90, -180, 90, 180];

    it("should reorder the box values to be [minLon, minLat, maxLon, maxLat]", () => {
      expect(reorderBoxValues(cmrWorldBox)).to.deep.equal(WHOLE_WORLD_BBOX);
    });
  });

  describe("addPointsToBbox", () => {
    it("should create the largest bbox", () => {
      expect(addPointsToBbox(testBbox, points)).to.deep.equal([
        -10, -10, 100, 20,
      ]);
    });

    it("should return the largest box possible from points", () => {
      expect(addPointsToBbox([], points)).to.deep.equal([5, -5, 100, 20]);
    });

    it("should return the biggest box possible from lotsOfPoints", () => {
      expect(addPointsToBbox([], lotsOfPoints)).to.deep.equal([
        -40, -5, 100, 73,
      ]);
    });

    it("should return the largest box possible from points", () => {
      expect(addPointsToBbox(null, points)).to.deep.equal([5, -5, 100, 20]);
    });

    it("should return the biggest box possible from lotsOfPoints", () => {
      expect(addPointsToBbox(null, lotsOfPoints)).to.deep.equal([
        -40, -5, 100, 73,
      ]);
    });

    it("should return the largest box", () => {
      expect(addPointsToBbox(testBbox, lotsOfPoints)).to.deep.equal([
        -40, -10, 100, 73,
      ]);
    });

    it("should return the WHOLE_WORLD_BOX", () => {
      expect(addPointsToBbox(WHOLE_WORLD_BBOX, lotsOfPoints)).to.deep.equal(
        WHOLE_WORLD_BBOX
      );
    });

    it("should merge the boxes", () => {
      expect(
        addPointsToBbox(
          [1, 2, 3, 4],
          [
            [5, 6],
            [7, 8],
          ]
        )
      ).to.deep.equal([1, 2, 7, 8]);
    });
  });

  describe("mergeBoxes", () => {
    describe("given the first box is null", () => {
      it("should return the second box", () => {
        expect(mergeBoxes(null, testBbox)).to.deep.equal(testBbox);
      });
    });

    describe("given the second box is null", () => {
      it("should return the first box", () => {
        expect(mergeBoxes(testBbox, null)).to.deep.equal(testBbox);
      });
    });

    describe("both boxes are null", () => {
      it("should return null", () => {
        expect(mergeBoxes(null, null)).to.be.null;
      });
    });

    it("should return the WHOLE_WORLD_BBOX", () => {
      expect(mergeBoxes(testBbox, WHOLE_WORLD_BBOX)).to.deep.equal(
        WHOLE_WORLD_BBOX
      );
    });

    it("should return a mix of the two testBoxes, making the largest possible box", () => {
      expect(mergeBoxes(testBbox, testBbox2)).to.have.ordered.members([
        -20, -10, 44, 10,
      ]);
    });
  });

  describe("crossesAntimeridian", () => {
    const amBox = [170, -10, -175, 5];
    const nonAmBox = [-150, -60, -130, -40];

    it("should return true if box crosses the antimeridian", () => {
      expect(crossesAntimeridian(amBox)).to.equal(true);
    });

    it("should return false if box does not cross antimeridian", () => {
      expect(crossesAntimeridian(nonAmBox)).to.equal(false);
    });
  });
});
