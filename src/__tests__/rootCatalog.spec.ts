import request from "supertest";
import * as sinon from "sinon";
import { expect } from "chai";

import CollectionSpec from "../../resources/collection-spec/json-schema/collection.json";
import ItemSpec from "../../resources/item-spec/json-schema/item.json";
import BasicSpec from "../../resources/item-spec/json-schema/basics.json";
import BandsSpec from "../../resources/item-spec/json-schema/bands.json";
import DateSpec from "../../resources/item-spec/json-schema/datetime.json";
import InstrumentSpec from "../../resources/item-spec/json-schema/instrument.json";
import LicenseSpec from "../../resources/item-spec/json-schema/licensing.json";
import ProviderSpec from "../../resources/item-spec/json-schema/provider.json";
import FeatureSpec from "../../resources/Feature.json";
import GeometrySpec from "../../resources/Geometry.json";
import CommonSpec from "../../resources/item-spec/json-schema/common.json";
import DataValuesSpec from "../../resources/item-spec/json-schema/data-values.json";

import axios, { AxiosRequestConfig } from "axios";

import CatalogSpec from "../../resources/catalog-spec/json-schema/catalog.json";
import { Link } from "../@types/StacCatalog";

import Ajv from "ajv";
const apply = require("ajv-formats-draft2019");
const addFormats = require("ajv-formats");
const ajv = new Ajv();
addFormats(ajv);
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

    // GeoJSON Schemas
    ajv.addSchema(FeatureSpec, "https://geojson.org/schema/Feature.json");
    ajv.addSchema(GeometrySpec, "https://geojson.org/schema/Geometry.json");

    // STAC Core Item Schema
    ajv.addSchema(ItemSpec, "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/item.json");

    // STAC Fragments
    ajv.addSchema(
      BasicSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/basics.json"
    );
    ajv.addSchema(
      BandsSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/bands.json"
    );
    ajv.addSchema(
      CommonSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/common.json"
    );
    ajv.addSchema(
      DateSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/datetime.json"
    );
    ajv.addSchema(
      InstrumentSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/instrument.json"
    );
    ajv.addSchema(
      LicenseSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/licensing.json"
    );
    ajv.addSchema(
      ProviderSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/provider.json"
    );
    ajv.addSchema(
      DataValuesSpec,
      "https://schemas.stacspec.org/v1.1.0/item-spec/json-schema/data-values.json"
    );

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

      const allLink = body.links.find((l: Link) => l.title === "ALL");

      expect(allLink.href).to.match(/^(http)s?:\/\/.*\w+/);
      expect(allLink.href.endsWith("/stac/ALL")).to.be.true;
      expect(allLink.href).to.not.contain("?param=value");
      expect(allLink.rel).to.equal("child");
      expect(allLink.type).to.equal("application/json");
      expect(allLink.title).to.equal("ALL");
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

  beforeEach(() => {
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

    // sinon-chai's calledThrice may not be available in this environment; assert call count directly
    expect((mockCmrHits as unknown as sinon.SinonStub).callCount).to.equal(3);
  });
  it("should have an entry for the 'ALL' catalog", async () => {
    const { statusCode, body } = await request(app).get("/cloudstac");

    expect(statusCode).to.equal(200);
    const allLink = body.links.find((l: Link) => l.title === "ALL");

    expect(allLink.href).to.match(/^(http)s?:\/\/.*\w+/);
    expect(allLink.href.endsWith("/cloudstac/ALL")).to.be.true;
    expect(allLink.href).to.not.contain("?param=value");
    expect(allLink.rel).to.equal("child");
    expect(allLink.type).to.equal("application/json");
    expect(allLink.title).to.equal("ALL");
  });
});
