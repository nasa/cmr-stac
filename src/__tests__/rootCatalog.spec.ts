import request from "supertest";
import * as sinon from "sinon";
import { expect } from "chai";

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import { Link } from "../@types/StacCatalog";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
const app = createApp();

import * as Providers from "../domains/providers";

const cmrProvidersResponse = [
  { "provider-id": "PROVIDER_A", "short-name": "PROVIDER_A" },
];

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /stac", () => {
  before(() => {
    sandbox.stub(Providers, "getProviders").resolves([]);
  });

  it("should return a catalog response", async () => {
    const { body } = await request(app).get("/stac");

    const validate = ajv.compile(CatalogSpec);
    const stacSchemaValid = validate(body);

    expect(body).to.have.property("id", "CMR-STAC");
    expect(stacSchemaValid).to.be.true;
    expect(body).to.have.property("links");

    expect(body.links.find((l: Link) => l.rel === "self")).to.have.property(
      "title",
      `NASA CMR-STAC Root Catalog`
    );
    expect(body.links.find((l: Link) => l.rel === "root")).to.have.property(
      "title",
      `NASA CMR-STAC Root Catalog`
    );
    expect(
      body.links.find((l: Link) => l.rel === "service-doc")
    ).to.have.property("title", `NASA CMR-STAC Documentation`);
  });

  describe("given CMR responds with providers", () => {
    before(() => {
      sandbox.stub(Providers, "getProviders").resolves(cmrProvidersResponse);
    });

    it("should have an entry for each provider in the links", async () => {
      const { statusCode, body } = await request(app).get("/stac");

      expect(statusCode).to.equal(200);

      cmrProvidersResponse.forEach((provider) => {
        const providerLink = body.links.find((l: Link) =>
          l.href.includes(provider["provider-id"])
        );

        expect(providerLink.href).to.match(/^(http)s?:\/\/.*\w+/);
        expect(providerLink.rel).to.equal("child");
        expect(providerLink.type).to.equal("application/json");
        expect(providerLink.title).to.equal(provider["provider-id"]);
      });
    });
  });

  describe("given CMR providers endpoint responds with an error", () => {
    it("should return a 503 response", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .throws(new Error("No upstream connection"));

      const { statusCode, body } = await request(app).get("/stac");

      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(503);
      expect(body).to.have.property("errors");
    });
  });
});
