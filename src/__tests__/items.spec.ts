import request from "supertest";
import * as sinon from "sinon";
import chai from "chai";
import chaiString from "chai-string";
import sinonChai from "sinon-chai";

chai.use(chaiString);
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
import { Link } from "../@types/StacCatalog";

const cmrCollectionsResponse = {
  items: [
    {
      id: "TEST_COLL",
    } as STACCollection,
  ],
  cursor: "TEST_COLL_CURSOR",
  count: 1,
};
const cmrItemsResponse = {
  items: [
    {
      id: "TEST ITEM",
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
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    sandbox.stub(Collections, "getCollections").resolves(cmrCollectionsResponse);
    sandbox.stub(Items, "getItems").resolves(cmrItemsResponse);
  });

  describe("given the provider does not exist", () => {
    it("should return 404", async () => {
      const { statusCode } = await request(app).get("/BAD_PROVIDER/collections/COLLECTION/items");
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the collection does not exist", () => {
    it("should return 404", async () => {
      const { statusCode } = await request(app).get("/TEST/collections/COLLECTION/items");
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the provider and collection exist", () => {
    it("should return 200", async () => {
      const { statusCode, body } = await request(app).get("/stac/TEST/collections/TEST_COLL/items");
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
    });
  });

  describe("given there are query parameters on the path", () => {
    it("excludes query parameters", async () => {
      const { statusCode, body } = await request(app).get(
        "/stac/TEST/collections/TEST_COLL/items?cursor=pageonemillion"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);

      const selfLink = body.features[0].links.find((lnk: Link) => lnk.rel === "self");
      expect(selfLink.href).endsWith("/stac/TEST/collections/TEST_COLL/items/TEST%20ITEM");
    });

    it("URI encodes names", async () => {
      const { statusCode, body } = await request(app).get(
        "/stac/TEST/collections/TEST_COLL/items?cursor=pageonemillion"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);

      const selfLink = body.features[0].links.find((lnk: Link) => lnk.rel === "self");
      expect(selfLink.href).endsWith("/stac/TEST/collections/TEST_COLL/items/TEST%20ITEM");
    });
  });
});

describe("GET /PROVIDER/collections/COLLECTION/items/ITEM", () => {
  describe("given the provider does not exist", () => {
    it("should return 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves([null, []]);

      const { statusCode, body } = await request(app).get(
        "/BAD_PROVIDER/collections/COLLECTION/items/ITEM"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(404);
    });
  });

  describe("given the collection does not exist", () => {
    it("should return 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves({ cursor: null, items: [], count: 0 });

      const { statusCode } = await request(app).get("/stac/TEST/collections/COLLECTION/items/ITEM");
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the item does not exist", () => {
    it("should return 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollections").resolves({
        cursor: null,
        items: [{ id: "TEST_COLL" } as STACCollection],
        count: 1,
      });

      sandbox.stub(Items, "getItems").resolves({
        cursor: null,
        items: [],
        count: 0,
      });

      const { statusCode } = await request(app).get("/stac/TEST/collections/COLLECTION/items/ITEM");
      expect(statusCode).to.equal(404);
    });
  });

  describe("given the provider, collection, and item exist", () => {
    it("should return 200", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves({
        cursor: null,
        items: [{ id: "TEST_COLL" } as STACCollection],
        count: 1,
      });
      sandbox.stub(Items, "getItems").resolves({
        cursor: "cursor",
        items: [{ id: "TEST_ITEM" } as STACItem],
        count: 1,
      });

      const { statusCode } = await request(app).get(
        "/stac/TEST/collections/TEST_COLL/items/TEST_ITEM"
      );
      expect(statusCode).to.equal(200);
    });
  });
});

describe("GET stac/ALL/collections/:collection/items/", () => {
  it("should return a 404", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    const { statusCode, body } = await request(app).get("/stac/ALL/collections/foo/items");

    expect(statusCode).to.equal(404);
    expect(body).to.deep.equal({
      errors: ["This operation is not allowed for the ALL Catalog."],
    });
  });
});

describe("GET cloudstac/ALL/collections/:collection/items/", () => {
  it("should return a 404", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    sandbox
      .stub(Providers, "getCloudProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    const { statusCode, body } = await request(app).get("/cloudstac/ALL/collections/foo/items");

    expect(statusCode).to.equal(404);
    expect(body).to.deep.equal({
      errors: ["This operation is not allowed for the ALL Catalog."],
    });
  });
});

describe("GET stac/ALL/collections/:collection/items/:item", () => {
  it("should return a 404", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    const { statusCode, body } = await request(app).get("/stac/ALL/collections/foo/items/bar");

    expect(statusCode).to.equal(404);
    expect(body).to.deep.equal({
      errors: ["This operation is not allowed for the ALL Catalog."],
    });
  });
});

describe("GET cloudstac/ALL/collections/:collection/items/:item", () => {
  it("should return a 404", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    sandbox
      .stub(Providers, "getCloudProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    const { statusCode, body } = await request(app).get("/cloudstac/ALL/collections/foo/items/bar");

    expect(statusCode).to.equal(404);
    expect(body).to.deep.equal({
      errors: ["This operation is not allowed for the ALL Catalog."],
    });
  });
});

describe("GET /cloudstac/PROVIDER/collections/COLLECTION/items", () => {
  beforeEach(() => {
    sandbox.stub(Items, "getItems").resolves(cmrItemsResponse);
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    sandbox
      .stub(Providers, "getCloudProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
  });
  describe("given a cloudstac url for items", async () => {
    it("should throw an error if not cloudhosted", async () => {
      sandbox.stub(Collections, "getCollections").resolves(cmrCollectionsResponse);
      const { statusCode, body } = await request(app).get(
        "/cloudstac/TEST/collections/TEST_COLL/items"
      );
      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(404);
    });
  });
  it("should not throw an error if cloudhosted", async () => {
    sandbox.stub(Collections, "getCollections").resolves({
      ...cmrCollectionsResponse,
      items: [
        {
          ...cmrCollectionsResponse.items[0],
          "storage:schemes": { aws: { type: "aws-s3" } },
        },
      ],
    });
    sandbox.stub(Collections, "getCollectionIds").resolves({
      count: 1,
      cursor: "foundCursor",
      items: cmrCollectionsResponse.items.map((coll) => ({
        id: `${coll.id}`,
        title: coll.title ?? "test",
        provider: "TEST",
      })),
    });
    const { statusCode, body } = await request(app).get(
      "/cloudstac/TEST/collections/TEST_COLL/items"
    );
    expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
  });
});

describe("given a cloudstac url for item", () => {
  beforeEach(() => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    sandbox
      .stub(Providers, "getCloudProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
  });
  it("should throw an error if not cloudhosted", async () => {
    sandbox.stub(Items, "getItems").resolves({
      cursor: "cursor",
      items: [{ id: "TEST_ITEM", properties: { title: "test" } } as STACItem],
      count: 1,
    });
    sandbox.stub(Collections, "getCollections").resolves(cmrCollectionsResponse);
    sandbox.stub(Collections, "getCollectionIds").resolves({
      count: 1,
      cursor: "foundCursor",
      items: cmrCollectionsResponse.items.map((coll) => ({
        id: `${coll.id}`,
        title: coll.title ?? "test",
        provider: "TEST",
      })),
    });
    const { statusCode, body } = await request(app).get(
      "/cloudstac/TEST/collections/TEST_COLL/items/TEST_ITEM"
    );
    expect(statusCode, JSON.stringify(body, null, 2)).to.equal(404);
  });
  it("should not throw an error if cloudhosted", async () => {
    sandbox.stub(Items, "getItems").resolves({
      ...cmrItemsResponse,
      items: [
        {
          ...cmrItemsResponse.items[0],
          properties: {
            "storage:schemes": { aws: { type: "aws-s3" } },
          },
        } as STACItem,
      ],
    });
    sandbox.stub(Collections, "getCollections").resolves(cmrCollectionsResponse);
    sandbox.stub(Collections, "getCollectionIds").resolves({
      count: 1,
      cursor: "foundCursor",
      items: cmrCollectionsResponse.items.map((coll) => ({
        id: `${coll.id}`,
        title: coll.title ?? "test",
        provider: "TEST",
      })),
    });
    const { statusCode, body } = await request(app).get(
      "/cloudstac/TEST/collections/TEST_COLL/items/TEST_ITEM"
    );
    expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
  });
});
