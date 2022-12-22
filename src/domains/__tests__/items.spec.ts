import { expect } from "chai";

import { granuleToStac } from "../items";
import { generateGranules } from "../../utils/testUtils";

const baseGranule = generateGranules(1)[0];

describe("granuleToStac", () => {
  describe("given it has single polygon geometry", () => {
    it("should return a STACItem", () => {
      const item = granuleToStac({
        ...baseGranule,
        polygons: [
          [
            "29.877883 -11.4859874 40.0118589 -12.9884453 40 -26.1081458 29.8680955 -23.0765216 29.877883 -11.4859874",
          ],
        ],
      });

      expect(item).to.deep.equal({
        type: "Feature",
        id: baseGranule.conceptId,
        stac_version: "1.0.0",
        stac_extensions: [],
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-11.4859874, 29.877883],
              [-12.9884453, 40.0118589],
              [-26.1081458, 40],
              [-23.0765216, 29.8680955],
              [-11.4859874, 29.877883],
            ],
          ],
        },
        bbox: [-26.108146, 29.868095, -11.485987, 40.191402],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "C9876543210-TEST_PROV",
      });
    });
  });

  describe("given it has single box geometry", () => {
    it("should return a STACItem", () => {
      const item = granuleToStac({
        ...baseGranule,
        boxes: ["-60 -180 90 180"],
      });

      expect(item).to.deep.equal({
        type: "Feature",
        id: baseGranule.conceptId,
        stac_version: "1.0.0",
        stac_extensions: [],
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -60],
              [180, -60],
              [180, 90],
              [-180, 90],
              [-180, -60],
            ],
          ],
        },
        bbox: [-180, -60, 180, 90],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "C9876543210-TEST_PROV",
      });
    });
  });

  describe("given it has single line geometry", () => {
    it("should return a STACItem", () => {
      const item = granuleToStac({
        ...baseGranule,
        lines: [
          "60.477742 -42.915595 65.941741 -18.370675 65.751188 11.618598",
        ],
      });

      expect(item).to.deep.equal({
        type: "Feature",
        id: baseGranule.conceptId,
        stac_version: "1.0.0",
        stac_extensions: [],
        geometry: {
          type: "LineString",
          coordinates: [
            [-42.915595, 60.477742],
            [-18.370675, 65.941741],
            [11.618598, 65.751188],
          ],
        },
        bbox: [60.477742, -42.915595, 65.941741, 11.618598],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "C9876543210-TEST_PROV",
      });
    });
  });
});