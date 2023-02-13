import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import axios from "axios";
import { getProviders, getCloudProviders } from "../providers";

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("getProvider", () => {
  it("should return a list of providers", async () => {
    sandbox.stub(axios, "get").resolves({
      data: [
        {
          "provider-id": "PROV1",
          "short-name": "PROV1",
          "cmr-only": false,
          small: false,
          consortiums: ["EOSDIS FEDEO"],
        },
      ],
    });

    const providers = await getProviders();
    expect(providers).to.exist;
  });
});

describe("getCloudProviders", () => {
  it("should providers with cloud holdings", async () => {
    sandbox
      .stub(axios, "get")
      .onFirstCall()
      .resolves({
        data: [
          {
            "provider-id": "PROV1",
            "short-name": "PROV1",
          },
          {
            "provider-id": "PROV2",
            "short-name": "PROV2",
          },
        ],
      })
      .onSecondCall()
      .resolves({ status: 200, headers: { "cmr-hits": "0" } })
      .onThirdCall()
      .resolves({ status: 200, headers: { "cmr-hits": "1" } });

    const [, providers] = await getCloudProviders();
    expect(providers).to.deep.equal([
      {
        "provider-id": "PROV2",
        "short-name": "PROV2",
      },
    ]);
  });
});
