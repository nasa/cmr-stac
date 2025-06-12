import * as sinon from "sinon";
import { expect } from "chai";
import request from "supertest";

import { createApp } from "../app";
import * as Provider from "../domains/providers";
import { conformance } from "../domains/providers";

const stacApp = createApp();
const sandbox = sinon.createSandbox();

describe("GET /:provider/conformance", () => {
  beforeEach(() => {
    sandbox
      .stub(Provider, "getProviders")
      .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe("given a valid provider", () => {
    it("should return the correct conformance classes", async () => {
      const { body, statusCode } = await request(stacApp).get("/stac/TEST/conformance");
      expect(statusCode).to.equal(200);
      expect(body.conformsTo).to.deep.equal(conformance);
    });
  });
  describe("given an invalid provider", () => {
    it("should return a 404 status", async () => {
      const res = await request(stacApp).get("/stac/PROVIDER_NOT_FOUND/conformance");
      expect(res.statusCode).to.equal(404);
    });
  });
  describe("given the ALL provider/catalog", () => {
    it("should have collection search conformance classes", async () => {
      const { body, statusCode } = await request(stacApp).get("/stac/ALL/conformance");
      expect(statusCode).to.equal(200);
      const conformanceClasses = body.conformsTo;
      const collectionSearchClasses = conformanceClasses.filter((c: String) =>
        c.includes("collection-search")
      );
      expect(collectionSearchClasses).not.to.be.empty;
    });
    it("should not contain item search conformance classes", async () => {
      const { body, statusCode } = await request(stacApp).get("/stac/ALL/conformance");
      expect(statusCode).to.equal(200);
      const conformanceClasses = body.conformsTo;
      const itemSearchClasses = conformanceClasses.filter((c: String) => c.includes("item-search"));
      expect(itemSearchClasses).to.be.empty;
    });
  });
});
