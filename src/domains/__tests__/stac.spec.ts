import chai from "chai";
const { expect } = chai;
import { stringify as stringifyQuery } from "qs";

import { buildQuery, sortByToSortKeys, browseAssets } from "../stac";
import { RelatedUrlType, UrlContentType } from "../../models/GraphQLModels";
import { SortObject } from "../../models/StacModels";

describe("buildQuery", () => {
  describe("given a intersects query", () => {
    describe("given a GeoJSON Polygon", () => {
      it("converts the polygon to a flat string", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "Polygon",
              coordinates: [
                [
                  [100, 0],
                  [101, 0],
                  [101, 1],
                  [100, 1],
                  [100, 0],
                ],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          polygon: ["100,0,101,0,101,1,100,1,100,0"],
        });
      });
    });

    describe("given a GeoJSON Polygon with already flattened string coordinates", () => {
      it("returns the flat coordinates", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "Polygon",
              coordinates: "100,0,101,0,101,1,100,1,100,0",
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          polygon: ["100,0,101,0,101,1,100,1,100,0"],
        });
      });
    });

    describe("given a GeoJSON Polygon with holes", () => {
      it("excludes the holes", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "Polygon",
              coordinates: [
                [
                  [100.0, 0.0],
                  [101.0, 0.0],
                  [101.0, 1.0],
                  [100.0, 1.0],
                  [100.0, 0.0],
                ],
                [
                  [100.8, 0.8],
                  [100.8, 0.2],
                  [100.2, 0.2],
                  [100.2, 0.8],
                  [100.8, 0.8],
                ],
                [
                  [100.9, 0.7],
                  [100.9, 0.1],
                  [100.3, 0.1],
                  [100.3, 0.7],
                  [100.9, 0.7],
                ],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          polygon: ["100,0,101,0,101,1,100,1,100,0"],
        });
      });
    });

    describe("given a GeoJSON MultiPolygon", () => {
      it("converts the polygon to a string with multiple entries", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [100, 0],
                    [101, 0],
                    [101, 1],
                    [100, 1],
                    [100, 0],
                  ],
                ],
                [
                  [
                    [10, 0],
                    [11, 0],
                    [11, 1],
                    [10, 1],
                    [10, 0],
                  ],
                ],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          polygon: ["100,0,101,0,101,1,100,1,100,0", "10,0,11,0,11,1,10,1,10,0"],
        });
      });
    });

    describe("given a GeoJSON MultiPolygon with holes in the polygons", () => {
      it("excludes the holes", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "MultiPolygon",
              coordinates: [
                [
                  [
                    [100, 0],
                    [101, 0],
                    [101, 1],
                    [100, 1],
                    [100, 0],
                  ],
                  // hole
                  [
                    [100.8, 0.8],
                    [100.8, 0.2],
                    [100.2, 0.2],
                    [100.2, 0.8],
                    [100.8, 0.8],
                  ],
                ],
                [
                  [
                    [10, 0],
                    [11, 0],
                    [11, 1],
                    [10, 1],
                    [10, 0],
                  ],
                  // hole
                  [
                    [10.8, 0.8],
                    [10.8, 0.2],
                    [10.2, 0.2],
                    [10.2, 0.8],
                    [10.8, 0.8],
                  ],
                ],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          polygon: ["100,0,101,0,101,1,100,1,100,0", "10,0,11,0,11,1,10,1,10,0"],
        });
      });
    });

    describe("given a GeoJSON Linestring", () => {
      it("converts the linestring to a string", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "LineString",
              coordinates: [
                [101.0, 0.0],
                [102.0, 1.0],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          line: ["101,0,102,1"],
        });
      });
    });

    describe("given a GeoJSON MultiLinestring", () => {
      it("converts the linestrings to a string array with multiple entries", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "MultiLineString",
              coordinates: [
                [
                  [100.0, 0.0],
                  [101.0, 1.0],
                ],
                [
                  [102.0, 2.0],
                  [103.0, 3.0],
                ],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          line: ["100,0,101,1", "102,2,103,3"],
        });
      });
    });

    describe("given a GeoJSON Point", () => {
      it("converts the point to a string array", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "Point",
              coordinates: [100.0, 0.0],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          point: ["100,0"],
        });
      });
    });

    describe("given a GeoJSON MultiPoint", () => {
      it("converts the multi points to a string array with multiple entries", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "MultiPoint",
              coordinates: [
                [100.0, 0.0],
                [101.0, 1.0],
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          point: ["100,0", "101,1"],
        });
      });
    });

    describe("given a GeoJSONGeometryCollection", () => {
      it("converts all included geometries", async () => {
        const query = await buildQuery({
          method: "POST",
          body: {
            intersects: {
              type: "GeometryCollection",
              geometries: [
                { type: "Point", coordinates: [100.0, 0.0] },
                {
                  type: "LineString",
                  coordinates: [
                    [101.0, 0.0],
                    [102.0, 1.0],
                  ],
                },
              ],
            },
          },
          params: { providerId: "TEST_PROV" },
          headers: {},
          query: {},
        } as any);

        expect(query).to.deep.equal({
          provider: "TEST_PROV",
          point: ["100,0"],
          line: ["101,0,102,1"],
        });
      });
    });
  });

  describe("given a bounding box", () => {
    [
      { label: "as 2d array", bbox: [-121, 38, -119, 40] },
      { label: "as 3d array", bbox: [-121, 38, 0, -119, 40, 0] },
      { label: "as 2d bbox string", bbox: "-121,38,-119,40" },
      {
        label: "as 2d bbox string with extra spaces ",
        bbox: "-121, 38, -119, 40",
      },
      {
        label: "as 3d bbox string with extra spaces ",
        bbox: "-121, 38, 0, -119, 40, 0",
      },
    ].forEach(({ label, bbox }) =>
      describe(`${label}`, () => {
        it("should return a valid query", async () => {
          const query = await buildQuery({
            method: "POST",
            body: { bbox },
            params: { providerId: "MY_PROV" },
            headers: {},
            query: {},
          } as any);

          expect(query).to.have.property("boundingBox", "-121,38,-119,40");
        });
      })
    );
  });

  describe("given an `eo:cloud_cover` query", () => {
    [
      {
        label: "less than",
        query: { lt: "20" },
        expected: { max: 20 },
      },
      {
        label: "less than or equal to",
        query: { lte: "20" },
        expected: { max: 20 },
      },
      {
        label: "more than",
        query: { gt: "75" },
        expected: { min: 75 },
      },
      {
        label: "more than or equal to",
        query: { gte: "75" },
        expected: { min: 75 },
      },
    ].forEach(({ label, query: eoCloudCover, expected }) => {
      describe(`given a ${label} eo:cloud_cover query`, () => {
        describe("given as a POST request", () => {
          it("should produce the proper query", async () => {
            expect(
              await buildQuery({
                method: "POST",
                body: { query: { "eo:cloud_cover": eoCloudCover } },
                params: { providerId: "MY_PROV" },
                headers: {},
                query: {},
              } as any)
            ).to.have.deep.property("cloudCover", expected);
          });
        });
      });
    });
  });
});

describe("sortByToSortKeys", () => {
  [
    { input: "properties.eo:cloud_cover", output: ["cloudCover"] },
    { input: "-properties.eo:cloud_cover", output: ["-cloudCover"] },
    { input: "id", output: ["entryId"] },
    { input: "-id", output: ["-entryId"] },
    { input: "title", output: ["entryTitle"] },
    { input: "-title", output: ["-entryTitle"] },
    { input: "someOtherField", output: ["someOtherField"] },
    { input: "-someOtherField", output: ["-someOtherField"] },
    {
      input: ["properties.eo:cloud_cover", "conceptId"],
      output: ["cloudCover", "conceptId"],
    },
    {
      input: ["-properties.eo:cloud_cover", "conceptId"],
      output: ["-cloudCover", "conceptId"],
    },
  ].forEach(({ input, output }) => {
    describe(`given sortby=${input}`, () => {
      it("should return the corresponding sortKey", () => {
        expect(sortByToSortKeys(input)).to.deep.equal(output);
      });

      it("should handle object-based sort specifications", () => {
        const input: SortObject[] = [
          { field: "properties.eo:cloud_cover", direction: "desc" },
          { field: "id", direction: "asc" },
          { field: "title", direction: "desc" },
        ];
        expect(sortByToSortKeys(input)).to.deep.equal(["-cloudCover", "entryId", "-entryTitle"]);
      });
    });
  });
});

describe("stringifyQuery", () => {
  describe("given supported STAC query params", () => {
    [
      { query: { limit: 2 }, queryString: "limit=2" },
      {
        query: { bbox: [-180, -90, 180, 90] },
        queryString: "bbox[0]=-180&bbox[1]=-90&bbox[2]=180&bbox[3]=90",
      },
      {
        query: { bbox: "-180,-90,180,90" },
        queryString: "bbox=-180,-90,180,90",
      },
      {
        query: { datetime: "2022-01-01T00:00:00Z" },
        queryString: "datetime=2022-01-01T00:00:00Z",
      },
      {
        query: { collections: ["C1234-PROV1", "C5468-PROV1"] },
        queryString: "collections[0]=C1234-PROV1&collections[1]=C5468-PROV1",
      },
      {
        query: { ids: ["G1234-PROV1", "G5468-PROV1"] },
        queryString: "ids[0]=G1234-PROV1&ids[1]=G5468-PROV1",
      },
      {
        query: { query: { "eo:cloud_cover": { gt: 50 } } },
        queryString: "query[eo:cloud_cover][gt]=50",
      },
      {
        query: { query: { "eo:cloud_cover": { gt: 50, lt: 95 } } },
        queryString: "query[eo:cloud_cover][gt]=50&query[eo:cloud_cover][lt]=95",
      },
      {
        query: { intersects: { coordinates: ["100,0,101,1", "102,2,103,3"] } },
        queryString:
          "intersects[coordinates][0]=100,0,101,1&intersects[coordinates][1]=102,2,103,3",
      },
      {
        query: {
          intersects: {
            geometries: [
              { type: "Point", coordinates: [100.0, 0.0] },
              {
                type: "LineString",
                coordinates: [
                  [101.0, 0.0],
                  [102.0, 1.0],
                ],
              },
            ],
          },
        },
        queryString:
          "intersects[geometries][0][type]=Point&intersects[geometries][0][coordinates][0]=100&intersects[geometries][0][coordinates][1]=0&intersects[geometries][1][type]=LineString&intersects[geometries][1][coordinates][0][0]=101&intersects[geometries][1][coordinates][0][1]=0&intersects[geometries][1][coordinates][1][0]=102&intersects[geometries][1][coordinates][1][1]=1",
      },
    ].forEach(({ query, queryString }) => {
      describe(`given query of ${JSON.stringify(query)}`, () => {
        it(`should return ${queryString}`, () => {
          expect(decodeURIComponent(stringifyQuery(query))).to.equal(queryString);
        });
      });
    });
  });
});

describe("browseAssets", () => {
  const granule = {
    title: "test_title",
    conceptId: "G123456789-TEST_PROV",
    collection: null,
    cloudCover: null,
    lines: null,
    boxes: null,
    polygons: null,
    points: null,
    timeStart: "2009-09-14T00:00:00.000Z",
    timeEnd: "2010-09-14T00:00:00.000Z",
    relatedUrls: [
      {
        urlContentType: UrlContentType.VISUALIZATION_URL,
        url: "https://data.lpdaac.uat.earthdatacloud.nasa.gov/lp-uat-public/HLSL30.020/HLS.L30.T54SVF.2020001T010928.v2.0/HLS.L30.T54SVF.2020001T010928.v2.0.jpg",
        description: "Download HLS.L30.T54SVF.2020001T010928.v2.0.jpg",
        type: RelatedUrlType.GET_RELATED_VISUALIZATION,
      },
      {
        urlContentType: UrlContentType.VISUALIZATION_URL,
        url: "s3://lp-uat-public/HLSL30.020/HLS.L30.T54SVF.2020001T010928.v2.0/HLS.L30.T54SVF.2020001T010928.v2.0.jpg",
        description: "This link provides direct download access via S3 to the granule",
        type: RelatedUrlType.GET_RELATED_VISUALIZATION,
      },
    ],
  };
  const browseAsset = {
    browse: {
      href: "https://data.lpdaac.uat.earthdatacloud.nasa.gov/lp-uat-public/HLSL30.020/HLS.L30.T54SVF.2020001T010928.v2.0/HLS.L30.T54SVF.2020001T010928.v2.0.jpg",
      title: "Download HLS.L30.T54SVF.2020001T010928.v2.0.jpg",
      type: "image/jpeg",
      roles: ["browse"],
    },
  };
  describe(`given granule=${JSON.stringify(granule)}`, () => {
    it("should return the corresponding browseAsset", () => {
      expect(browseAssets(granule)).to.deep.equal(browseAsset);
    });
  });
});

describe("conversions to GraphQL", () => {
  describe("collections", () => {
    describe("given cmr-stac 1.0 style collection identifiers", () => {
      it("should attempt to convert them to entry_id query", async () => {
        expect(
          await buildQuery({
            method: "GET",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: {
              "provider-id": "PROV",
              "short-name": "PROV",
            },
            query: { collections: ["coll.v1"] },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: ["coll_1", "coll.v1"],
        });
      });
    });

    describe("given cmr entry_id style collection identifiers", () => {
      it("should not modify them", async () => {
        expect(
          await buildQuery({
            method: "GET",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: {
              "provider-id": "PROV",
              "short-name": "PROV",
            },
            query: { collections: ["coll_v1"] },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: ["coll_v1"],
        });
      });
    });

    describe("given multiple collection identifiers as a comma separated string", () => {
      it("should separate the entryIds properly", async () => {
        expect(
          await buildQuery({
            method: "GET",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            query: { collections: "coll_v1,coll_v2" },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: ["coll_v1", "coll_v2"],
        });
      });
    });

    describe("given an id as part of the path", () => {
      it("should not modify them", async () => {
        expect(
          await buildQuery({
            method: "GET",
            url: "/stac/PROV/collections/testCollection_v123",
            headers: {},
            params: { providerId: "PROV", collectionId: "testCollection_v123" },
            provider: {
              "provider-id": "PROV",
              "short-name": "PROV",
            },
            query: {},
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: ["testCollection_v123"],
        });
      });
    });

    describe("given single collection ID alone", () => {
      it("creates a query term for all combinations ", async () => {
        expect(
          await buildQuery({
            method: "POST",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: { "provider-id": "PROV" },
            query: {},
            body: { collections: "testCollection.v1.v2.v3" },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: [
            "testCollection_1.v2.v3",
            "testCollection.v1_2.v3",
            "testCollection.v1.v2_3",
            "testCollection.v1.v2.v3",
          ],
        });
      });
    });

    describe("given a single collection ID ", () => {
      it("creates a query term for all combinations ", async () => {
        expect(
          await buildQuery({
            method: "POST",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: { "provider-id": "PROV" },
            query: {},
            body: { collections: ["testCollection.v1.v2.v3"] },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: [
            "testCollection_1.v2.v3",
            "testCollection.v1_2.v3",
            "testCollection.v1.v2_3",
            "testCollection.v1.v2.v3",
          ],
        });
      });
    });

    describe("given mutiple collections", () => {
      it("creates a query term for all combinations ", async () => {
        expect(
          await buildQuery({
            method: "POST",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: { "provider-id": "PROV" },
            query: {},
            body: { collections: ["AIRX3STD.v006", "testCollection.v1.v2.v3"] },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: [
            "AIRX3STD_006",
            "AIRX3STD.v006",
            "testCollection_1.v2.v3",
            "testCollection.v1_2.v3",
            "testCollection.v1.v2_3",
            "testCollection.v1.v2.v3",
          ],
        });
      });
    });

    describe("given mutiple collections with mixed syntax", () => {
      it("creates a query term for all combinations ", async () => {
        expect(
          await buildQuery({
            method: "POST",
            url: "/stac/PROV/search",
            headers: {},
            params: { providerId: "PROV" },
            provider: { "provider-id": "PROV" },
            query: {},
            body: { collections: ["AIRX3STD.v006", "testCollection.v1.v2.v3", "entry_id"] },
          } as any)
        ).to.deep.equal({
          provider: "PROV",
          entryId: [
            "AIRX3STD_006",
            "AIRX3STD.v006",
            "testCollection_1.v2.v3",
            "testCollection.v1_2.v3",
            "testCollection.v1.v2_3",
            "testCollection.v1.v2.v3",
            "entry_id",
          ],
        });
      });
    });
  });
});
