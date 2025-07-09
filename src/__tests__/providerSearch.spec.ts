import request from "supertest";
import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import { createApp } from "../app";
const app = createApp();
import { Link } from "../@types/StacCatalog";
import { STACCollection } from "../@types/StacCollection";
import { STACItem } from "../@types/StacItem";

import {
  polygon,
  linestring,
  point,
  multiPolygon,
  multiLinestring,
  multiPoint,
} from "./geojsonGeometry";

import * as Providers from "../domains/providers";
import * as Collections from "../domains/collections";
import * as Items from "../domains/items";

import { generateSTACItems } from "../utils/testUtils";

const sandbox = sinon.createSandbox();

const emptyCollections = { count: 0, cursor: null, items: [] };
const emptyItems = { count: 0, cursor: null, items: [] };

afterEach(() => {
  sandbox.restore();
});

describe("GET /:provider/search", () => {
  describe("given a valid provider", () => {
    it("should return 200", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode } = await request(app).get("/stac/TEST/search");

      expect(statusCode).to.equal(200);
    });

    it("should have self link with the current search", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/TEST/search")
        .query({ bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "self");
      const resourceRoute = `/stac/TEST/search?bbox=${encodeURIComponent("-180,-90,180,90")}`;

      expect(selfLink).to.have.property("href");
      expect(selfLink.href).to.have.string(resourceRoute);
    });

    it("should have root link to the root catalog", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/TEST/search")
        .query({ providerId: "TEST", bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "root");
      expect(selfLink.href).to.have.string("/");
    });

    it("should have provider link to the provider catalog", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { body: data } = await request(app)
        .get("/stac/TEST/search")
        .query({ providerId: "TEST", bbox: "-180,-90,180,90" });

      const selfLink = data.links.find((l: Link) => l.rel === "parent");
      expect(selfLink.href).to.match(/\/stac\/TEST$/);
    });

    describe("given there are items found", () => {
      it("should have the corresponding features returned", async () => {
        const mockAItems = generateSTACItems("mock_collection_a", 5);
        const mockBItems = generateSTACItems("mock_collection_b", 5);
        const mockItems = [...mockAItems, ...mockBItems];

        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
        sandbox.stub(Collections, "getCollections").resolves({
          count: 2,
          cursor: "cursor",
          items: [
            { id: "mock_collection_a" } as STACCollection,
            { id: "mock_collection_b" } as STACCollection,
          ],
        });
        sandbox.stub(Items, "getItems").resolves({
          count: mockItems.length,
          cursor: "nextPage",
          items: mockItems,
        });

        const { body: data } = await request(app)
          .get("/stac/PROVIDER/search")
          .query({ providerId: "PROVIDER", bbox: "-180,-90,180,90" });

        mockItems.forEach((expectedItem: STACItem) => {
          const feature = data.features.find((item: STACItem) => item.id === expectedItem.id);
          expect(feature).to.have.property("id", expectedItem.id);
        });
      });
    });

    describe("given there are more results found than the page size", () => {
      it("should have a next link", async () => {
        const mockAItems = generateSTACItems("mock_collection_a", 5);
        const mockBItems = generateSTACItems("mock_collection_b", 5);
        const mockItems = [...mockAItems, ...mockBItems];

        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
        sandbox.stub(Collections, "getCollections").resolves({
          count: 2,
          cursor: "cursor",
          items: [
            { id: "mock_collection_a" } as STACCollection,
            { id: "mock_collection_b" } as STACCollection,
          ],
        });
        sandbox.stub(Items, "getItems").resolves({
          count: mockItems.length + 10,
          cursor: "next",
          items: mockItems,
        });

        const { body: data } = await request(app).get("/stac/PROVIDER/search");

        const nextLink = data.links.find((link: Link) => link.rel === "next");
        expect(nextLink.rel).to.equal("next");
        expect(nextLink.href, nextLink.href).to.have.match(
          /http:\/\/.*\/PROVIDER\/search\?cursor=.*/
        );
      });
    });

    describe("given a polygon with more than 20 coordinates", () => {
      it("getItems should be called with the proper polygon coordinates", async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
        sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
        const getItemsSpy = sandbox
          .stub(Items, "getItems")
          .resolves({ count: 0, cursor: null, items: [] });

        const { statusCode, body } = await request(app).get(
          "/stac/TEST/search?collections[0]=HLSS30_2.0&intersects[type]=Polygon&intersects[coordinates][0][0][0]=-48.31876570764564&intersects[coordinates][0][0][1]=-24.13235588091331&intersects[coordinates][0][1][0]=-48.319182157887525&intersects[coordinates][0][1][1]=-24.135649639167937&intersects[coordinates][0][2][0]=-48.2842003375668&intersects[coordinates][0][2][1]=-24.159843492656776&intersects[coordinates][0][3][0]=-48.26087912402002&intersects[coordinates][0][3][1]=-24.122474097202897&intersects[coordinates][0][4][0]=-48.259074506305325&intersects[coordinates][0][4][1]=-24.110310854137083&intersects[coordinates][0][5][0]=-48.268652861869185&intersects[coordinates][0][5][1]=-24.095231896596758&intersects[coordinates][0][6][0]=-48.273511448024976&intersects[coordinates][0][6][1]=-24.09662582428146&intersects[coordinates][0][7][0]=-48.2842003375668&intersects[coordinates][0][7][1]=-24.086361092375142&intersects[coordinates][0][8][0]=-48.28600495528215&intersects[coordinates][0][8][1]=-24.081038315106454&intersects[coordinates][0][9][0]=-48.28142400262118&intersects[coordinates][0][9][1]=-24.076095538322363&intersects[coordinates][0][10][0]=-48.28364507057779&intersects[coordinates][0][10][1]=-24.070645589226345&intersects[coordinates][0][11][0]=-48.29280697589971&intersects[coordinates][0][11][1]=-24.079390744017203&intersects[coordinates][0][12][0]=-48.29655502807688&intersects[coordinates][0][12][1]=-24.07977095461004&intersects[coordinates][0][13][0]=-48.295583310845984&intersects[coordinates][0][13][1]=-24.08433339376434&intersects[coordinates][0][14][0]=-48.30169124772749&intersects[coordinates][0][14][1]=-24.08293933236135&intersects[coordinates][0][15][0]=-48.3040511324312&intersects[coordinates][0][15][1]=-24.0845868578446&intersects[coordinates][0][16][0]=-48.298914912781214&intersects[coordinates][0][16][1]=-24.08876894281238&intersects[coordinates][0][17][0]=-48.30058071374884&intersects[coordinates][0][17][1]=-24.089909487754852&intersects[coordinates][0][18][0]=-48.30641101713553&intersects[coordinates][0][18][1]=-24.086614552446946&intersects[coordinates][0][19][0]=-48.31140842003842&intersects[coordinates][0][19][1]=-24.096879264048766&intersects[coordinates][0][20][0]=-48.310020252565636&intersects[coordinates][0][20][1]=-24.10068080039386&intersects[coordinates][0][21][0]=-48.31876570764564&intersects[coordinates][0][21][1]=-24.13235588091331"
        );
        expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
        expect(getItemsSpy).to.have.been.calledOnce;
        expect(getItemsSpy).to.have.been.calledWithMatch({
          provider: "TEST",
          entryId: ["HLSS30_2.0"],
          polygon: [
            "-48.31876570764564,-24.13235588091331,-48.319182157887525,-24.135649639167937,-48.2842003375668,-24.159843492656776,-48.26087912402002,-24.122474097202897,-48.259074506305325,-24.110310854137083,-48.268652861869185,-24.095231896596758,-48.273511448024976,-24.09662582428146,-48.2842003375668,-24.086361092375142,-48.28600495528215,-24.081038315106454,-48.28142400262118,-24.076095538322363,-48.28364507057779,-24.070645589226345,-48.29280697589971,-24.079390744017203,-48.29655502807688,-24.07977095461004,-48.295583310845984,-24.08433339376434,-48.30169124772749,-24.08293933236135,-48.3040511324312,-24.0845868578446,-48.298914912781214,-24.08876894281238,-48.30058071374884,-24.089909487754852,-48.30641101713553,-24.086614552446946,-48.31140842003842,-24.096879264048766,-48.310020252565636,-24.10068080039386,-48.31876570764564,-24.13235588091331",
          ],
        });
      });
    });

    const limits = [
      ["valid", 100, 200],
      ["needing to page", 4000, 200],
      ["negative", -9, 400],
    ];
    limits.forEach(([label, limit, expected]) => {
      describe(`given limit is ${label} [${limit}]`, () => {
        it(`it should return status ${expected}`, async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
          sandbox.stub(Collections, "getCollections").resolves(emptyCollections);
          sandbox.stub(Items, "getItems").resolves(emptyItems);

          const { statusCode } = await request(app).get("/stac/PROVIDER/search").query({ limit });

          expect(statusCode).to.equal(expected);
        });
      });
    });
  });

  describe("given an invalid provider", () => {
    it("should return 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      const { statusCode } = await request(app).get("/stac/BAD_PROV/search");
      expect(statusCode).to.equal(404);
    });
  });
});

describe("Query validation", () => {
  describe("given a valid BBOX", () => {
    it("should return 200", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode } = await request(app)
        .get("/stac/TEST/search")
        .query({ bbox: "-180,-90,180,90" });
      expect(statusCode).to.equal(200);
    });

    describe("various cases of BBOX", () => {
      ["bbox", "BBOX", "BbOx"].forEach((variation: string) => {
        it(`should handle case ${variation}`, async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
          sandbox.stub(Items, "getItems").resolves(emptyItems);

          const { statusCode } = await request(app).get(
            `/stac/PROVIDER/search?${variation}=-180,-90,180,90`
          );
          expect(statusCode).to.equal(200);
        });
      });
    });
  });

  describe("given an invalid BBOX", () => {
    it("should return 400", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
      sandbox.stub(Items, "getItems").resolves(emptyItems);

      const { statusCode, body } = await request(app).get(
        "/stac/PROVIDER/search?bbox=-99999,-90,180,90"
      );
      expect(statusCode).to.equal(400);
      expect(body).to.deep.equal({
        errors: [
          "BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.",
        ],
      });
    });
  });

  describe("given an INTERSECTS query", () => {
    [
      ["polygon", polygon],
      ["multi-polygon", multiPolygon],
      ["linestring", linestring],
      ["multi-linestring", multiLinestring],
      ["point", point],
      ["multi-point", multiPoint],
    ].forEach(([label, geometry]) => {
      describe(`given a ${label}`, () => {
        it("should return 200", async () => {
          sandbox
            .stub(Providers, "getProviders")
            .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);

          const getItemsSpy = sandbox.stub(Items, "getItems").resolves(emptyItems);

          const { statusCode, body } = await request(app)
            .get(`/stac/PROVIDER/search`)
            .query({ intersects: geometry });
          expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
          expect(getItemsSpy).to.have.been.calledOnce;
        });
      });
    });
  });

  describe("given various cases of INTERSECTS", () => {
    ["intersects", "INTERSECTS", "iNtErSeCtS"].forEach((label) => {
      it(`should return handle ${label}`, async () => {
        sandbox
          .stub(Providers, "getProviders")
          .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);
        sandbox.stub(Items, "getItems").resolves(emptyItems);

        const { statusCode, body } = await request(app)
          .get(`/stac/PROVIDER/search`)
          .query({ intersects: point });
        expect(statusCode, JSON.stringify(body, null, 2)).to.equal(200);
      });
    });
  });

  describe("given both an INTERSECTS and BBOX parameter", () => {
    it("should return 400", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "PROVIDER", "short-name": "PROVIDER" }]]);

      const { statusCode } = await request(app).get(
        `/stac/PROVIDER/search?bbox=0,0,0,0&intersects=${JSON.stringify(point)}`
      );
      expect(statusCode).to.equal(400);
    });
  });
});

describe("GET stac/ALL/search", () => {
  describe("given an 'ALL' provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const { statusCode, body } = await request(app).get("/stac/ALL/search");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["This operation is not allowed for the ALL Catalog."],
      });
    });
  });
});

describe("POST stac/ALL/search", () => {
  describe("given an 'ALL' provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);

      const { statusCode, body } = await request(app).post("/stac/ALL/search");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["This operation is not allowed for the ALL Catalog."],
      });
    });
  });
});

describe("GET cloudstac/ALL/search", () => {
  describe("given an 'ALL' provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Providers, "getCloudProviders")
        .resolves([null, [{ "short-name": "CLOUD_PROV", "provider-id": "CLOUD_PROV" }]]);
      const { statusCode, body } = await request(app).get("/cloudstac/ALL/search");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["This operation is not allowed for the ALL Catalog."],
      });
    });
  });
});

describe("POST cloudstac/ALL/search", () => {
  describe("given an 'ALL' provider", () => {
    it("should return a 404", async () => {
      sandbox
        .stub(Providers, "getProviders")
        .resolves([null, [{ "provider-id": "TEST", "short-name": "TEST" }]]);
      sandbox
        .stub(Providers, "getCloudProviders")
        .resolves([null, [{ "short-name": "CLOUD_PROV", "provider-id": "CLOUD_PROV" }]]);

      const { statusCode, body } = await request(app).post("/cloudstac/ALL/search");

      expect(statusCode).to.equal(404);
      expect(body).to.deep.equal({
        errors: ["This operation is not allowed for the ALL Catalog."],
      });
    });
  });
});
