import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import * as gql from "graphql-request";
import { getCollections, collectionToStac } from "../collections";
import { generateCollections } from "../../utils/testUtils";
import { UrlContentType, RelatedUrlType, RelatedUrlSubType } from "../../models/GraphQLModels";

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
  describe("given a collection with a related url describing a STAC items endpoint", () => {
    it("should return a STAC collection with a link of relation 'items' pointing to that endpoint", () => {
      const [base] = generateCollections(1);
      // Add in a related url as above
      const relatedUrl = {
        description: "foo",
        urlContentType: UrlContentType.DISTRIBUTION_URL,
        type: RelatedUrlType.GET_CAPABILITIES,
        subtype: RelatedUrlSubType.STAC,
        url: "https://data.inpe.br/bdc/stac/v1/collections/AMZ1-WFI-L4-SR-1/items",
        getData: {
          format: "Not provided",
          mimeType: "application/json",
          size: 0.0,
          unit: "KB",
        },
      };
      base.relatedUrls?.push(relatedUrl);

      const stacCollection: any = collectionToStac(base);

      expect(stacCollection).to.have.deep.property("links", [
        {
          rel: "license",
          href: "https://science.nasa.gov/earth-science/earth-science-data/data-information-policy",
          title: "EOSDIS Data Use Policy",
          type: "text/html",
        },
        {
          rel: "about",
          href: "undefined/search/concepts/C00000000-TEST_PROV.html",
          title: "HTML metadata for collection",
          type: "text/html",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.native",
          title: "Native metadata for collection",
          type: "application/xml",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.echo10",
          title: "ECHO10 metadata for collection",
          type: "application/echo10+xml",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.json",
          title: "CMR JSON metadata for collection",
          type: "application/json",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.umm_json",
          title: "CMR UMM_JSON metadata for collection",
          type: "application/vnd.nasa.cmr.umm+json",
        },
        {
          rel: "items",
          href: "https://data.inpe.br/bdc/stac/v1/collections/AMZ1-WFI-L4-SR-1/items",
          title: "Collection Items",
          type: "application/geo+json",
        },
      ]);
    });
  });
  describe("given a collection without a related url describing a STAC items endpoint", () => {
    it("should return a STAC collection without a link of relation 'items' pointing to that endpoint", () => {
      const [base] = generateCollections(1);

      const stacCollection: any = collectionToStac(base);

      expect(stacCollection).to.have.deep.property("links", [
        {
          rel: "license",
          href: "https://science.nasa.gov/earth-science/earth-science-data/data-information-policy",
          title: "EOSDIS Data Use Policy",
          type: "text/html",
        },
        {
          rel: "about",
          href: "undefined/search/concepts/C00000000-TEST_PROV.html",
          title: "HTML metadata for collection",
          type: "text/html",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.native",
          title: "Native metadata for collection",
          type: "application/xml",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.echo10",
          title: "ECHO10 metadata for collection",
          type: "application/echo10+xml",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.json",
          title: "CMR JSON metadata for collection",
          type: "application/json",
        },
        {
          rel: "via",
          href: "undefined/search/concepts/C00000000-TEST_PROV.umm_json",
          title: "CMR UMM_JSON metadata for collection",
          type: "application/vnd.nasa.cmr.umm+json",
        },
      ]);
    });
  });
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
          metadata: {
            href: "undefined/search/concepts/C00000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for C00000000-TEST_PROV",
            type: "application/xml",
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
          metadata: {
            href: "undefined/search/concepts/C00000000-TEST_PROV.xml",
            roles: ["metadata"],
            title: "CMR XML metadata for C00000000-TEST_PROV",
            type: "application/xml",
          },
        });
      });
    });
  });

  describe("given a collection without direct distribution information", () => {
    it("should return a STAC collection with only the xml metadata asset", () => {
      const [base] = generateCollections(1);
      const malformed: any = { ...base, directDistributionInformation: {} };

      expect(collectionToStac(malformed as any)).to.have.deep.property("assets", {
        metadata: {
          href: "undefined/search/concepts/C00000000-TEST_PROV.xml",
          roles: ["metadata"],
          title: "CMR XML metadata for C00000000-TEST_PROV",
          type: "application/xml",
        },
      });
    });
  });

  describe("given a collection with null direct distribution information", () => {
    it("should return a STAC collection with only the xml metadata asset", () => {
      const [base] = generateCollections(1);
      base.directDistributionInformation = null;
      expect(collectionToStac(base)).to.have.deep.property("assets", {
        metadata: {
          href: "undefined/search/concepts/C00000000-TEST_PROV.xml",
          roles: ["metadata"],
          title: "CMR XML metadata for C00000000-TEST_PROV",
          type: "application/xml",
        },
      });
    });
  });

  describe("when given a valid collection", () => {
    it("should return a STAC collection with all fields correctly populated", () => {
      const [mockCollection] = generateCollections(1);

      const stacCollection = collectionToStac(mockCollection);

      // Check if all expected fields are present and correctly populated
      expect(stacCollection).to.have.property("type", "Collection");
      expect(stacCollection).to.have.property("id", `${mockCollection.entryId}`);
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
        mockCollection.platforms?.[0]?.instruments?.[0]?.shortName,
      ]);
    });
  });
  describe("when processing platform and instruments", () => {
    it("should correctly handle a collection with multiple Platforms and Instruments", () => {
      const [mockCollection] = generateCollections(1);
      mockCollection.platforms = [
        {
          type: "Earth Observation Satellites",
          shortName: "Terra",
          longName: "Earth Observing System, Terra (AM-1)",
          instruments: [
            {
              shortName: "ASTER",
              longName: "Advanced Spaceborne Thermal Emission and Reflection Radiometer",
            },
            {
              shortName: "MODIS",
              longName: "Moderate-Resolution Imaging Spectroradiometer",
            },
          ],
        },
      ];
      const stacCollection = collectionToStac(mockCollection);
      expect(stacCollection.summaries).to.have.property("platform");
      expect(stacCollection.summaries?.platform).to.deep.equal(["Terra"]);
      expect(stacCollection.summaries).to.have.property("instruments");
      expect(stacCollection.summaries?.instruments).to.deep.equal(["ASTER", "MODIS"]);
    });

    it("should handle a collection with platforms but no instruments", () => {
      const [mockCollection] = generateCollections(1);
      mockCollection.platforms = [
        {
          type: "Earth Observation Satellites",
          shortName: "Terra",
          longName: "Earth Observing System, Terra (AM-1)",
        },
      ];
      const stacCollection = collectionToStac(mockCollection);

      expect(stacCollection.summaries).to.have.property("platform");
      expect(stacCollection.summaries?.platform).to.deep.equal(["Terra"]);
      expect(stacCollection.summaries).to.have.property("instruments");
      expect(stacCollection.summaries?.instruments).to.deep.equal(["Not Provided"]);
    });

    it("should handle a collection with some platforms having instruments and others not", () => {
      const [mockCollection] = generateCollections(1);
      mockCollection.platforms = [
        {
          type: "Earth Observation Satellites",
          shortName: "Terra",
          longName: "Earth Observing System, Terra (AM-1)",
          instruments: [
            {
              shortName: "ASTER",
              longName: "Advanced Spaceborne Thermal Emission and Reflection Radiometer",
            },
          ],
        },
        {
          type: "Earth Observation Satellites",
          shortName: "SPOT-4",
          longName: "Systeme Probatoire Pour l'Observation de la Terre-4",
        },
        {
          type: "Earth Observation Satellites",
          shortName: "SPOT-5",
          longName: "Systeme Probatoire Pour l'Observation de la Terre-5",
          instruments: [
            {
              shortName: "VEGETATION-2",
              longName: "VEGETATION INSTRUMENT 2 (SPOT 5)",
            },
            {
              shortName: "VEGETATION-3",
              longName: "VEGETATION INSTRUMENT 3 (SPOT 3)",
            },
          ],
        },
      ];

      const stacCollection = collectionToStac(mockCollection);

      expect(stacCollection.summaries).to.have.property("platform");
      expect(stacCollection.summaries?.platform).to.deep.equal(["Terra", "SPOT-4", "SPOT-5"]);
      expect(stacCollection.summaries).to.have.property("instruments");
      expect(stacCollection.summaries?.instruments).to.deep.equal([
        "ASTER",
        "VEGETATION-2",
        "VEGETATION-3",
      ]);
    });

    it("should handle a collection with empty instruments arrays", () => {
      const [mockCollection] = generateCollections(1);
      mockCollection.platforms = [
        {
          type: "Earth Observation Satellites",
          shortName: "Terra",
          longName: "Earth Observing System, Terra (AM-1)",
          instruments: [
            {
              shortName: "ASTER",
              longName: "Advanced Spaceborne Thermal Emission and Reflection Radiometer",
            },
          ],
        },
        {
          type: "Earth Observation Satellites",
          shortName: "SPOT-4",
          longName: "Systeme Probatoire Pour l'Observation de la Terre-4",
          instruments: [],
        },
      ];

      const stacCollection = collectionToStac(mockCollection);

      expect(stacCollection.summaries).to.have.property("platform");
      expect(stacCollection.summaries?.platform).to.deep.equal(["Terra", "SPOT-4"]);
      expect(stacCollection.summaries).to.have.property("instruments");
      expect(stacCollection.summaries?.instruments).to.deep.equal(["ASTER"]);
    });
  });
});
