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
              [29.877883, -11.4859874],
              [40.0118589, -12.9884453],
              [40, -26.1081458],
              [29.8680955, -23.0765216],
              [29.877883, -11.4859874],
            ],
          ],
        },
        bbox: [-26.1081458, 29.8680955, -11.4859874, 40.0118589],
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
        //         S    W   N   E
        boxes: ["-60 -180  50 170"],
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
              [170, -60],
              [-180, -60],
              [-180, 50],
              [170, 50],
              [170, -60],
            ],
          ],
        },
        bbox: [-180, -60, 170, 50],
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
            [60.477742, -42.915595],
            [65.941741, -18.370675],
            [65.751188, 11.618598],
          ],
        },
        bbox: [-42.915595, 60.477742, 11.618598, 65.941741],
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
