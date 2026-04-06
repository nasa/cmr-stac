import chai from "chai";
const { expect } = chai;
import * as sinon from "sinon";
import { Request } from "express";

import {
  granuleToStac,
  cloudCoverExtension,
  storageExtension,
  addProviderLinks,
  getItems,
  getItemIds,
} from "../items";
import { generateGranules } from "../../utils/testUtils";
import { RelatedUrlType, UrlContentType } from "../../models/GraphQLModels";
import { STACItem } from "../../@types/StacItem";

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

describe("cloudCoverExtension", () => {
  it("should return undefined when granule has no cloudCover", () => {
    const granule = { ...generateGranules(1)[0], cloudCover: null };
    const result = cloudCoverExtension(granule);
    expect(result).to.be.undefined;
  });

  it("should return undefined when granule cloudCover is undefined", () => {
    const granule = { ...generateGranules(1)[0] };
    delete (granule as any).cloudCover;
    const result = cloudCoverExtension(granule);
    expect(result).to.be.undefined;
  });

  it("should return extension object when granule has cloudCover", () => {
    const granule = { ...generateGranules(1)[0], cloudCover: 25 };
    const result = cloudCoverExtension(granule);
    expect(result).to.not.be.undefined;
    expect(result?.extension).to.equal("https://stac-extensions.github.io/eo/v1.0.0/schema.json");
    expect(result?.attributes).to.deep.equal({ "eo:cloud_cover": 25 });
  });

  it("should handle cloudCover value of 0", () => {
    const granule = { ...generateGranules(1)[0], cloudCover: 0 };
    const result = cloudCoverExtension(granule);
    expect(result).to.not.be.undefined;
    expect(result?.attributes).to.deep.equal({ "eo:cloud_cover": 0 });
  });

  it("should handle cloudCover value of 100", () => {
    const granule = { ...generateGranules(1)[0], cloudCover: 100 };
    const result = cloudCoverExtension(granule);
    expect(result?.attributes).to.deep.equal({ "eo:cloud_cover": 100 });
  });
});

describe("storageExtension", () => {
  it("should return undefined when granule has no relatedUrls", () => {
    const granule = { ...generateGranules(1)[0], relatedUrls: [] };
    const result = storageExtension(granule);
    expect(result).to.be.undefined;
  });

  it("should return undefined when no S3 URLs are found", () => {
    const granule = { ...generateGranules(1)[0] };
    granule.relatedUrls = [
      {
        url: "https://example.com/data",
        type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        description: ""
      },
    ];
    const result = storageExtension(granule);
    expect(result).to.be.undefined;
  });

  it("should return storage extension for S3 URLs", () => {
    const granule = { ...generateGranules(1)[0] };
    granule.relatedUrls = [
      {
        url: "s3://bucket/key",
        type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        description: ""
      },
    ];
    const result = storageExtension(granule);
    expect(result).to.not.be.undefined;
  });

  it("should ignore non-GET_DATA URLs", () => {
    const granule = { ...generateGranules(1)[0] };
    granule.relatedUrls = [
      {
        url: "s3://bucket/key",
        type: RelatedUrlType.VIEW_RELATED_INFORMATION,
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        description: ""
      },
    ];
    const result = storageExtension(granule);
    expect(result).to.be.undefined;
  });

  it("should handle multiple S3 URLs", () => {
    const granule = { ...generateGranules(1)[0] };
    granule.relatedUrls = [
      {
        url: "s3://bucket1/key1",
        type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        description: ""
      },
      {
        url: "s3://bucket2/key2",
        type: RelatedUrlType.GET_DATA_VIA_DIRECT_ACCESS,
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        description: ""
      },
    ];
    const result = storageExtension(granule);
    expect(result).to.not.be.undefined;
  });
});

describe("addProviderLinks", () => {
  let req: Partial<Request>;

  beforeEach(() => {
    req = {
      provider: { "provider-id": "TEST_PROVIDER" },
      baseUrl: "",
      originalUrl: "/stac/TEST_PROVIDER/collections/TEST_COLLECTION/items/TEST_ITEM",
    } as any;
  });

  it("should add self link to item", () => {
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const selfLink = result.links.find((l) => l.rel === "self");
    expect(selfLink).to.not.be.undefined;
    expect(selfLink?.href).to.include("/TEST_PROVIDER/collections/test-collection/items/test-item");
  });

  it("should add parent link to item", () => {
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const parentLink = result.links.find((l) => l.rel === "parent");
    expect(parentLink).to.not.be.undefined;
  });

  it("should add collection link to item", () => {
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const collectionLink = result.links.find((l) => l.rel === "collection");
    expect(collectionLink).to.not.be.undefined;
  });

  it("should add root link to item", () => {
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const rootLink = result.links.find((l) => l.rel === "root");
    expect(rootLink).to.not.be.undefined;
  });

  it("should add provider link to item", () => {
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const providerLink = result.links.find((l) => l.rel === "provider");
    expect(providerLink).to.not.be.undefined;
  });

  it("should preserve existing links", () => {
    const existingLinks = [{ rel: "custom", href: "http://example.com" }];
    const item = {
      id: "test-item",
      collection: "test-collection",
      links: existingLinks,
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    expect(result.links).to.include(existingLinks[0]);
  });

  it("should encode special characters in item ID", () => {
    const item = {
      id: "test item with spaces",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const selfLink = result.links.find((l) => l.rel === "self");
    expect(selfLink?.href).to.include("test%20item%20with%20spaces");
  });

  it("should encode special characters in collection ID", () => {
    const item = {
      id: "test-item",
      collection: "test collection/special",
      links: [],
    } as unknown as STACItem;

    const result = addProviderLinks(req as Request, item);
    const selfLink = result.links.find((l) => l.rel === "self");
    expect(selfLink?.href).to.include("test%20collection%2Fspecial");
  });

  it("should throw error when no provider in request", () => {
    const reqNoProvider = {
      baseUrl: "",
      originalUrl: "/stac/TEST_PROVIDER/collections/TEST_COLLECTION/items/TEST_ITEM",
    } as any;

    const item = {
      id: "test-item",
      collection: "test-collection",
      links: [],
    } as unknown as STACItem;

    expect(() => addProviderLinks(reqNoProvider as Request, item)).to.throw();
  });
});

describe("granuleToStac error cases", () => {
  it("should throw error when granule has no collection", () => {
    const [granule] = generateGranules(1);
    granule.collection = undefined as any;

    expect(() => granuleToStac(granule)).to.throw();
  });

  it("should throw error when granule has collection but no entryId", () => {
    const [granule] = generateGranules(1);
    (granule.collection as any).entryId = undefined;

    expect(() => granuleToStac(granule)).to.throw();
  });
});

describe("granuleToStac with points geometry", () => {
  it("should return a STACItem with Point geometry", () => {
    const [baseGranule] = generateGranules(1);
    const item = granuleToStac({
      ...baseGranule,
      points: ["10 20"],
    });

    expect(item.geometry?.type).to.equal("Point");
    expect(item.id).to.equal(baseGranule.title);
  });

  it("should return a STACItem with MultiPoint geometry", () => {
    const [baseGranule] = generateGranules(1);
    const item = granuleToStac({
      ...baseGranule,
      points: ["10 20", "30 40"],
    });

    expect(item.geometry?.type).to.equal("MultiPoint");
  });
});

describe("granuleToStac without time range", () => {
  it("should not include start_datetime and end_datetime when only timeStart is present", () => {
    const [baseGranule] = generateGranules(1);
    const item = granuleToStac({
      ...baseGranule,
      timeEnd: null,
    });

    expect((item.properties as any).start_datetime).to.be.undefined;
    expect((item.properties as any).end_datetime).to.be.undefined;
    expect((item.properties as any).datetime).to.equal(baseGranule.timeStart);
  });

  it("should not include start_datetime and end_datetime when neither are present", () => {
    const [baseGranule] = generateGranules(1);
    const item = granuleToStac({
      ...baseGranule,
      timeStart: null,
      timeEnd: null,
    });

    expect((item.properties as any).start_datetime).to.be.undefined;
    expect((item.properties as any).end_datetime).to.be.undefined;
  });
});
