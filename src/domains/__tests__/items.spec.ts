import chai from "chai";
const { expect } = chai;

import { granuleToStac } from "../items";
import { generateGranules } from "../../utils/testUtils";

const [baseGranule] = generateGranules(1);

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
        id: baseGranule.title,
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
        bbox: [-26.1081458, 29.8680955, -11.4859874, 40.0118589],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "short_1",
        links: [
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.json",
            rel: "via",
            title: "CMR JSON metadata for item",
            type: "application/json",
          },
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.umm_json",
            rel: "via",
            title: "CMR UMM_JSON metadata for item",
            type: "application/vnd.nasa.cmr.umm+json",
          },
        ],
        assets: {
          B09: {
            description: "Browse image for Earthdata Search",
            href: "ftp://e4ftl014.cr.usgs.gov/MODIS_Composites/MOTA/.B09.tif",
            title: "Direct Download [0]",
            roles: ["data"],
          },
          asset_key: {
            description: "Example of bad url data",
            href: "ftp://e4ftl015/ExampleBadUrl",
            title: "Direct Download [1]",
            roles: ["data"],
          },
          provider_metadata: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf.xml",
            description: "metadata",
            title: "Provider Metadata",
            roles: ["metadata"],
          },
          thumbnail_0: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.vinr.img",
            title: "Thumbnail [0]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
          thumbnail_1: {
            href: "ftp://e4ftl012/ExampleBadUrl",
            title: "Thumbnail [1]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
        },
      });
    });
  });

  describe("given it has single box geometry", () => {
    it("should return a STACItem", () => {
      const item = granuleToStac({
        ...baseGranule,
        //         S    E   N   W
        boxes: ["-60 -180  50 170"],
      });

      expect(item).to.deep.equal({
        type: "Feature",
        id: baseGranule.title,
        stac_version: "1.0.0",
        stac_extensions: [],
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -60],
              [170, -60],
              [170, 50],
              [-180, 50],
              [-180, -60],
            ],
          ],
        },
        bbox: [-180, -60, 170, 50],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "short_1",
        links: [
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.json",
            rel: "via",
            title: "CMR JSON metadata for item",
            type: "application/json",
          },
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.umm_json",
            rel: "via",
            title: "CMR UMM_JSON metadata for item",
            type: "application/vnd.nasa.cmr.umm+json",
          },
        ],
        assets: {
          B09: {
            description: "Browse image for Earthdata Search",
            href: "ftp://e4ftl014.cr.usgs.gov/MODIS_Composites/MOTA/.B09.tif",
            title: "Direct Download [0]",
            roles: ["data"],
          },
          asset_key: {
            description: "Example of bad url data",
            href: "ftp://e4ftl015/ExampleBadUrl",
            title: "Direct Download [1]",
            roles: ["data"],
          },
          provider_metadata: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf.xml",
            description: "metadata",
            title: "Provider Metadata",
            roles: ["metadata"],
          },
          thumbnail_0: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.vinr.img",
            title: "Thumbnail [0]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
          thumbnail_1: {
            href: "ftp://e4ftl012/ExampleBadUrl",
            title: "Thumbnail [1]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
        },
      });
    });
  });

  describe("given it has single line geometry", () => {
    it("should return a STACItem", () => {
      const item = granuleToStac({
        ...baseGranule,
        lines: ["60.477742 -42.915595 65.941741 -18.370675 65.751188 11.618598"],
      });

      expect(item).to.deep.equal({
        type: "Feature",
        id: baseGranule.title,
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
        bbox: [-42.915595, 60.477742, 11.618598, 65.941741],
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
        },
        collection: "short_1",
        links: [
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.json",
            rel: "via",
            title: "CMR JSON metadata for item",
            type: "application/json",
          },
          {
            href: "undefined/search/concepts/G000000000-TEST_PROV.umm_json",
            rel: "via",
            title: "CMR UMM_JSON metadata for item",
            type: "application/vnd.nasa.cmr.umm+json",
          },
        ],
        assets: {
          B09: {
            description: "Browse image for Earthdata Search",
            href: "ftp://e4ftl014.cr.usgs.gov/MODIS_Composites/MOTA/.B09.tif",
            title: "Direct Download [0]",
            roles: ["data"],
          },
          asset_key: {
            description: "Example of bad url data",
            href: "ftp://e4ftl015/ExampleBadUrl",
            title: "Direct Download [1]",
            roles: ["data"],
          },
          provider_metadata: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf.xml",
            description: "metadata",
            title: "Provider Metadata",
            roles: ["metadata"],
          },
          thumbnail_0: {
            href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.vinr.img",
            title: "Thumbnail [0]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
          thumbnail_1: {
            href: "ftp://e4ftl012/ExampleBadUrl",
            title: "Thumbnail [1]",
            description: "Browse image for Earthdata Search",
            roles: ["thumbnail"],
          },
        },
      });
    });
  });
});
