import { expect } from "chai";
import { SpatialExtent } from "../../@types/StacCollection";
import {
  addPointsToBbox,
  mergeBoxes,
  crossesAntimeridian,
  reorderBoxValues,
  WHOLE_WORLD_BBOX_STAC,
  parseOrdinateString,
  pointStringToPoints,
  cmrSpatialToExtent,
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
      expect(reorderBoxValues([1, 2, 0, 4, 5, 99])).to.be.deep.equal([2, 1, 5, 4]);
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
      expect(addPointsToBbox([...testBbox], points)).to.deep.equal([-10, -10, 100, 20]);
    });

    it("should return the largest box possible from points", () => {
      expect(addPointsToBbox(null, points)).to.deep.equal([5, -5, 100, 20]);
    });

    it("should return the biggest box possible from lotsOfPoints", () => {
      expect(addPointsToBbox(null, lotsOfPoints)).to.deep.equal([-40, -5, 100, 73]);
    });

    it("should return the largest box possible from points", () => {
      expect(addPointsToBbox(null, points)).to.deep.equal([5, -5, 100, 20]);
    });

    it("should return the biggest box possible from lotsOfPoints", () => {
      expect(addPointsToBbox(null, lotsOfPoints)).to.deep.equal([-40, -5, 100, 73]);
    });

    it("should return the largest box", () => {
      expect(addPointsToBbox(testBbox, lotsOfPoints)).to.deep.equal([-40, -10, 100, 73]);
    });

    it("should return the WHOLE_WORLD_BOX", () => {
      expect(addPointsToBbox(WHOLE_WORLD_BBOX_STAC, lotsOfPoints)).to.deep.equal(
        WHOLE_WORLD_BBOX_STAC
      );
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
      expect(mergeBoxes(testBbox, WHOLE_WORLD_BBOX_STAC)).to.deep.equal(WHOLE_WORLD_BBOX_STAC);
    });

    it("should return a mix of the two testBoxes, making the largest possible box", () => {
      expect(mergeBoxes(testBbox, testBbox2)).to.have.ordered.members([-20, -10, 44, 10]);
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

describe("parseOrdinateString", () => {
  it("should parse space-separated ordinates", () => {
    expect(parseOrdinateString("1 2 3 4")).to.deep.equal([1, 2, 3, 4]);
  });

  it("should parse comma-separated ordinates", () => {
    expect(parseOrdinateString("1,2,3,4")).to.deep.equal([1, 2, 3, 4]);
  });

  it("should parse mixed separators", () => {
    expect(parseOrdinateString("1, 2 3,4")).to.deep.equal([1, 2, 3, 4]);
  });

  it("should parse decimal values", () => {
    expect(parseOrdinateString("1.5 2.5 3.5 4.5")).to.deep.equal([1.5, 2.5, 3.5, 4.5]);
  });

  it("should parse negative values", () => {
    expect(parseOrdinateString("-1.5 -2.5 -3.5 -4.5")).to.deep.equal([-1.5, -2.5, -3.5, -4.5]);
  });
});

describe("pointStringToPoints", () => {
  it("should convert lat lon string to points array", () => {
    expect(pointStringToPoints("10 20 30 40")).to.deep.equal([
      { lat: 10, lon: 20 },
      { lat: 30, lon: 40 },
    ]);
  });

  it("should handle comma-separated values", () => {
    expect(pointStringToPoints("10,20,30,40")).to.deep.equal([
      { lat: 10, lon: 20 },
      { lat: 30, lon: 40 },
    ]);
  });

  it("should handle single point", () => {
    expect(pointStringToPoints("10 20")).to.deep.equal([{ lat: 10, lon: 20 }]);
  });

  it("should handle negative coordinates", () => {
    expect(pointStringToPoints("-10 -20 -30 -40")).to.deep.equal([
      { lat: -10, lon: -20 },
      { lat: -30, lon: -40 },
    ]);
  });

  it("should handle mixed separators", () => {
    expect(pointStringToPoints("10, 20 30,40")).to.deep.equal([
      { lat: 10, lon: 20 },
      { lat: 30, lon: 40 },
    ]);
  });
});

describe("crossesAntimeridian - additional cases", () => {
  describe("2D bboxes", () => {
    it("should return true if box crosses the antimeridian", () => {
      expect(crossesAntimeridian([170, -10, -175, 5])).to.be.true;
    });

    it("should return false if box does not cross antimeridian", () => {
      expect(crossesAntimeridian([-150, -60, -130, -40])).to.be.false;
    });

    it("should return false for null", () => {
      expect(crossesAntimeridian(null)).to.be.false;
    });

    it("should return false for box at prime meridian", () => {
      expect(crossesAntimeridian([-30, -10, 30, 10])).to.be.false;
    });
  });

  describe("3D bboxes", () => {
    it("should return true for 3D bbox crossing antimeridian", () => {
      expect(crossesAntimeridian([170, -10, 0, -175, 5, 100])).to.be.true;
    });

    it("should return false for 3D bbox not crossing antimeridian", () => {
      expect(crossesAntimeridian([-150, -60, 0, -130, -40, 100])).to.be.false;
    });
  });
});

describe("mergeBoxes - additional cases", () => {
  const testBbox: SpatialExtent = [-10, -10, 10, 10];
  const testBbox2: SpatialExtent = [-20, 10, 44, 7];

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

  describe("antimeridian crossing cases", () => {
    it("should handle both boxes crossing antimeridian - non-overlapping", () => {
      const box1: SpatialExtent = [170, -10, -170, 10];
      const box2: SpatialExtent = [160, -20, -160, 20];
      expect(mergeBoxes(box1, box2)).to.deep.equal([160, -20, -160, 20]);
    });

    it("should handle both boxes crossing antimeridian - result covers world", () => {
      const box1: SpatialExtent = [170, -10, -170, 10];
      const box2: SpatialExtent = [100, -20, -100, 20];
      const result = mergeBoxes(box1, box2);
      expect(result).to.not.be.null;
      expect(result![0]).to.equal(-180);
      expect(result![2]).to.equal(180);
    });

    it("should handle one box crossing antimeridian - expand east", () => {
      const box1: SpatialExtent = [170, -10, -170, 10];
      const box2: SpatialExtent = [0, -20, 50, 20];
      const result = mergeBoxes(box1, box2);
      expect(result).to.not.be.null;
      expect(result![0]).to.equal(170);
      expect(result![2]).to.equal(-170);
    });

    it("should handle one box crossing antimeridian - expand west", () => {
      const box1: SpatialExtent = [170, -10, -170, 10];
      const box2: SpatialExtent = [-150, -20, -100, 20];
      const result = mergeBoxes(box1, box2);
      expect(result).to.not.be.null;
      expect(result![0]).to.equal(-150);
    });

    it("should handle box2 crossing antimeridian when box1 does not", () => {
      const box1: SpatialExtent = [-10, -10, 10, 10];
      const box2: SpatialExtent = [170, -10, -170, 10];
      const result = mergeBoxes(box1, box2);
      expect(result).to.not.be.null;
    });
  });

  describe("neither crosses antimeridian", () => {
    it("should expand to cross antimeridian if shorter", () => {
      const box1: SpatialExtent = [160, -10, 170, 10];
      const box2: SpatialExtent = [-170, -20, -160, 20];
      const result = mergeBoxes(box1, box2);
      expect(result).to.not.be.null;
      expect(result![0]).to.equal(-170);
      expect(result![2]).to.equal(170);
    });

    it("should keep normal format when crossing antimeridian is not shorter", () => {
      const box1: SpatialExtent = [0, -10, 10, 10];
      const box2: SpatialExtent = [5, -20, 15, 20];
      const result = mergeBoxes(box1, box2);
      expect(result).to.deep.equal([0, -20, 15, 20]);
    });
  });
});

describe("cmrSpatialToExtent", () => {
  it("should return WHOLE_WORLD_BBOX_STAC when no geometry provided", () => {
    const concept = {};
    expect(cmrSpatialToExtent(concept as any)).to.deep.equal([-180, -90, 180, 90]);
  });

  it("should extract extent from single polygon", () => {
    const concept = {
      polygons: [["10 20 30 40 50 60 10 20"]],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from multiple polygons", () => {
    const concept = {
      polygons: [["10 20 30 40 50 60 10 20"], ["0 0 100 100 200 200 0 0"]],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from single point", () => {
    const concept = {
      points: ["10 20"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.deep.equal([20, 10, 20, 10]);
  });

  it("should extract extent from multiple points", () => {
    const concept = {
      points: ["10 20", "30 40"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from single line", () => {
    const concept = {
      lines: ["10 20 30 40"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from multiple lines", () => {
    const concept = {
      lines: ["10 20 30 40", "50 60 70 80"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from single box", () => {
    const concept = {
      boxes: ["1 2 3 4"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should extract extent from multiple boxes", () => {
    const concept = {
      boxes: ["1 2 3 4", "5 6 7 8"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });

  it("should prioritize polygons over other geometry types", () => {
    const concept = {
      polygons: [["10 20 30 40 50 60 10 20"]],
      points: ["100 100"],
    };
    const result = cmrSpatialToExtent(concept as any);
    expect(result).to.not.be.null;
  });
});
