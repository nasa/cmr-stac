import chai from "chai";
const { expect } = chai;

import { buildQuery, sortByToSortKeys, stringifyQuery } from "../stacQuery";

describe("buildQuery", () => {
  describe("given a bounding box", () => {
    [
      { label: "as array", bbox: [-121, 38, -119, 40] },
      { label: "as string", bbox: "-121,38,-119,40" },
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
    {
      input: ["properties.eo:cloud_cover", "conceptId"],
      output: ["cloudCover", "conceptId"],
    },
    {
      input: ["-properties.eo:cloud_cover", "conceptId"],
      output: ["-cloudCover", "conceptId"],
    },
  ].forEach(({ input, output }) => {
    describe(`given sortBy=${input}`, () => {
      it("should return the corresponding sortKey", () => {
        expect(sortByToSortKeys(input)).to.deep.equal(output);
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
        queryString: "bbox=-180,-90,180,90",
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
        queryString: "collections=C1234-PROV1,C5468-PROV1",
      },
      {
        query: { ids: ["G1234-PROV1", "G5468-PROV1"] },
        queryString: "ids=G1234-PROV1,G5468-PROV1",
      },
      {
        query: { query: { "eo:cloud_cover": { gt: 50 } } },
        queryString: "query[eo:cloud_cover][gt]=50",
      },
      {
        query: { query: { "eo:cloud_cover": { gt: 50, lt: 95 } } },
        queryString:
          "query[eo:cloud_cover][gt]=50&query[eo:cloud_cover][lt]=95",
      },
    ].forEach(({ query, queryString }) => {
      describe(`given query of ${JSON.stringify(query)}`, () => {
        it(`should return ${queryString}`, () => {
          expect(decodeURIComponent(stringifyQuery(query))).to.equal(
            queryString
          );
        });
      });
    });
  });
});
