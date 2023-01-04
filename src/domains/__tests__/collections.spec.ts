import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import * as gql from "graphql-request";
import { getCollections, collectionToStac } from "../collections";

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("getCollections", () => {
  it("should make a request to GraphQL", async () => {
    const gqlStub = sandbox
      .stub(gql, "request")
      .resolves({ collections: { items: [], cursor: null, count: 0 } });

    await getCollections({ provider: "MY_PROVIDER" }, { headers: {} });

    expect(gqlStub).to.have.been.calledOnce;
  });
});

describe("collectionsToStac", () => {
  describe("given a collection with S3 Links", () => {
    describe("given the S3 links are badly formatted with commas", () => {
      it("should return a STAC collection with the s3 links as assets", () => {
        const coll: any = collectionToStac({
          directDistributionInformation: {
            region: "us-west-2",
            s3BucketAndObjectPrefixNames: [
              "s3://op-test-protected/SOME_DATA.002, s3://op-test-public/SOME_DATA.V003",
            ],
            s3CredentialsApiEndpoint:
              "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
            s3CredentialsApiDocumentationUrl:
              "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
          },
        });

        expect(coll).to.have.deep.property("assets", {
          s3_op_test_protected_SOME_DATA_002: {
            href: "s3://op-test-protected/SOME_DATA.002",
            roles: ["data"],
          },
          s3_op_test_public_SOME_DATA_V003: {
            href: "s3://op-test-public/SOME_DATA.V003",
            roles: ["data"],
          },
        });
      });
    });

    describe("given the S3 links are correctly formatted", () => {
      it("should return a STAC collection with the s3 links as assets", () => {
        const coll: any = collectionToStac({
          directDistributionInformation: {
            region: "us-west-2",
            s3BucketAndObjectPrefixNames: [
              "s3://op-test-protected/SOME_DATA.002",
              "s3://op-test-public/SOME_DATA.V003",
            ],
            s3CredentialsApiEndpoint:
              "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
            s3CredentialsApiDocumentationUrl:
              "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
          },
        });

        expect(coll).to.have.deep.property("assets", {
          s3_op_test_protected_SOME_DATA_002: {
            href: "s3://op-test-protected/SOME_DATA.002",
            roles: ["data"],
          },
          s3_op_test_public_SOME_DATA_V003: {
            href: "s3://op-test-public/SOME_DATA.V003",
            roles: ["data"],
          },
        });
      });
    });
  });

  describe("given a collection without direct distribution information", () => {
    it("should return a STAC collection with empty assets", () => {
      expect(collectionToStac({})).to.have.deep.property("assets", {});
    });
  });
});
