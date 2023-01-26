import request from "supertest";
import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
const app = createApp();

import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";
import * as Items from "../domains/items";
import { STACCollection } from "../@types/StacCollection";
import { STACItem } from "../@types/StacItem";

const cmrProvidersResponse = [
  { "provider-id": "TEST_PROV", "short-name": "TEST_PROV" },
];

const cmrCollectionsResponse = {
  items: [
    {
      id: "TEST_COLL",
    } as STACCollection,
  ],
  facets: null,
  cursor: "TEST_COLL_CURSOR",
  count: 1,
};
const cmrItemsResponse = {
  facets: null,
  items: [
    {
      id: "TEST_ITEM",
    } as STACItem,
  ],
  cursor: "TEST_GRAN_CURSOR",
  count: 1,
};

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /PROVIDER/collections/COLLECTION/items", () => {
  beforeEach(() => {
    sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
    sandbox
      .stub(Collections, "getCollections")
      .resolves(cmrCollectionsResponse);
    sandbox.stub(Items, "getItems").resolves(cmrItemsResponse);
  });

  describe("given the provider does not exist", () => {
    it("should return 404", async () => {
      const { statusCode } = await request(app).get(
        "/BAD_PROVIDER/collections/COLLECTION/items"
      );
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the collection does not exist", () => {
    it("should return 404", async () => {
      const { statusCode } = await request(app).get(
        "/BAD_PROVIDER/collections/COLLECTION/items"
      );
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the provider and collection exist", () => {
    it("should return 200", async () => {
      const { statusCode, body } = await request(app).get(
        "/stac/TEST_PROV/collections/TEST_COLL/items"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
    });
  });
});

describe("GET /PROVIDER/collections/COLLECTION/items/ITEM", () => {
  describe("given the provider does not exist", () => {
    it("should return 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves([]);

      const { statusCode, body } = await request(app).get(
        "/BAD_PROVIDER/collections/COLLECTION/items/ITEM"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(404);
    });
  });

  describe("given the collection does not exist", () => {
    it("should return 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox
        .stub(Collections, "getCollections")
        .resolves({ facets: null, cursor: null, items: [], count: 0 });

      const { statusCode } = await request(app).get(
        "/stac/TEST_PROV/collections/COLLECTION/items/ITEM"
      );
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the item does not exist", () => {
    it("should return 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);

      sandbox.stub(Collections, "getCollections").resolves({
        facets: null,
        cursor: null,
        items: [{ id: "TEST_COLL" } as STACCollection],
        count: 1,
      });

      sandbox.stub(Items, "getItems").resolves({
        facets: null,
        cursor: null,
        items: [],
        count: 0,
      });

      const { statusCode } = await request(app).get(
        "/stac/BAD_PROVIDER/collections/COLLECTION/items/ITEM"
      );
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the provider, collection, and item exist", () => {
    it("should return 200", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves({
        facets: null,
        cursor: null,
        items: [{ id: "TEST_COLL" } as STACCollection],
        count: 1,
      });
      sandbox.stub(Items, "getItems").resolves({
        facets: null,
        cursor: "cursor",
        items: [{ id: "TEST_ITEM" } as STACItem],
        count: 1,
      });

      const { statusCode } = await request(app).get(
        "/stac/TEST_PROV/collections/TEST_COLL/items/TEST_ITEM"
      );
      expect(statusCode).to.equal(200);
    });
  });
});
