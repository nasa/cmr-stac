import request from "supertest";
import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import { createApp } from "../app";
const app = createApp();
import { Link } from "../@types/StacCatalog";
import { STACCollection } from "../@types/StacCollection";
import { STACItem } from "../@types/StacItem";

import {
  polygon,
  linestring,
  point,
  multiPolygon,
  multiLinestring,
  multiPoint,
} from "./geojsonGeometry";

import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";
import * as Items from "../domains/items";

import { generateSTACItems } from "../utils/testUtils";

const sandbox = sinon.createSandbox();

const cmrProvidersResponse = [
  { "provider-id": "PROVIDER", "short-name": "PROVIDER" },
];

const emptyCollections = { facets: null, count: 0, cursor: null, items: [] };
const emptyItems = { facets: null, count: 0, cursor: null, items: [] };

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider/search", () => {
  describe("given a valid provider", () => {
    it("should return 200", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode } = await request(app).get("/stac/PROVIDER/search");

      expect(statusCode).to.equal(200);
    });

    it("should return a search response", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/PROVIDER/search")
        .query({ providerId: "PROVIDER" });

      expect(data).to.have.property("type", "FeatureCollection");
      expect(data).to.have.property("stac_version", "1.0.0");

      expect(data).to.have.property("numberMatched");
      expect(data.numberMatched).to.be.a("number");

      expect(data).to.have.property("numberReturned");
      expect(data.numberReturned).to.be.a("number");

      expect(data).to.have.property("features");
      expect(Array.isArray(data.features)).to.be.true;

      expect(data).to.have.property("links");
      expect(Array.isArray(data.links)).to.be.true;

      expect(data).to.have.property("context");
      expect(data.context).to.have.property("returned");
      expect(data.context.returned).to.be.a("number");

      expect(data.context).to.have.property("limit");
      expect(data.context.limit).to.be.a("number");

      expect(data.context).to.have.property("matched");
      expect(data.context.matched).to.be.a("number");
    });

    it("should have self link with the current search", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/PROVIDER/search")
        .query({ bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "self");
      const resourceRoute = `/stac/PROVIDER/search?bbox=${encodeURIComponent(
        "-180,-90,180,90"
      )}`;

      expect(selfLink).to.have.property("href");
      expect(selfLink.href).to.have.string(resourceRoute);
    });

    it("should have root link to the root catalog", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/PROVIDER/search")
        .query({ providerId: "PROVIDER", bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "root");
      expect(selfLink.href).to.have.string("/");
    });

    it("should have provider link to the provider catalog", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/PROVIDER/search")
        .query({ providerId: "PROVIDER", bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "provider");
      expect(selfLink.href).to.match(/\/stac\/PROVIDER$/);
    });

    describe("given there are items found", () => {
      it("should have the corresponding features returned", async () => {
        const mockAItems = generateSTACItems("mock_collection_a", 5);
        const mockBItems = generateSTACItems("mock_collection_b", 5, {
          offset: 10,
        });
        const mockItems = [...mockAItems, ...mockBItems];

        sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
        sandbox.stub(Collections, "getCollections").resolves({
          facets: null,
          count: 2,
          cursor: "cursor",
          items: [
            { id: "mock_collection_a" } as STACCollection,
            { id: "mock_collection_b" } as STACCollection,
          ],
        });
        sandbox.stub(Items, "getItems").resolves({
          facets: null,
          count: mockItems.length,
          cursor: "nextPage",
          items: mockItems,
        });

        const { body: data } = await request(app)
          .get("/stac/PROVIDER/search")
          .query({ providerId: "PROVIDER", bbox: "-180,-90,180,90" });

        mockItems.forEach((expectedItem: STACItem) => {
          const feature = data.features.find(
            (item: STACItem) => item.id === expectedItem.id
          );
          expect(feature).to.have.property("id", expectedItem.id);
        });
      });
    });

    describe("given there are more results found than the page size", () => {
      it("should have a next link", async () => {
        const mockAItems = generateSTACItems("mock_collection_a", 5);
        const mockBItems = generateSTACItems("mock_collection_b", 5, {
          offset: 10,
        });
        const mockItems = [...mockAItems, ...mockBItems];

        sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
        sandbox.stub(Collections, "getCollections").resolves({
          facets: null,
          count: 2,
          cursor: "cursor",
          items: [
            { id: "mock_collection_a" } as STACCollection,
            { id: "mock_collection_b" } as STACCollection,
          ],
        });
        sandbox.stub(Items, "getItems").resolves({
          facets: null,
          count: mockItems.length + 10,
          cursor: "next",
          items: mockItems,
        });

        const { body: data } = await request(app).get("/stac/PROVIDER/search");

        const nextLink = data.links.find((link: Link) => link.rel === "next");
        expect(nextLink.rel).to.equal("next");
        expect(nextLink.href, nextLink.href).to.have.match(
          /http:\/\/.*\/PROVIDER\/search\?cursor=.*/
        );
      });
    });

    const limits = [
      ["valid", 100, 200],
      ["larger than the max", 99999, 400],
      ["negative", -9, 400],
    ];
    limits.forEach(([label, limit, expected]) => {
      describe(`given limit is ${label} [${limit}]`, () => {
        it(`it should return status ${expected}`, async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves(cmrProvidersResponse);
          sandbox
            .stub(Collections, "getCollections")
            .resolves(emptyCollections);
          sandbox.stub(Items, "getItems").resolves(emptyItems);

          const { statusCode } = await request(app)
            .get("/stac/PROVIDER/search")
            .query({ limit });

          expect(statusCode).to.equal(expected);
        });
      });
    });
  });

  describe("given an invalid provider", () => {
    it("should return 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      const { statusCode } = await request(app).get("/stac/BAD_PROV/search");
      expect(statusCode).to.equal(404);
    });
  });
});

describe("Query validation", () => {
  describe("given a valid BBOX", () => {
    it("should return 200", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode } = await request(app)
        .get("/stac/PROVIDER/search")
        .query({ bbox: "-180,-90,180,90" });
      expect(statusCode).to.equal(200);
    });

    describe("various cases of BBOX", () => {
      ["bbox", "BBOX", "BbOx"].forEach((variation: string) => {
        it(`should handle case ${variation}`, async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves(cmrProvidersResponse);
          sandbox.stub(Items, "getItems").resolves(emptyItems);

          const { statusCode } = await request(app).get(
            `/stac/PROVIDER/search?${variation}=-180,-90,180,90`
          );
          expect(statusCode).to.equal(200);
        });
      });
    });
  });

  describe("given an invalid BBOX", () => {
    it("should return 400", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode, body } = await request(app).get(
        "/stac/PROVIDER/search?bbox=-99999,-90,180,90"
      );
      expect(statusCode).to.equal(400);
      expect(body).to.deep.equal({
        errors: [
          "BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.",
        ],
      });
    });
  });

  describe("given an INTERSECTS query", () => {
    [
      ["polygon", polygon],
      ["multi-polygon", multiPolygon],
      ["linestring", linestring],
      ["multi-linestring", multiLinestring],
      ["point", point],
      ["multi-point", multiPoint],
    ].forEach(([label, geometry]) => {
      describe(`given a ${label}`, () => {
        it("should return 200", async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves(cmrProvidersResponse);

          const getItemsSpy = sandbox
            .stub(Items, "getItems")
            .resolves(emptyItems);

          const { statusCode, body } = await request(app).get(
            `/stac/PROVIDER/search?intersects=${JSON.stringify(geometry)}`
          );
          expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
          expect(getItemsSpy).to.have.been.calledOnce;
        });
      });
    });
  });

  describe("given various cases of INTERSECTS", () => {
    ["intersects", "INTERSECTS", "iNtErSeCtS"].forEach((label) => {
      it("should return handle ${label}", async () => {
        sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);

        sandbox.stub(Items, "getItems").resolves(emptyItems);

        const { statusCode, body } = await request(app).get(
          `/stac/PROVIDER/search?${label}=${JSON.stringify(point)}`
        );
        expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
      });
    });
  });

  describe("given both an INTERSECTS and BBOX parameter", () => {
    it("should return 400", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);

      const { statusCode } = await request(app).get(
        `/stac/PROVIDER/search?bbox=0,0,0,0&intersects=${JSON.stringify(point)}`
      );
      expect(statusCode).to.equal(400);
    });
  });
});
