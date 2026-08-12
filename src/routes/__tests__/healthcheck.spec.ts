import { expect } from "chai";
import * as sinon from "sinon";
import { Request, Response } from "express";
import axios from "axios";
import { healthcheckHandler } from "../healthcheck";

describe("healthcheckHandler", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonStub: sinon.SinonStub;
  let statusStub: sinon.SinonStub;
  let axiosStub: sinon.SinonStub;

  beforeEach(() => {
    req = {};
    jsonStub = sinon.stub();
    statusStub = sinon.stub().returns({ json: jsonStub });
    res = {
      json: jsonStub,
      status: statusStub,
    };
    axiosStub = sinon.stub(axios, "get");
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return healthy when both ingest and search return 200", async () => {
    axiosStub.resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(jsonStub.calledOnce).to.be.true;
    expect(jsonStub.getCall(0).args[0]).to.deep.equal({ message: "healthy" });
  });

  it("should return unhealthy when ingest returns non-200 status", async () => {
    axiosStub.onFirstCall().resolves({ status: 503 });
    axiosStub.onSecondCall().resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
    expect(jsonStub.getCall(0).args[0]).to.deep.equal({ message: "unhealthy" });
  });

  it("should return unhealthy when search returns non-200 status", async () => {
    axiosStub.onFirstCall().resolves({ status: 200 });
    axiosStub.onSecondCall().resolves({ status: 503 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
    expect(jsonStub.getCall(0).args[0]).to.deep.equal({ message: "unhealthy" });
  });

  it("should return unhealthy when both ingest and search return non-200 status", async () => {
    axiosStub.resolves({ status: 503 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
    expect(jsonStub.getCall(0).args[0]).to.deep.equal({ message: "unhealthy" });
  });

  it("should return unhealthy when ingest returns 500 error", async () => {
    axiosStub.onFirstCall().resolves({ status: 500 });
    axiosStub.onSecondCall().resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
  });

  it("should return unhealthy when search returns 500 error", async () => {
    axiosStub.onFirstCall().resolves({ status: 200 });
    axiosStub.onSecondCall().resolves({ status: 500 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
  });

  it("should call axios.get with correct ingest health URL", async () => {
    axiosStub.resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(axiosStub.getCall(0).args[0]).to.include("/ingest/health");
  });

  it("should call axios.get with correct search health URL", async () => {
    axiosStub.resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(axiosStub.getCall(1).args[0]).to.include("/search/health");
  });

  it("should handle axios errors gracefully", async () => {
    axiosStub.rejects(new Error("Network error"));

    try {
      await healthcheckHandler(req as Request, res as Response);
    } catch (error) {
      expect(error).to.be.instanceof(Error);
    }
  });

  it("should handle 400 status code as unhealthy", async () => {
    axiosStub.onFirstCall().resolves({ status: 400 });
    axiosStub.onSecondCall().resolves({ status: 200 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
  });

  it("should handle 404 status code as unhealthy", async () => {
    axiosStub.onFirstCall().resolves({ status: 200 });
    axiosStub.onSecondCall().resolves({ status: 404 });

    await healthcheckHandler(req as Request, res as Response);

    expect(statusStub.calledWith(503)).to.be.true;
  });
});
