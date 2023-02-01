import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
import { generateSTACCollections } from "../utils/testUtils";
const app = createApp();
import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";

const emptyCollections = { facets: null, count: 0, cursor: "", items: [] };
const emptyCollectionIds = { count: 0, cursor: "", conceptIds: [] };

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

const cmrProvidersResponse = [
  { "provider-id": "TEST_PROVIDER", "short-name": "TEST_PROVIDER" },
];

describe("GET /:provider/collections", () => {
  describe("given an invalid provider", () => {
    it("should return a 404", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get(
        "/stac/BAD_PROVIDER/collections"
      );

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["Provider [BAD_PROVIDER] not found."],
      });
    });
  });

  describe("given a valid provider", () => {
    it("should return a 200", async () => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
      sandbox
        .stub(Collections, "getCollectionIds")
        .resolves(emptyCollectionIds);

      const { statusCode, body } = await request(app).get(
        "/stac/TEST_PROVIDER/collections"
      );

      expect(statusCode).to.equal(200);

      const validate = ajv.compile(CatalogSpec);
      const stacSchemaValid = validate(body);

      expect(stacSchemaValid, JSON.stringify(validate.errors, null, 2)).to.be
        .true;
    });

    describe("given there are child collections", () => {
      it("should return a valid STAC catalog", async () => {
        sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
        sandbox.stub(Collections, "getCollectionIds").resolves({
          count: 1,
          cursor: "abc",
          conceptIds: [generateSTACCollections(1)[0].id],
        });

        const { body } = await request(app).get(
          "/stac/TEST_PROVIDER/collections"
        );

        const validate = ajv.compile(CatalogSpec);
        const stacSchemaValid = validate(body);

        expect(stacSchemaValid, JSON.stringify(validate.errors, null, 2)).to.be
          .true;
      });
    });

    describe("given an invalid datetime parameter", () => {
      it("should return a 400", async () => {
        sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
        sandbox
          .stub(Collections, "getCollectionIds")
          .resolves(emptyCollectionIds);

        const { statusCode, body } = await request(app)
          .get("/stac/TEST_PROVIDER/collections")
          .query({ datetime: "1234-56-789" });

        expect(statusCode).to.equal(400);
        expect(body).to.deep.equal({
          errors: [
            "Query param datetime does not match any valid date format. Please use RFC3339 or ISO8601 valid dates.",
          ],
        });
      });
    });

    describe("given a datetime parameter", () => {
      describe("where a single date is provided", () => {
        [
          "2000-12-31",
          "2000-12-31T23:59:59.000",
          "2000-12-31T23:59:59.000Z",
        ].forEach((dateString) => {
          it(`should handle ${dateString} and return a 200`, async () => {
            sandbox
              .stub(Providers, "getProviders")
              .resolves(cmrProvidersResponse);
            sandbox
              .stub(Collections, "getCollectionIds")
              .resolves(emptyCollectionIds);

            const { statusCode, body } = await request(app)
              .get(`/stac/TEST_PROVIDER/collections`)
              .query({ datetime: dateString });
            expect(statusCode).to.equal(200);
          });
        });
      });

      describe("where an open ended date window is provided", () => {
        [
          "2000-12-31/..",
          "2000-12-31T23:59:59.000/..",
          "2000-12-31T23:59:59.000Z/..",
          "../2000-12-31",
          "../2000-12-31T23:59:59.000",
          "../2000-12-31T23:59:59.000Z",
        ].forEach((dateString) => {
          it(`should handle ${dateString} and return a 200`, async () => {
            sandbox
              .stub(Providers, "getProviders")
              .resolves(cmrProvidersResponse);
            sandbox
              .stub(Collections, "getCollectionIds")
              .resolves(emptyCollectionIds);

            const { statusCode, body } = await request(app)
              .get(`/stac/TEST_PROVIDER/collections`)
              .query({ datetime: dateString });
            expect(statusCode).to.equal(200);
          });
        });
      });

      describe("where a closed date window is provided", () => {
        [
          "2000-12-31,2001-12-31",
          "2000-12-31/2001-12-31",
          "2000-12-31T23:59:59.000,2001-12-31T23:59:59.000",
          "2000-12-31T23:59:59.000/2001-12-31T23:59:59.000",
          "2000-12-31T23:59:59.000Z,2001-12-31T23:59:59.000Z",
          "2000-12-31T23:59:59.000Z/2001-12-31T23:59:59.000Z",
          "1996-12-19T16:39:57+08:00",
          "1985-04-12T23:20:50.52+01:00/1986-04-12T23:20:50.52+01:00",
        ].forEach((dateString) => {
          it(`should handle ${dateString} and return a 200`, async () => {
            sandbox
              .stub(Providers, "getProviders")
              .resolves(cmrProvidersResponse);

            sandbox
              .stub(Collections, "getCollectionIds")
              .resolves(emptyCollectionIds);

            const { statusCode, body } = await request(app)
              .get(`/stac/TEST_PROVIDER/collections`)
              .query({ datetime: dateString });
            expect(statusCode).to.equal(200);
          });
        });
      });
    });
  });
});
