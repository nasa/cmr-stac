import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
const app = createApp();
import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";

const emptyCollections = { count: 0, cursor: null, items: [] };
const emptyCollectionIds = { count: 0, cursor: null, items: [] };

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider/collections", () => {
  describe("given an invalid provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
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
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "PROV", "short-name": "PROV" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);

      const { statusCode, body } = await request(app).get(
        "/stac/PROV/collections"
      );

      expect(statusCode).to.equal(200);
    });

    describe("given an invalid datetime parameter", () => {
      it("should return a 400", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "PROV", "short-name": "PROV" }]]);
        sandbox
          .stub(Collections, "getCollectionIds")
          .resolves(emptyCollectionIds);

        const { statusCode, body } = await request(app)
          .get("/stac/PROV/collections")
          .query({ datetime: "1234-56-789" });

        expect(statusCode).to.equal(400);
        expect(body).to.deep.equal({
          errors: [
            "Query param datetime does not match a valid date format. Please use RFC3339 or ISO8601 formatted datetime strings.",
          ],
        });
      });
    });

    describe("given a datetime parameter", () => {
      describe("where a single date is provided", () => {
        ["2000-12-31T23:59:59.000Z"].forEach((dateString) => {
          it(`should handle ${dateString} and return a 200`, async () => {
            sandbox
              .stub(Providers, "getProviders")
              .resolves([
                null,
                [{ "provider-id": "PROV", "short-name": "PROV" }],
              ]);
            sandbox
              .stub(Collections, "getCollections")
              .resolves(emptyCollections);

            const { statusCode } = await request(app)
              .get(`/stac/PROV/collections`)
              .query({ datetime: dateString });
            expect(statusCode).to.equal(200);
          });
        });
      });

      describe("where an open ended date window is provided", () => {
        ["2000-12-31T23:59:59.000Z/..", "../2000-12-31T23:59:59.000Z"].forEach(
          (dateString) => {
            it(`should handle ${dateString} and return a 200`, async () => {
              sandbox
                .stub(Providers, "getProviders")
                .resolves([
                  null,
                  [{ "provider-id": "PROV", "short-name": "PROV" }],
                ]);
              sandbox
                .stub(Collections, "getCollections")
                .resolves(emptyCollections);

              const { statusCode } = await request(app)
                .get(`/stac/PROV/collections`)
                .query({ datetime: dateString });
              expect(statusCode).to.equal(200);
            });
          }
        );
      });

      describe("where a closed date window is provided", () => {
        ["2019-04-28T06:14:50.000Z,2020-04-28T06:14:50.000Z"].forEach(
          (dateString) => {
            it(`should handle ${dateString} and return a 200`, async () => {
              sandbox
                .stub(Providers, "getProviders")
                .resolves([
                  null,
                  [{ "provider-id": "PROV", "short-name": "PROV" }],
                ]);

              sandbox
                .stub(Collections, "getCollections")
                .resolves(emptyCollections);

              const { statusCode } = await request(app)
                .get(`/stac/PROV/collections`)
                .query({ datetime: dateString });
              expect(statusCode).to.equal(200);
            });
          }
        );
      });
    });
  });
});
