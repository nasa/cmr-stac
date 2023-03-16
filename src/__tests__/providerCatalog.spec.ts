import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import ItemSpec from "../../resources/item-spec/json-schema/item.json";

import { Link } from "../@types/StacCatalog";
import { createApp } from "../app";
import * as Provider from "../domains/providers";
import * as Collections from "../domains/collections";
import { generateSTACCollections } from "../utils/testUtils";

const stacApp = createApp();
const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider", () => {
  describe("given a valid provider", () => {
    beforeEach(() => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });
    });

    it("returns a 200 status", async () => {
      const res = await request(stacApp).get("/stac/TEST");
      expect(res.statusCode).to.equal(200);
    });

    it("returns a catalog response", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      ajv.addSchema(ItemSpec);
      const validate = ajv.compile(CatalogSpec);
      const valid = validate(catalog);

      expect(valid).to.be.true;
    });

    it("has a root link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "root");
      expect(link).to.have.property("rel", "root");
      expect(link).to.have.property("type", "application/geo+json");
      expect(link).to.have.property("title", "Root Catalog");
    });

    it("has a self link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "self");
      expect(link).to.have.property("rel", "self");
      expect(link).to.have.property("type", "application/geo+json");
      expect(link.href).to.match(/^https?:\/\/.*\/TEST$/);
      expect(link).to.have.property("title", "Provider Catalog");
    });

    it("has a collections link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "data");
      expect(link).to.have.property("rel", "data");
      expect(link).to.have.property("type", "application/json");
      expect(link.href).to.match(/^https?:\/\/.*\/TEST\/collections$/);
      expect(link).to.have.property("title", "Provider Collections");
    });

    const searchMethods = ["GET", "POST"];
    searchMethods.forEach((method) => {
      it(`has a ${method} search link`, async () => {
        const { body: catalog } = await request(stacApp).get("/stac/TEST");

        const link: Link = catalog.links.find(
          (l: Link) => l.rel === "search" && l.method === method
        );
        expect(link).to.have.property("rel", "search");
        expect(link).to.have.property("type", "application/geo+json");
        expect(link.href).to.match(/^https?:\/\/.*\/TEST\/search$/);
        expect(link).to.have.property("title", "Provider Item Search");
        expect(link).to.have.property("method", method);
      });
    });

    it("has a conformance link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "conformance");
      expect(link).to.have.property("rel", "conformance");
      expect(link).to.have.property("type", "application/json");
      expect(link.href).to.match(/^https?:\/\/.*\/stac\/TEST\/conformance$/);
      expect(link).to.have.property("title", "Conformance Classes");
    });

    it("has a service-desc link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "service-desc");
      expect(link).to.have.property("rel", "service-desc");
      expect(link).to.have.property("type", "application/vnd.oai.openapi;version=3.0");
      expect(link).to.have.property("href", "https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml");
      expect(link).to.have.property("title", "OpenAPI Doc");
    });

    it("has a service-doc link", async () => {
      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "service-doc");
      expect(link).to.have.property("rel", "service-doc");
      expect(link).to.have.property("type", "text/html");
      expect(link).to.have.property("href", "https://api.stacspec.org/v1.0.0-beta.1/index.html");
      expect(link).to.have.property("title", "HTML documentation");
    });
  });

  describe("given a valid provider with collections", () => {
    const collectionCount = [0, 1, 10, 1000];
    collectionCount.forEach((quantity) => {
      describe(`given the provider has ${quantity} collections`, () => {
        it("has a child link for each collection", async function () {
          this.timeout(5000);

          sandbox
            .stub(Provider, "getProviders")
            .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

          const mockCollections = generateSTACCollections(quantity);
          sandbox.stub(Collections, "getCollectionIds").resolves({
            count: mockCollections.length,
            cursor: "foundCursor",
            items: mockCollections.map((coll) => ({
              id: `${coll.shortName}_${coll.version}`,
              title: coll.title!,
            })),
          });

          const { body: catalog } = await request(stacApp).get("/stac/TEST");

          const children = catalog.links.filter((l: Link) => l.rel === "child");
          expect(children).to.have.length(mockCollections.length);

          mockCollections.forEach((collection) => {
            const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

            expect(childLink, JSON.stringify(children, null, 2)).to.have.property(
              "type",
              "application/json"
            );
            expect(childLink.href, JSON.stringify(childLink, null, 2)).to.match(
              /^https?:\/\/.*TEST\/collections/
            );
          });
        });
      });
    });
  });

  describe("given CMR providers endpoint responds with an error", () => {
    it("should return a 503", async () => {
      sandbox.stub(Provider, "getProviders").resolves(["No upstream connection", null]);

      const res = await request(stacApp).get("/stac/BAD_PROVIDER");
      expect(res.statusCode).to.equal(503);
    });
  });

  describe("given the collections search fails", () => {
    it("should return a 503", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").throws(new Error("COLLECTION SEARCH FAILED"));

      const { statusCode } = await request(stacApp).get("/stac/TEST");
      expect(statusCode).to.equal(503);
    });
  });

  describe("given an invalid provider", () => {
    it("should return a 404 status", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const res = await request(stacApp).get("/stac/PROVIDER_NOT_FOUND");
      expect(res.statusCode).to.equal(404);
    });
  });
});
