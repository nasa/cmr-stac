import { expect } from "chai";
import {
  cmrPolygonToGeoJsonCoordinates,
  cmrBoxToGeoJsonPolygonCoordinates,
  polygonToGeoJSON,
  boxToGeoJSON,
  pointsToGeoJSON,
  linesToGeoJSON,
  stringToGeoJSON,
  cmrSpatialToGeoJSONGeometry,
} from "../geojson";
import { InvalidParameterError } from "../../models/errors";

describe("cmrPolygonToGeoJsonCoordinates", () => {
  describe("given a single polygon string", () => {
    it("should return a valid set of coordinates", () => {
      // lat1 lon1 lat2 lon2...
      const polygonStr = ["-10 -10   -10 10   10 10   10 -10   -10 -10"];
      expect(cmrPolygonToGeoJsonCoordinates(polygonStr)).to.deep.equal([
        [
          [-10, -10],
          [10, -10],
          [10, 10],
          [-10, 10],
          [-10, -10],
        ],
      ]);
    });
  });

  it("should convert lat/lon to lon/lat format", () => {
    const polygonStr = ["0 0 1 1 2 2 0 0"];
    const result = cmrPolygonToGeoJsonCoordinates(polygonStr);
    expect(result[0][0]).to.deep.equal([0, 0]);
    expect(result[0][1]).to.deep.equal([1, 1]);
  });

  it("should handle multiple polygons", () => {
    const polygons = ["-10 -10 -10 10 10 10 10 -10 -10 -10", "0 0 0 5 5 5 5 0 0 0"];
    const result = cmrPolygonToGeoJsonCoordinates(polygons);
    expect(result).to.have.lengthOf(2);
  });

  it("should handle decimal coordinates", () => {
    const polygonStr = ["1.5 2.5 3.5 4.5 5.5 6.5 1.5 2.5"];
    const result = cmrPolygonToGeoJsonCoordinates(polygonStr);
    expect(result[0][0]).to.deep.equal([2.5, 1.5]);
    expect(result[0][1]).to.deep.equal([4.5, 3.5]);
  });
});

describe("cmrBoxToGeoJsonPolygonCoordinates", () => {
  it("should convert a 4-coordinate box to polygon coordinates", () => {
    const box = "1 2 3 4";
    const result = cmrBoxToGeoJsonPolygonCoordinates(box);
    expect(result).to.be.an("array");
    expect(result[0]).to.have.lengthOf(5);
  });

  it("should throw error for invalid box with wrong coordinate count", () => {
    const box = "1 2 3";
    expect(() => cmrBoxToGeoJsonPolygonCoordinates(box)).to.throw();
  });

  it("should create a closed polygon (first and last points match)", () => {
    const box = "1 2 3 4";
    const result = cmrBoxToGeoJsonPolygonCoordinates(box);
    expect(result[0][0]).to.deep.equal(result[0][4]);
  });

  it("should handle negative coordinates", () => {
    const box = "-10 -20 10 20";
    const result = cmrBoxToGeoJsonPolygonCoordinates(box);
    expect(result).to.not.be.null;
  });

  it("should handle decimal coordinates", () => {
    const box = "1.5 2.5 3.5 4.5";
    const result = cmrBoxToGeoJsonPolygonCoordinates(box);
    expect(result).to.not.be.null;
  });

  it("should throw error for box with 6 coordinates", () => {
    const box = "1 2 3 4 5 6";
    expect(() => cmrBoxToGeoJsonPolygonCoordinates(box)).to.throw();
  });
});

describe("polygonToGeoJSON", () => {
  it("should return null for empty polygon array", () => {
    const result = polygonToGeoJSON([]);
    expect(result).to.be.null;
  });

  it("should return Polygon geometry for single polygon", () => {
    const polygons = [["-10 -10 -10 10 10 10 10 -10 -10 -10"]];
    const result = polygonToGeoJSON(polygons);
    expect(result?.type).to.equal("Polygon");
  });

  it("should return MultiPolygon geometry for multiple polygons", () => {
    const polygons = [
      ["-10 -10 -10 10 10 10 10 -10 -10 -10"],
      ["0 0 0 5 5 5 5 0 0 0"],
    ];
    const result = polygonToGeoJSON(polygons);
    expect(result?.type).to.equal("MultiPolygon");
  });

  it("should include coordinates in the geometry", () => {
    const polygons = [["-10 -10 -10 10 10 10 10 -10 -10 -10"]];
    const result = polygonToGeoJSON(polygons);
    expect(result).to.have.property("coordinates");
  });
});

describe("boxToGeoJSON", () => {
  it("should return null for empty box array", () => {
    const result = boxToGeoJSON([]);
    expect(result).to.be.null;
  });

  it("should return Polygon geometry for single box", () => {
    const boxes = ["1 2 3 4"];
    const result = boxToGeoJSON(boxes);
    expect(result?.type).to.equal("Polygon");
  });

  it("should return MultiPolygon geometry for multiple boxes", () => {
    const boxes = ["1 2 3 4", "5 6 7 8"];
    const result = boxToGeoJSON(boxes);
    expect(result?.type).to.equal("MultiPolygon");
  });

  it("should include coordinates in the geometry", () => {
    const boxes = ["1 2 3 4"];
    const result = boxToGeoJSON(boxes);
    expect(result).to.have.property("coordinates");
  });
});

describe("pointsToGeoJSON", () => {
  it("should return null for empty points array", () => {
    const result = pointsToGeoJSON([]);
    expect(result).to.be.null;
  });

  it("should return Point geometry for single point", () => {
    const points = ["10 20"];
    const result = pointsToGeoJSON(points);
    expect(result?.type).to.equal("Point");
  });

  it("should return MultiPoint geometry for multiple points", () => {
    const points = ["10 20", "30 40"];
    const result = pointsToGeoJSON(points);
    expect(result?.type).to.equal("MultiPoint");
  });

  it("should convert lat/lon to lon/lat format", () => {
    const points = ["10 20"];
    const result = pointsToGeoJSON(points);
    expect((result as any)?.coordinates).to.deep.equal([20, 10]);
  });

  it("should include coordinates in the geometry", () => {
    const points = ["10 20"];
    const result = pointsToGeoJSON(points);
    expect(result).to.have.property("coordinates");
  });

  it("should handle negative coordinates", () => {
    const points = ["-10 -20", "-30 -40"];
    const result = pointsToGeoJSON(points);
    expect(result?.type).to.equal("MultiPoint");
  });
});

describe("linesToGeoJSON", () => {
  it("should return null for empty lines array", () => {
    const result = linesToGeoJSON([]);
    expect(result).to.be.null;
  });

  it("should return LineString geometry for single line", () => {
    const lines = ["10 20 30 40"];
    const result = linesToGeoJSON(lines);
    expect(result?.type).to.equal("LineString");
  });

  it("should return MultiLineString geometry for multiple lines", () => {
    const lines = ["10 20 30 40", "50 60 70 80"];
    const result = linesToGeoJSON(lines);
    expect(result?.type).to.equal("MultiLineString");
  });

  it("should include coordinates in the geometry", () => {
    const lines = ["10 20 30 40"];
    const result = linesToGeoJSON(lines);
    expect(result).to.have.property("coordinates");
  });

  it("should convert lat/lon to lon/lat format", () => {
    const lines = ["10 20 30 40"];
    const result = linesToGeoJSON(lines);
    expect((result as any)?.coordinates[0][0]).to.deep.equal([20, 10]);
  });
});

describe("stringToGeoJSON", () => {
  it("should parse valid GeoJSON string", () => {
    const geojsonStr = '{"type":"Point","coordinates":[0,0]}';
    const result = stringToGeoJSON(geojsonStr);
    expect(result.type).to.equal("Point");
  });

  it("should throw InvalidParameterError for missing type", () => {
    const geojsonStr = '{"coordinates":[0,0]}';
    expect(() => stringToGeoJSON(geojsonStr)).to.throw(InvalidParameterError);
  });

  it("should throw InvalidParameterError for missing coordinates", () => {
    const geojsonStr = '{"type":"Point"}';
    expect(() => stringToGeoJSON(geojsonStr)).to.throw(InvalidParameterError);
  });

  it("should throw InvalidParameterError for invalid JSON", () => {
    const geojsonStr = "not valid json";
    expect(() => stringToGeoJSON(geojsonStr)).to.throw(InvalidParameterError);
  });

  it("should preserve coordinates array in result", () => {
    const geojsonStr = '{"type":"Point","coordinates":[10,20]}';
    const result = stringToGeoJSON(geojsonStr);
    expect(result.coordinates).to.deep.equal([10, 20]);
  });

  it("should handle Polygon geometry", () => {
    const geojsonStr = '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}';
    const result = stringToGeoJSON(geojsonStr);
    expect(result.type).to.equal("Polygon");
  });

  it("should handle MultiPoint geometry", () => {
    const geojsonStr = '{"type":"MultiPoint","coordinates":[[0,0],[1,1]]}';
    const result = stringToGeoJSON(geojsonStr);
    expect(result.type).to.equal("MultiPoint");
  });
});

describe("cmrSpatialToGeoJSONGeometry", () => {
  it("should return null for empty geometry object", () => {
    const result = cmrSpatialToGeoJSONGeometry({} as any);
    expect(result).to.be.null;
  });

  it("should prioritize polygons over other geometries", () => {
    const cmrData = {
      polygons: [["-10 -10 -10 10 10 10 10 -10 -10 -10"]],
      boxes: ["1 2 3 4"],
      points: ["10 20"],
      lines: ["10 20 30 40"],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("Polygon");
  });

  it("should use boxes when polygons are not available", () => {
    const cmrData = {
      boxes: ["1 2 3 4"],
      points: ["10 20"],
      lines: ["10 20 30 40"],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("Polygon");
  });

  it("should use points when polygons and boxes are not available", () => {
    const cmrData = {
      points: ["10 20"],
      lines: ["10 20 30 40"],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("Point");
  });

  it("should use lines when only lines are available", () => {
    const cmrData = {
      lines: ["10 20 30 40"],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("LineString");
  });

  it("should return Polygon for single polygon", () => {
    const cmrData = {
      polygons: [["-10 -10 -10 10 10 10 10 -10 -10 -10"]],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("Polygon");
  });

  it("should return MultiPolygon for multiple polygons", () => {
    const cmrData = {
      polygons: [
        ["-10 -10 -10 10 10 10 10 -10 -10 -10"],
        ["0 0 0 5 5 5 5 0 0 0"],
      ],
    };
    const result = cmrSpatialToGeoJSONGeometry(cmrData as any);
    expect(result?.type).to.equal("MultiPolygon");
  });
});
