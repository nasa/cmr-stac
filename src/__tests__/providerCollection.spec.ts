import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import CollectionSpec from "../../resources/collection-spec/json-schema/collection.json";
import ItemSpec from "../../resources/item-spec/json-schema/item.json";
import BasicSpec from "../../resources/item-spec/json-schema/basics.json";
import DateSpec from "../../resources/item-spec/json-schema/datetime.json";
import InstrumentSpec from "../../resources/item-spec/json-schema/instrument.json";
import LicenseSpec from "../../resources/item-spec/json-schema/licensing.json";
import ProviderSpec from "../../resources/item-spec/json-schema/provider.json";
import FeatureSpec from "../../resources/Feature.json";
import GeometrySpec from "../../resources/Geometry.json";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const addFormats = require("ajv-formats").default;

const ajv = new Ajv({ strict: false });
apply(ajv);
addFormats(ajv);

import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";

import { createApp } from "../app";
const app = createApp();

import { generateSTACCollections } from "../utils/testUtils";
import { Link } from "../@types/StacCatalog";

const emptyCollections = { facets: null, count: 0, cursor: "", items: [] };

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider/collections", () => {
  describe("given a valid provider", () => {
    it("returns status 200", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      const { statusCode } = await request(app).get("/stac/TEST/collections");

      expect(statusCode).to.equal(200);
    });
  });
  describe("bbox parameter", () => {
    it("should return list of collections within specified bounding box", async () => {
      const mockCollections = generateSTACCollections(3);

      mockCollections[0].extent.spatial.bbox = [[-10, -10, 10, 10]];
      mockCollections[1].extent.spatial.bbox = [[-5, -5, 5, 5]];
      mockCollections[2].extent.spatial.bbox = [[20, 20, 30, 30]]; // This one should not be returned

      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      sandbox.stub(Collections, "getCollections").resolves({
        count: 2,
        cursor: null,
        items: mockCollections.slice(0, 2),
      });

      const { statusCode, body } = await request(app)
        .get("/stac/TEST/collections")
        .query({ bbox: "-15,-15,15,15" });

      expect(statusCode).to.equal(200);
      expect(body.collections).to.have.lengthOf(2);
      expect(body.collections[0].id).to.equal(mockCollections[0].id);
      expect(body.collections[1].id).to.equal(mockCollections[1].id);
    });
    it("should return 400 for invalid bbox format", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const { statusCode, body } = await request(app)
        .get("/stac/TEST/collections")
        .query({ bbox: "invalid,bbox,format" });

      expect(statusCode).to.equal(400);
      expect(body).to.have.property("errors");
      expect(body).to.deep.equal({
        errors: [
          "BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.",
        ],
      });
    });
  });

  describe("given a provider with two collections, one of which is a collection containing a link to a STAC item API", () => {
    it("returns collections with links of rel=items to the appropriate endpoints", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const mockCollections = generateSTACCollections(2);

      const link = {
        rel: "items",
        href: "https://brazildatacube.dpi.inpe.br/stac/collections/MOSAIC-S2-YANOMAMI-6M-1/items",
        type: "application/geo+json",
      };
      mockCollections[0].links.push(link);

      sandbox.stub(Collections, "getCollections").resolves({
        count: 2,
        cursor: null,
        items: mockCollections,
      });

      const { statusCode, body } = await request(app).get("/stac/TEST/collections");

      expect(statusCode).to.equal(200);
      expect(body.collections).to.have.lengthOf(2);

      // Expect there to be one link with rel=items
      expect(body.collections[0].links.filter((l: Link) => l.rel === "items")).to.have.lengthOf(1);
      // Expect the href to match the STAC API described.
      const link0: Link = body.collections[0].links.find((l: Link) => l.rel === "items");
      expect(link0.href).to.equal(
        "https://brazildatacube.dpi.inpe.br/stac/collections/MOSAIC-S2-YANOMAMI-6M-1/items"
      );

      // Expect there to be on line with rel=items
      expect(body.collections[1].links.filter((l: Link) => l.rel === "items")).to.have.lengthOf(1);
      // Expect the href to match the generic STAC API.
      const link1: Link = body.collections[1].links.find((l: Link) => l.rel === "items");
      expect(link1.href).to.contain("/stac/TEST/collections/");
      expect(link1.href).to.endsWith("/items");
    });
  });

  describe("datetime parameter", () => {
    it("should return collections within the specified datetime range", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const mockCollections = generateSTACCollections(3);

      mockCollections[0].extent.temporal.interval = [
        ["2020-01-01T00:00:00Z", "2020-12-31T23:59:59Z"],
      ];
      mockCollections[1].extent.temporal.interval = [
        ["2021-01-01T00:00:00Z", "2021-12-31T23:59:59Z"],
      ];
      mockCollections[2].extent.temporal.interval = [
        ["2022-01-01T00:00:00Z", "2022-12-31T23:59:59Z"],
      ];

      sandbox.stub(Collections, "getCollections").resolves({
        count: 2,
        cursor: null,
        items: mockCollections.slice(0, 2), // Only return the first two collections
      });

      const { statusCode, body } = await request(app)
        .get("/stac/TEST/collections")
        .query({ datetime: "2020-06-01T00:00:00Z/2021-06-01T00:00:00Z" });

      expect(statusCode).to.equal(200);
      expect(body.collections).to.have.lengthOf(2);
      expect(body.collections[0].id).to.equal(mockCollections[0].id);
      expect(body.collections[1].id).to.equal(mockCollections[1].id);
    });
  });

  describe("Free text parameter", () => {
    describe("given a matching free text query", () => {
      it("should return collections matching the free text search", async () => {
        const mockCollections = generateSTACCollections(3);
        mockCollections[0].title = "Landsat 8 Collection";
        mockCollections[1].title = "Sentinel-2 Collection";
        mockCollections[2].title = "MODIS Collection";

        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        sandbox.stub(Collections, "getCollections").resolves({
          count: 1,
          cursor: null,
          items: [mockCollections[0]], // Only return the Landsat collection
        });

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: "Landsat" });

        expect(statusCode).to.equal(200);
        expect(body.collections).to.have.lengthOf(1);
        expect(body.collections[0].title).to.equal("Landsat 8 Collection");
      });
    });

    describe("given a free text query without matching collection", () => {
      it("should return an empty result for non-matching free text search", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        sandbox.stub(Collections, "getCollections").resolves({
          count: 0,
          cursor: null,
          items: [],
        });

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: "NonExistentCollection" });

        expect(statusCode).to.equal(200);
        expect(body.collections).to.have.lengthOf(0);
      });
    });

    describe("given a matching keyword phrase", () => {
      it("should return collections matching the keyword phrase", async () => {
        const mockCollections = generateSTACCollections(3);
        mockCollections[0].title = "Landsat 8 Collection";
        mockCollections[1].title = "Sentinel-2 Collection";
        mockCollections[2].title = "MODIS Collection";

        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        sandbox.stub(Collections, "getCollections").resolves({
          count: 1,
          cursor: null,
          items: [mockCollections[0]], // Only return the Landsat collection
        });

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: '"Landsat 8 Collection"' });

        expect(statusCode).to.equal(200);
        expect(body.collections).to.have.lengthOf(1);
        expect(body.collections[0].title).to.equal("Landsat 8 Collection");
      });
    });

    describe("given a free text query with a keyword and keyword phrase", () => {
      it("should return 400 for invalid free text query", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: '"Earth Science" Climate' });

        expect(statusCode).to.equal(400);
        expect(body).to.have.property("errors");
        expect(body.errors).to.include(
          "Search query must be either a single keyword or a single phrase enclosed in double quotes."
        );
      });
    });

    describe("given a free text query with unmatched quotes", () => {
      it("should return 400 for invalid free text query", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: '"Earth Science' });

        expect(statusCode).to.equal(400);
        expect(body).to.have.property("errors");
        expect(body.errors).to.include(
          "Search query must be either a single keyword or a single phrase enclosed in double quotes."
        );
      });
    });

    describe("given a free text query with multiple keyword phrases", () => {
      it("should return 400 for invalid free text query", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ q: '"Earth Science" "Climate Change"' });

        expect(statusCode).to.equal(400);
        expect(body).to.have.property("errors");
        expect(body.errors).to.include(
          "Search query must be either a single keyword or a single phrase enclosed in double quotes."
        );
      });
    });
  });

  describe("sortby parameter", () => {
    describe("given a valid sortby field", () => {
      it("should return sorted result", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const mockCollections = generateSTACCollections(2);
        sandbox.stub(Collections, "getCollections").resolves({
          count: 2,
          cursor: null,
          items: mockCollections,
        });

        const { statusCode } = await request(app)
          .get("/stac/TEST/collections")
          .query({ sortby: "-endDate" });

        expect(statusCode).to.equal(200);
      });
    });

    describe("given a invalid sortby field", () => {
      it("should return an Invalid sort field(s) error", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

        const { statusCode, body } = await request(app)
          .get("/stac/TEST/collections")
          .query({ sortby: "invalid_field" });

        expect(statusCode).to.equal(400);
        expect(body).to.have.property("errors");
        expect(body.errors[0]).to.include(
          "Invalid sort field(s). Valid fields are: startDate, endDate, id, title, eo:cloud_cover"
        );
      });
    });
  });
});

describe("POST /:provider/collections", () => {
  it("should return collections matching the POST body parameters", async () => {
    const mockCollections = generateSTACCollections(2);

    mockCollections[0].extent.spatial.bbox = [[-10, -10, 10, 10]];
    mockCollections[0].extent.temporal.interval = [
      ["2020-01-01T00:00:00Z", "2020-12-31T23:59:59Z"],
    ];
    mockCollections[1].extent.spatial.bbox = [[-5, -5, 5, 5]];
    mockCollections[1].extent.temporal.interval = [
      ["2021-01-01T00:00:00Z", "2021-12-31T23:59:59Z"],
    ];

    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    sandbox.stub(Collections, "getCollections").resolves({
      count: 2,
      cursor: null,
      items: mockCollections,
    });

    const { statusCode, body } = await request(app)
      .post("/stac/TEST/collections")
      .send({
        bbox: [-15, -15, 15, 15],
        datetime: "2020-01-01T00:00:00Z/2021-12-31T23:59:59Z",
        limit: 10,
      });

    expect(statusCode).to.equal(200);
    expect(body.collections).to.have.lengthOf(2);
    expect(body.collections[0].id).to.equal(mockCollections[0].id);
    expect(body.collections[1].id).to.equal(mockCollections[1].id);
  });

  it("should return 400 for invalid POST body", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    const { statusCode, body } = await request(app).post("/stac/TEST/collections").send({
      bbox: "invalid bbox",
    });

    // Assertions
    expect(statusCode).to.equal(400);
    expect(body).to.have.property("errors");

    expect(body.errors).to.include.members([
      "BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.",
    ]);
  });
});

describe("GET /:provider/collections/:collectionId", () => {
  describe("given an invalid provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get("/stac/BAD_PROVIDER/collections/foo");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["Provider [BAD_PROVIDER] not found."],
      });
    });
  });

  describe("given an invalid collectionId", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get("/stac/TEST/collections/MISSING");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["Collection with ID [MISSING] in provider [TEST] not found."],
      });
    });
  });

  describe("given a valid collectionId", () => {
    it("should return a valid STAC Collection", async () => {
      const mockCollections = generateSTACCollections(1);
      const mockCollection = mockCollections[0];

      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves({
        count: 1,
        cursor: "cursor",
        items: mockCollections,
      });

      const { statusCode, body } = await request(app).get(
        `/stac/TEST/collections/${mockCollection.id}`
      );

      expect(statusCode).to.equal(200);

      ajv.addSchema(FeatureSpec);
      ajv.addSchema(GeometrySpec);
      ajv.addSchema(ItemSpec);
      ajv.addSchema(BasicSpec);
      ajv.addSchema(DateSpec);
      ajv.addSchema(InstrumentSpec);
      ajv.addSchema(LicenseSpec);
      ajv.addSchema(ProviderSpec);

      const validate = ajv.compile(CollectionSpec);
      const stacSchemaValid = validate(body);

      expect(stacSchemaValid, JSON.stringify(validate.errors)).to.be.true;
    });
  });
});

describe("GET /ALL/collections", () => {
  describe("given the ALL catalog", () => {
    it("returns collections from multiple providers", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const mockCollections = generateSTACCollections(3);

      sandbox.stub(Collections, "getCollections").resolves({
        count: 3,
        cursor: null,
        items: mockCollections,
      });

      const { statusCode, body } = await request(app).get("/stac/ALL/collections");

      expect(statusCode).to.equal(200);
      expect(body.collections).to.have.lengthOf(3);
      // Make sure that we are determining the 'provider' element of the items path from the provider detailed
      // in the collection metadata rather than the ALL route.
      expect(body.collections[0].links.find((l: Link) => l.rel === "items").href).to.include(
        "/PROV1/"
      );
      expect(body.collections[0].links.find((l: Link) => l.rel === "items").href).to.not.include(
        "/ALL/"
      );

      expect(body.collections[1].links.find((l: Link) => l.rel === "items").href).to.include(
        "/PROV1/"
      );
      expect(body.collections[1].links.find((l: Link) => l.rel === "items").href).to.not.include(
        "/ALL/"
      );

      expect(body.collections[2].links.find((l: Link) => l.rel === "items").href).to.include(
        "/PROV1/"
      );
      expect(body.collections[2].links.find((l: Link) => l.rel === "items").href).to.not.include(
        "/ALL/"
      );
    });
    it("returns collection items links that end in 'items", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const mockCollections = generateSTACCollections(1);

      sandbox.stub(Collections, "getCollections").resolves({
        count: 3,
        cursor: null,
        items: mockCollections,
      });

      const { statusCode, body } = await request(app).get("/stac/ALL/collections");

      expect(statusCode).to.equal(200);
      expect(body.collections).to.have.lengthOf(1);
      expect(body.collections[0].links.find((l: Link) => l.rel === "items").href).to.endsWith(
        "/items"
      );
    });
  });
});

describe("GET /ALL/collections/:collectionId", () => {
  it("should return a 404", async () => {
    sandbox
      .stub(Providers, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

    const { statusCode, body } = await request(app).get("/stac/ALL/collections/foo");

    expect(statusCode).to.equal(404);
    expect(body).to.deep.equal({
      errors: ["This operation is not allowed for the ALL Catalog."],
    });
  });
});
