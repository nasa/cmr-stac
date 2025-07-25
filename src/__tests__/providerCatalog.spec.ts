import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";
import { faker } from "@faker-js/faker";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import ItemSpec from "../../resources/item-spec/json-schema/item.json";

import { Link } from "../@types/StacCatalog";
import { createApp } from "../app";
import * as Collections from "../domains/collections";
import * as Provider from "../domains/providers";
import * as stac from "../domains/stac";
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
      expect(link).to.have.property("type", "application/yaml");
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
              id: `${coll.id}`,
              title: coll.title ?? faker.random.words(4),
              provider: `TEST`,
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

    describe("when there are more results available", () => {
      it("includes a 'next' link with the correct query parameters", async () => {
        sandbox.stub(stac, "CMR_QUERY_MAX").value(100);
        sandbox
          .stub(Provider, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
        const mockCollections = generateSTACCollections(100);
        sandbox.stub(Collections, "getCollectionIds").resolves({
          count: 100,
          cursor: "nextPageCursor",
          items: mockCollections.map((coll) => ({
            id: `${coll.id}`,
            title: coll.title ?? faker.random.words(4),
            provider: "TEST",
          })),
        });

        const { body: catalog } = await request(stacApp).get(`/stac/TEST`);

        const nextLink = catalog.links.find((l: Link) => l.rel === "next");
        expect(nextLink).to.exist;
        expect(nextLink.rel).to.equal("next");
        expect(nextLink.type).to.equal("application/json");
        expect(nextLink.title).to.equal("Next page of results");

        const nextUrl = new URL(nextLink.href);
        expect(nextUrl.pathname).to.equal("/stac/TEST");
      });
    });

    describe("when there are no more results available", () => {
      it("does not include a 'next' link", async () => {
        sandbox.stub(stac, "CMR_QUERY_MAX").value(100);
        sandbox
          .stub(Provider, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const mockCollections = generateSTACCollections(10);
        sandbox.stub(Collections, "getCollectionIds").resolves({
          count: 10,
          cursor: null,
          items: mockCollections.map((coll) => ({
            id: `${coll.id}`,
            title: coll.title ?? faker.random.words(4),
            provider: "TEST`",
          })),
        });

        const { body: catalog } = await request(stacApp).get("/stac/TEST");

        const nextLink = catalog.links.find((l: Link) => l.rel === "next");
        expect(nextLink).to.not.exist;
      });
    });

    describe(`given the provider has a collection`, () => {
      it("has a child link for that collection without query parameters", async function () {
        sandbox
          .stub(Provider, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const mockCollections = generateSTACCollections(1);
        sandbox.stub(Collections, "getCollectionIds").resolves({
          count: mockCollections.length,
          cursor: "foundCursor",
          items: mockCollections.map((coll) => ({
            id: `${coll.id}`,
            title: coll.title ?? faker.random.words(4),
            provider: "TEST",
          })),
        });

        const { body: catalog } = await request(stacApp).get("/stac/TEST?param=value");

        const children = catalog.links.filter((l: Link) => l.rel === "child");
        expect(children).to.have.length(mockCollections.length);

        mockCollections.forEach((collection) => {
          const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

          expect(childLink, JSON.stringify(children, null, 2)).to.have.property(
            "type",
            "application/json"
          );
          expect(childLink.href, JSON.stringify(childLink, null, 2)).to.not.contain("?param=value");
          expect(childLink.href, JSON.stringify(childLink, null, 2)).to.match(
            /^https?:\/\/.*TEST\/collections/
          );
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

  describe("given the stac/ALL provider/catalog", () => {
    it("should call the graphql API with no provider search clause", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const getCollectionsSpy = sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const res = await request(stacApp).get("/stac/ALL");
      expect(res.statusCode).to.equal(200);
      // getCollectionIds should have no provider clause in query argument.
      // If this was any provider other than 'ALL', this method would be
      // called with { provider: 'TEST', cursor: undefined, limit: NaN }
      expect(getCollectionsSpy).to.have.been.calledWith({ cursor: undefined, limit: NaN });
    });
    it("should return rel=child links whose href contains a provider rather than 'ALL'", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const mockCollections = generateSTACCollections(5);
      sandbox.stub(Collections, "getCollectionIds").resolves({
        count: mockCollections.length,
        cursor: "foundCursor",
        items: mockCollections.map((coll) => ({
          id: `${coll.id}`,
          title: coll.title ?? faker.random.words(4),
          provider: `TEST`,
        })),
      });

      const { body: catalog, statusCode } = await request(stacApp).get("/stac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "child");
      expect(children).to.have.length(mockCollections.length);

      mockCollections.forEach((collection) => {
        const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

        expect(childLink.href).to.endWith(`/TEST/collections/${collection.id}`);
        expect(childLink.href).to.not.contain("/ALL/");
      });

      expect(statusCode).to.equal(200);
    });
    it("should not return any links of rel=search", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/stac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "search");
      expect(children).to.have.length(0);
      expect(statusCode).to.equal(200);
    });
    it("should have collection search conformance classes", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/stac/ALL");
      const conformanceClasses = catalog.conformsTo;
      const collectionSearchClasses = conformanceClasses.filter((c: String) =>
        c.includes("collection-search")
      );

      expect(statusCode).to.equal(200);
      expect(collectionSearchClasses).not.to.be.empty;
    });
    it("should not have any item search conformance classes", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/stac/ALL");
      const conformanceClasses = catalog.conformsTo;
      const itemSearchClasses = conformanceClasses.filter((c: String) => c.includes("item-search"));

      expect(statusCode).to.equal(200);
      expect(itemSearchClasses).to.be.empty;
    });
    it("should be able to handle providers whose name contains the text 'ALL'", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "LPALL" }]]);

      const mockCollections = generateSTACCollections(1);

      sandbox.stub(Collections, "getCollectionIds").resolves({
        count: mockCollections.length,
        cursor: "foundCursor",
        items: mockCollections.map((coll) => ({
          id: `${coll.id}`,
          title: coll.title ?? faker.random.words(4),
          provider: "LPALL",
        })),
      });

      const { body: catalog, statusCode } = await request(stacApp).get("/stac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "child");

      mockCollections.forEach((collection) => {
        const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

        expect(childLink.href).to.endWith(`/LPALL/collections/${collection.id}`);
        expect(childLink.href).to.not.contain("/ALL/");
      });
    });
  });

  describe("given the cloudstac/ALL provider/catalog", () => {
    beforeEach(() => {
      sandbox
        .stub(Provider, "getCloudProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    });
    it("should call the graphql API with no provider search clause", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const getCollectionsSpy = sandbox
        .stub(Collections, "getCollectionIds")
        .resolves({ count: 0, cursor: null, items: [] });

      const res = await request(stacApp).get("/cloudstac/ALL");
      expect(res.statusCode).to.equal(200);
      // getCollectionIds should have no provider clause in query argument.
      // If this was any provider other than 'ALL', this method would be
      // called with { provider: 'TEST', cursor: undefined, limit: NaN }
      expect(getCollectionsSpy).to.have.been.calledWith({
        cloudHosted: true,
        cursor: undefined,
        limit: NaN,
      });
    });
    it("should return rel=child links whose href contains a provider rather than 'ALL'", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      const mockCollections = generateSTACCollections(5);
      sandbox.stub(Collections, "getCollectionIds").resolves({
        count: mockCollections.length,
        cursor: "foundCursor",
        items: mockCollections.map((coll) => ({
          id: `${coll.id}`,
          title: coll.title ?? faker.random.words(4),
          provider: `TEST`,
        })),
      });

      const { body: catalog, statusCode } = await request(stacApp).get("/cloudstac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "child");
      expect(children).to.have.length(mockCollections.length);

      mockCollections.forEach((collection) => {
        const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

        expect(childLink.href).to.endWith(`/TEST/collections/${collection.id}`);
        expect(childLink.href).to.not.contain("/ALL/");
      });

      expect(statusCode).to.equal(200);
    });
    it("should not return any links of rel=search", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/cloudstac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "search");
      expect(children).to.have.length(0);
      expect(statusCode).to.equal(200);
    });
    it("should have collection search conformance classes", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/cloudstac/ALL");
      const conformanceClasses = catalog.conformsTo;
      const collectionSearchClasses = conformanceClasses.filter((c: String) =>
        c.includes("collection-search")
      );

      expect(statusCode).to.equal(200);
      expect(collectionSearchClasses).not.to.be.empty;
    });
    it("should not have any item search conformance classes", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollectionIds").resolves({ count: 0, cursor: null, items: [] });

      const { body: catalog, statusCode } = await request(stacApp).get("/cloudstac/ALL");
      const conformanceClasses = catalog.conformsTo;
      const itemSearchClasses = conformanceClasses.filter((c: String) => c.includes("item-search"));

      expect(statusCode).to.equal(200);
      expect(itemSearchClasses).to.be.empty;
    });
    it("should be able to handle providers whose name contains the text 'ALL'", async () => {
      sandbox
        .stub(Provider, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "LPALL" }]]);

      const mockCollections = generateSTACCollections(1);

      sandbox.stub(Collections, "getCollectionIds").resolves({
        count: mockCollections.length,
        cursor: "foundCursor",
        items: mockCollections.map((coll) => ({
          id: `${coll.id}`,
          title: coll.title ?? faker.random.words(4),
          provider: "LPALL",
        })),
      });

      const { body: catalog } = await request(stacApp).get("/cloudstac/ALL");

      const children = catalog.links.filter((l: Link) => l.rel === "child");

      mockCollections.forEach((collection) => {
        const childLink = children.find((l: Link) => l.href.endsWith(collection.id));

        expect(childLink.href).to.endWith(`/LPALL/collections/${collection.id}`);
        expect(childLink.href).to.not.contain("/ALL/");
      });
    });
    it("should not display any non-cloudhosted providers", async () => {
      sandbox.stub(Provider, "getProviders").resolves([
        null,
        [
          { "short-name": "CLOUD_PROV", "provider-id": "CLOUD_PROV" },
          { "short-name": "NOT_CLOUD", "provider-id": "NOT_CLOUD" },
        ],
      ]);
      const mockCollections = generateSTACCollections(2);
      sandbox
        .stub(Collections, "getCollectionIds")
        .withArgs(sinon.match({ cloudHosted: true }), sinon.match.any)
        .resolves({
          count: 1,
          cursor: "foundCursor",
          items: [mockCollections[0]].map((coll) => ({
            id: `${coll.id}`,
            title: coll.title ?? faker.random.words(4),
            provider: "CLOUD_PROV",
          })),
        })
        .withArgs(sinon.match({ cloudHosted: false }), sinon.match.any)
        .resolves({
          count: mockCollections.length,
          cursor: "foundCursor",
          items: mockCollections.map((coll, idx) => ({
            id: `${coll.id}`,
            title: coll.title ?? faker.random.words(4),
            provider: idx === 0 ? "CLOUD_PROV" : "NOT_CLOUD",
          })),
        });

      const { body: catalog, statusCode } = await request(stacApp).get("/cloudstac/ALL");

      expect(statusCode).to.equal(200);
      const children = catalog.links.filter((l: Link) => l.rel === "child");
      expect(children).to.have.length(1);
      expect(children[0].href).to.include("CLOUD_PROV");
    });
    it("should not display any non-cloudhosted providers", async () => {});
  });
});
