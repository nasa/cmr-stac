
import { expect } from "chai";
import * as sinon from "sinon";
import { Request, Response } from "express";
import { rootConformance, rootConformanceHandler } from "../conformance";

describe("conformance module", () => {
  describe("rootConformance constant", () => {
    it("should export an array of conformance URIs", () => {
      expect(rootConformance).to.be.an("array");
    });

    it("should contain STAC API core conformance URI", () => {
      expect(rootConformance).to.include("https://api.stacspec.org/v1.0.0-rc.2/core");
    });

    it("should have at least one conformance URI", () => {
      expect(rootConformance.length).to.be.greaterThan(0);
    });
  });

  describe("rootConformanceHandler", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonStub: sinon.SinonStub;

    beforeEach(() => {
      req = {};
      jsonStub = sinon.stub();
      res = {
        json: jsonStub,
      };
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should return conformsTo property with array", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      expect(jsonStub.calledOnce).to.be.true;
      const response = jsonStub.getCall(0).args[0];
      expect(response).to.have.property("conformsTo");
      expect(response.conformsTo).to.be.an("array");
    });

    it("should return rootConformance in response", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      const response = jsonStub.getCall(0).args[0];
      expect(response.conformsTo).to.deep.equal(rootConformance);
    });

    it("should return STAC API core conformance URI", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      const response = jsonStub.getCall(0).args[0];
      expect(response.conformsTo).to.include("https://api.stacspec.org/v1.0.0-rc.2/core");
    });

    it("should call res.json exactly once", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      expect(jsonStub.calledOnce).to.be.true;
    });

    it("should not modify the request parameter", async () => {
      const originalReq = { ...req };

      await rootConformanceHandler(req as Request, res as Response);

      expect(req).to.deep.equal(originalReq);
    });

    it("should return correct JSON structure", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      const response = jsonStub.getCall(0).args[0];
      expect(response).to.have.all.keys("conformsTo");
    });

    it("should handle multiple conformance URIs", async () => {
      await rootConformanceHandler(req as Request, res as Response);

      const response = jsonStub.getCall(0).args[0];
      expect(response.conformsTo.length).to.be.greaterThanOrEqual(1);
    });

    it("should be an async function", async () => {
      const result = rootConformanceHandler(req as Request, res as Response);
      expect(result).to.be.a("Promise");
      await result;
    });

    it("should return promise that resolves with undefined", async () => {
      const result = await rootConformanceHandler(req as Request, res as Response);
      expect(result).to.be.undefined;
    });

    it("should handle empty request object", async () => {
      const emptyReq = {} as Request;

      await rootConformanceHandler(emptyReq, res as Response);

      expect(jsonStub.calledOnce).to.be.true;
    });
  });
});
