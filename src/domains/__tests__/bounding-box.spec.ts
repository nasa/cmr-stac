import { expect } from "chai";
import { SpatialExtent } from "../../@types/StacCollection";
import {
  addPointsToBbox,
  mergeBoxes,
  crossesAntimeridian,
  reorderBoxValues,
  WHOLE_WORLD_BBOX_STAC,
} from "../bounding-box";

describe("reorderBoxValues", () => {
  describe("given a box in CMR format", () => {
    it("should return a box in STAC format", () => {
      expect(reorderBoxValues([1, 2, 3, 4])).to.deep.equal([2, 1, 4, 3]);
    });
  });

  describe("given null", () => {
    it("should return null", () => {
      expect(reorderBoxValues(null)).to.be.null;
    });
  });

  describe("given a 3d bounding box", () => {
    it("should return a 2d bounding box", () => {
      expect(reorderBoxValues([1, 2, 0, 4, 5, 99])).to.be.deep.equal([
        2, 1, 5, 4,
      ]);
    });
  });
});

describe("bbox", () => {
  const testBbox: SpatialExtent = [-10, -10, 10, 10];
  const testBbox2: SpatialExtent = [-20, 10, 44, 7];
  const points: { lat: number; lon: number }[] = [
    { lon: 100, lat: 20 },
    { lon: 5, lat: -5 },
  ];
  const lotsOfPoints: { lat: number; lon: number }[] = [
    { lon: 100, lat: 20 },
    { lon: 5, lat: -5 },
    { lon: -40, lat: 73 },
  ];

  describe("addPointsToBbox", () => {
    it("should create the largest bbox", () => {
      expect(addPointsToBbox([...testBbox], points)).to.deep.equal([
        -10, -10, 100, 20,
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
      expect(
        addPointsToBbox(WHOLE_WORLD_BBOX_STAC, lotsOfPoints)
      ).to.deep.equal(WHOLE_WORLD_BBOX_STAC);
    });

    it("should merge the boxes", () => {
      expect(
        addPointsToBbox(
          [1, 2, 3, 4],
          [
            { lat: 5, lon: 6 },
            { lat: 7, lon: 8 },
          ]
        )
      ).to.deep.equal([1, 2, 8, 7]);
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
      expect(mergeBoxes(testBbox, WHOLE_WORLD_BBOX_STAC)).to.deep.equal(
        WHOLE_WORLD_BBOX_STAC
      );
    });

    it("should return a mix of the two testBoxes, making the largest possible box", () => {
      expect(mergeBoxes(testBbox, testBbox2)).to.have.ordered.members([
        -20, -10, 44, 10,
      ]);
    });
  });

  describe("crossesAntimeridian", () => {
    const amBox: SpatialExtent = [170, -10, -175, 5];
    const nonAmBox: SpatialExtent = [-150, -60, -130, -40];

    it("should return true if box crosses the antimeridian", () => {
      expect(crossesAntimeridian(amBox)).to.equal(true);
    });

    it("should return false if box does not cross antimeridian", () => {
      expect(crossesAntimeridian(nonAmBox)).to.equal(false);
    });
  });
});
