import request from "supertest";
import * as sinon from "sinon";
import { expect } from "chai";

import axios, { AxiosRequestConfig } from "axios";

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import { Link } from "../@types/StacCatalog";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const ajv = new Ajv();
apply(ajv);

import { createApp } from "../app";
const app = createApp();

import * as Providers from "../domains/providers";

const cmrProvidersResponse = [null, [{ "provider-id": "TEST", "short-name": "TEST" }]];

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("GET /stac", () => {
  before(() => {
    sandbox.stub(Providers, "getProviders").resolves([null, []]);
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
    expect(body.links.find((l: Link) => l.rel === "service-doc")).to.have.property(
      "title",
      `NASA CMR-STAC Documentation`
    );
  });

  describe("given CMR responds with providers", () => {
    beforeEach(() => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
    });

    it("should have an entry for each provider in the links", async () => {
      const { statusCode, body } = await request(app).get("/stac");

      expect(statusCode).to.equal(200);
      const [, expectedProviders] = cmrProvidersResponse;

      expectedProviders!.forEach((provider) => {
        const providerLink = body.links.find((l: Link) => l.href.includes(provider["provider-id"]));

        expect(providerLink.href).to.match(/^(http)s?:\/\/.*\w+/);
        expect(providerLink.rel).to.equal("child");
        expect(providerLink.type).to.equal("application/json");
        expect(providerLink.title).to.equal(provider["provider-id"]);
      });
    });

    it("should have an entry for each provider in the links without query parameters", async () => {
      const { statusCode, body } = await request(app).get("/stac?param=value");

      expect(statusCode).to.equal(200);
      const [, expectedProviders] = cmrProvidersResponse;

      expectedProviders!.forEach((provider) => {
        const providerLink = body.links.find((l: Link) => l.href.includes(provider["provider-id"]));

        expect(providerLink.href).to.match(/^(http)s?:\/\/.*\w+/);
        expect(providerLink.href).to.not.contain("?param=value");
        expect(providerLink.rel).to.equal("child");
        expect(providerLink.type).to.equal("application/json");
        expect(providerLink.title).to.equal(provider["provider-id"]);
      });
    });

    it("should have an entry for the 'ALL' catalog", async () => {
      const { statusCode, body } = await request(app).get("/stac");

      expect(statusCode).to.equal(200);
      const [, expectedProviders] = cmrProvidersResponse;
      console.debug(`Body: ${JSON.stringify(body)}`)
      // Find the all catalog links.find((link) => link.rel === "items");
      const allLink = body.links.find((l: Link) => l.title === "all");

      expect(allLink.href).to.match(/^(http)s?:\/\/.*\w+/);
      expect(allLink.href).to.endWith('/stac/ALL');
      expect(allLink.href).to.not.contain("?param=value");
      expect(allLink.rel).to.equal("child");
      expect(allLink.type).to.equal("application/json");
      expect(allLink.title).to.equal("all");
    });
  });

  describe("given CMR providers endpoint responds with an error", () => {
    it("should return a 503 response", async () => {
      sandbox.stub(Providers, "getProviders").resolves(["No upstream connection", null]);

      const { statusCode, body } = await request(app).get("/stac");

      expect(statusCode, JSON.stringify(body, null, 2)).to.equal(503);
      expect(body).to.have.property("errors");
    });
  });
});

describe("/cloudstac", () => {
  let mockCmrHits: (s: string, c: AxiosRequestConfig<any> | undefined) => Promise<any>;

  before(() => {
    sandbox.stub(Providers, "getProviders").resolves([
      null,
      [
        { "short-name": "CLOUD_PROV", "provider-id": "CLOUD_PROV" },
        { "short-name": "NOT_CLOUD", "provider-id": "NOT_CLOUD" },
      ],
    ]);

    mockCmrHits = sandbox
      .stub(axios, "get")
      .callsFake(async (_url: string, config: AxiosRequestConfig<any> | undefined) =>
        config!.params!.provider!.startsWith("CLOUD")
          ? Promise.resolve({ headers: { "cmr-hits": "99" } })
          : Promise.resolve({ headers: { "cmr-hits": "0" } })
      );
  });

  it("only lists providers with cloud holdings", async () => {
    const { statusCode, body } = await request(app).get("/cloudstac");

    expect(statusCode).to.equal(200);
    expect(body.links.find((l: { title: string }) => l.title === "CLOUD_PROV")).have.property(
      "title",
      "CLOUD_PROV"
    );
    expect(body.links.find((l: { title: string }) => l.title === "CLOUD_PROV")).have.property(
      "rel",
      "child"
    );
    expect(body.links.find((l: { title: string }) => l.title === "CLOUD_PROV")).have.property(
      "type",
      "application/json"
    );

    expect(body.links.find((l: { title: string }) => l.title === "NOT_CLOUD")).to.be.undefined;

    expect(mockCmrHits).to.have.been.calledThrice;
  });
});
