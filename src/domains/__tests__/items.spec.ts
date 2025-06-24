import chai from "chai";
const { expect } = chai;

import { granuleToStac } from "../items";
import { generateGranules } from "../../utils/testUtils";
import { RelatedUrlType, UrlContentType } from "../../models/GraphQLModels";

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
        collection: "TEST_COLLECTION_1",
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
          metadata: {
            href: "undefined/search/concepts/G000000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for G000000000-TEST_PROV",
            type: "application/xml",
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
        collection: "TEST_COLLECTION_1",
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
          metadata: {
            href: "undefined/search/concepts/G000000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for G000000000-TEST_PROV",
            type: "application/xml",
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
        collection: "TEST_COLLECTION_1",
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
          metadata: {
            href: "undefined/search/concepts/G000000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for G000000000-TEST_PROV",
            type: "application/xml",
          },
        },
      });
    });
  });
  describe("given it provides AWS S3 links in related urls", () => {
    it("should return a STACItem", () => {
      const [granule] = generateGranules(1);
      granule.relatedUrls?.push(
        {
          urlContentType: UrlContentType.DISTRIBUTION_URL,
          url: "s3://myBucket/path/to/object/A.01.tif",
          description: "S3 Download",
          type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        },
        {
          urlContentType: UrlContentType.DISTRIBUTION_URL,
          url: "s3://myBucket/path/to/object/A.02.tif",
          description: "S3 Download",
          type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        }
      );
      const item = granuleToStac(granule);
      expect(item).to.deep.equal({
        type: "Feature",
        id: granule.title,
        stac_version: "1.0.0",
        stac_extensions: ["https://stac-extensions.github.io/storage/v2.0.0/schema.json"],
        bbox: [-180, -90, 180, 90],
        geometry: null,
        properties: {
          datetime: "2009-09-14T00:00:00.000Z",
          start_datetime: "2009-09-14T00:00:00.000Z",
          end_datetime: "2010-09-14T00:00:00.000Z",
          "storage:schemes": {
            aws: {
              bucket: "myBucket",
              platform: "https://{bucket}.s3.{region}.amazonaws.com",
              region: "us-west-2",
              type: "aws-s3",
            },
          },
        },
        collection: "TEST_COLLECTION_1",
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
          s3_01: {
            href: "s3://myBucket/path/to/object/A.01.tif",
            title: "S3 Direct Download [0]",
            description: "S3 Download",
            roles: ["data"],
            "storage:refs": ["aws"],
          },
          s3_02: {
            href: "s3://myBucket/path/to/object/A.02.tif",
            title: "S3 Direct Download [1]",
            description: "S3 Download",
            roles: ["data"],
            "storage:refs": ["aws"],
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
          metadata: {
            href: "undefined/search/concepts/G000000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for G000000000-TEST_PROV",
            type: "application/xml",
          },
        },
      });
    });
  });
});
