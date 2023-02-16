import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import ItemSpec from "../../resources/item-spec/json-schema/item.json";
import { Link } from "../@types/StacCatalog";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
const stacApp = createApp();

import * as Provider from "../domains/providers";
import * as Collections from "../domains/collections";
import { generateSTACCollections } from "../utils/testUtils";

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider", () => {
  describe("given a valid provider", () => {
    it("should return a 200 status", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const res = await request(stacApp).get("/stac/TEST");
      expect(res.statusCode).to.equal(200);
    });

    it("should return a catalog response", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      ajv.addSchema(ItemSpec);
      const validate = ajv.compile(CatalogSpec);
      const valid = validate(catalog);

      expect(valid, JSON.stringify(validate.errors, null, 2)).to.be.true;
    });

    it("should have a root link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "root");
      expect(link).to.have.property("rel", "root");
      expect(link).to.have.property("type", "application/geo+json");
      expect(link).to.have.property("title", "Root Catalog");
    });

    it("should have a self link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "self");
      expect(link).to.have.property("rel", "self");
      expect(link).to.have.property("type", "application/geo+json");
      expect(link.href).to.match(/^https?:\/\/.*\/TEST$/);
      expect(link).to.have.property("title", "Provider Catalog");
    });

    it("should have a collections link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find((l: Link) => l.rel === "data");
      expect(link).to.have.property("rel", "data");
      expect(link).to.have.property("type", "application/json");
      expect(link.href).to.match(/^https?:\/\/.*\/TEST\/collections$/);
      expect(link).to.have.property("title", "Provider Collections");
    });

    const searchMethods = ["GET", "POST"];
    searchMethods.forEach((method) => {
      it(`should have a ${method} search link`, async () => {
        sandbox
          .stub(Provider, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
        sandbox
          .stub(Collections, "getCollectionIds")
          .resolves({ count: 0, cursor: null, items: [] });

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

    it("should have a conformance link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find(
        (l: Link) => l.rel === "conformance"
      );
      expect(link).to.have.property("rel", "conformance");
      expect(link).to.have.property("type", "application/json");
      expect(link.href).to.match(/^https?:\/\/.*\/stac\/TEST\/conformance$/);
      expect(link).to.have.property("title", "Conformance Classes");
    });

    it("should have a service-desc link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find(
        (l: Link) => l.rel === "service-desc"
      );
      expect(link).to.have.property("rel", "service-desc");
      expect(link).to.have.property(
        "type",
        "application/vnd.oai.openapi;version=3.0"
      );
      expect(link).to.have.property(
        "href",
        "https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml"
      );
      expect(link).to.have.property("title", "OpenAPI Doc");
    });

    it("should have a service-doc link", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog } = await request(stacApp).get("/stac/TEST");

      const link: Link = catalog.links.find(
        (l: Link) => l.rel === "service-doc"
      );
      expect(link).to.have.property("rel", "service-doc");
      expect(link).to.have.property("type", "text/html");
      expect(link).to.have.property(
        "href",
        "https://api.stacspec.org/v1.0.0-beta.1/index.html"
      );
      expect(link).to.have.property("title", "HTML documentation");
    });

    const collectionCount = [0, 1, 10, 1000];
    collectionCount.forEach((quantity) => {
      describe(`given the provider has ${quantity} collections`, () => {
        it("should have a child link for each collection", async function () {
          this.timeout(5000);

          sandbox
            .stub(Provider, "getProviders")
            .resolves([
              null,
              [{ "provider-id": "TEST", "short-name": "TEST" }],
            ]);

          const mockCollections = generateSTACCollections(quantity);

          sandbox.stub(Collections, "getCollectionIds").resolves({
            count: mockCollections.length,
            cursor: "foundCursor",
            items: mockCollections.map((coll) => ({
              conceptId: coll.id,
              title: coll.title!,
            })),
          });

          const { body: catalog } = await request(stacApp).get("/stac/TEST");

          const children = catalog.links.filter((l: Link) => l.rel === "child");
          expect(children).to.have.length(mockCollections.length);

          mockCollections.forEach((collection) => {
            const childLink = children.find((l: Link) =>
              l.href.endsWith(collection.id)
            );

            expect(
              childLink,
              JSON.stringify(children, null, 2)
            ).to.have.property("type", "application/json");
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
      sandbox
        .stub(Provider, "getProviders")
        .resolves(["No upstream connection", null]);

      const res = await request(stacApp).get("/stac/BAD_PROVIDER");
      expect(res.statusCode).to.equal(503);
    });
  });

  describe("given the collections search fails", () => {
    it("should return a 503", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Collections, "getCollections")
        .throws(new Error("COLLECTION SEARCH FAILED"));

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
