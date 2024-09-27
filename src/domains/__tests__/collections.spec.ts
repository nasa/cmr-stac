import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import * as gql from "graphql-request";
import { getCollections, collectionToStac } from "../collections";
import { generateCollections } from "../../utils/testUtils";

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("getCollections", () => {
  it("should make a request to GraphQL", async () => {
    const gqlStub = sandbox
      .stub(gql, "request")
      .resolves({ collections: { items: [], cursor: null, count: 0 } });

    await getCollections({ providers: ["MY_PROVIDER"] }, { headers: {} });

    expect(gqlStub).to.have.been.calledOnce;
  });
});

describe("collectionsToStac", () => {
  describe("given a collection with S3 Links", () => {
    describe("given the S3 links are badly formatted with commas", () => {
      it("should return a STAC collection with the s3 links as assets", () => {
        const [base] = generateCollections(1);
        base.directDistributionInformation = {
          region: "us-west-2",
          s3BucketAndObjectPrefixNames: [
            "s3://op-test-protected/SOME_DATA.002, s3://op-test-public/SOME_DATA.V003",
          ],
          s3CredentialsApiEndpoint: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
          s3CredentialsApiDocumentationUrl:
            "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
        };

        const stacCollection: any = collectionToStac(base);

        expect(stacCollection).to.have.deep.property("assets", {
          s3_op_test_protected_SOME_DATA_002: {
            href: "s3://op-test-protected/SOME_DATA.002",
            title: "op_test_protected_SOME_DATA_002",
            roles: ["data"],
          },
          s3_op_test_public_SOME_DATA_V003: {
            href: "s3://op-test-public/SOME_DATA.V003",
            title: "op_test_public_SOME_DATA_V003",
            roles: ["data"],
          },
          s3_credentials: {
            href: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
            roles: ["metadata"],
            title: "S3 credentials API endpoint",
          },
          s3_credentials_documentation: {
            href: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
            roles: ["metadata"],
            title: "S3 credentials API endpoint documentation",
          },
        });
      });
    });

    describe("given the S3 links are correctly formatted", () => {
      it("should return a STAC collection with the s3 links as assets", () => {
        const [base] = generateCollections(1);
        base.directDistributionInformation = {
          region: "us-west-2",
          s3BucketAndObjectPrefixNames: [
            "s3://op-test-protected/SOME_DATA.002",
            "s3://op-test-public/SOME_DATA.V003",
          ],
          s3CredentialsApiEndpoint: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
          s3CredentialsApiDocumentationUrl:
            "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
        };

        const stacCollection: any = collectionToStac(base);

        expect(stacCollection).to.have.deep.property("assets", {
          s3_op_test_protected_SOME_DATA_002: {
            href: "s3://op-test-protected/SOME_DATA.002",
            title: "op_test_protected_SOME_DATA_002",
            roles: ["data"],
          },
          s3_op_test_public_SOME_DATA_V003: {
            href: "s3://op-test-public/SOME_DATA.V003",
            title: "op_test_public_SOME_DATA_V003",
            roles: ["data"],
          },
          s3_credentials: {
            href: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentials",
            roles: ["metadata"],
            title: "S3 credentials API endpoint",
          },
          s3_credentials_documentation: {
            href: "https://data.lpdaac.earthdatacloud.nasa.gov/s3credentialsREADME",
            roles: ["metadata"],
            title: "S3 credentials API endpoint documentation",
          },
        });
      });
    });
  });

  describe("given a collection without direct distribution information", () => {
    it("should return a STAC collection with empty assets", () => {
      const [base] = generateCollections(1);
      const malformed: any = { ...base, directDistributionInformation: {} };

      expect(collectionToStac(malformed as any)).to.have.deep.property("assets", {});
    });
  });

  describe("given a collection with null direct distribution information", () => {
    it("should return a STAC collection with empty assets", () => {
      const [base] = generateCollections(1);
      base.directDistributionInformation = null;
      expect(collectionToStac(base)).to.have.deep.property("assets", {});
    });
  });

  describe("when given a valid collection", () => {
    it("should return a STAC collection with all fields correctly populated", () => {
      const [mockCollection] = generateCollections(1);

      const stacCollection = collectionToStac(mockCollection);

      // Check if all expected fields are present and correctly populated
      expect(stacCollection).to.have.property("type", "Collection");
      expect(stacCollection).to.have.property(
        "id",
        `${mockCollection.shortName}_${mockCollection.version}`
      );
      expect(stacCollection).to.have.property("title", mockCollection.title);
      expect(stacCollection).to.have.property("description", mockCollection.description);
      expect(stacCollection).to.have.property("stac_version", "1.0.0");
      expect(stacCollection).to.have.property("license", "proprietary");

      expect(stacCollection).to.have.property("extent");

      expect(stacCollection.extent).to.have.property("spatial");
      expect(stacCollection.extent.spatial).to.deep.equal({ bbox: [[-180, -90, 180, 90]] });

      expect(stacCollection.extent).to.have.property("temporal");
      expect(stacCollection.extent.temporal).to.deep.equal({
        interval: [[mockCollection.timeStart, mockCollection.timeEnd]],
      });

      expect(stacCollection).to.have.property("assets");
      expect(stacCollection).to.have.property("links");

      expect(stacCollection).to.have.property("keywords");
      expect(stacCollection.keywords).to.deep.equal([
        "EARTH SCIENCE",
        "LAND SURFACE",
        "TOPOGRAPHY",
        "TERRAIN ELEVATION",
      ]);

      expect(stacCollection).to.have.property("summaries");
      expect(stacCollection.summaries).to.have.property("platform");
      expect(stacCollection.summaries?.platform).to.deep.equal([
        mockCollection.platforms[0].shortName,
      ]);
      expect(stacCollection.summaries).to.have.property("instruments");
      expect(stacCollection.summaries?.instruments).to.deep.equal([
        mockCollection.platforms[0].instruments[0].shortName,
      ]);
    });
  });
});
