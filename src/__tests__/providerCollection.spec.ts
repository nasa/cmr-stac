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

const emptyCollections = { facets: null, count: 0, cursor: "", items: [] };

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

const cmrProvidersResponse = [
  { "provider-id": "TEST_PROVIDER", "short-name": "TEST_PROVIDER" },
];

describe("GET /:provider/collections/:collectionId", () => {
  describe("given an invalid provider", () => {
    it("should return a 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get(
        "/stac/BAD_PROVIDER/collections/foo"
      );

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["Provider [BAD_PROVIDER] not found."],
      });
    });
  });

  describe("given an invalid collectionId", () => {
    it("should return a 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get(
        "/stac/TEST_PROVIDER/collections/foo"
      );

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors:
          "Collection with ID [foo] in provider [TEST_PROVIDER] not found.",
      });
    });
  });

  describe("given a valid collectionId", () => {
    it("should return a valid STAC Collection", async () => {
      const mockCollections = generateSTACCollections(1);
      const mockCollection = mockCollections[0];

      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves({
        facets: null,
        count: 1,
        cursor: "cursor",
        items: mockCollections,
      });

      const { statusCode, body } = await request(app).get(
        `/stac/TEST_PROVIDER/collections/${mockCollection.id}`
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
