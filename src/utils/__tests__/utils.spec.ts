import { Request } from "express";
import { expect } from "chai";
import { IncomingHttpHeaders } from "http";

import { buildRootUrl, mergeMaybe, scrubTokens, stacContext } from "../index";

describe("buildRootUrl", () => {
  describe("given request with HOST header set", () => {
    ["host", "x-forwarded-host"].forEach((hostHeader) => {
      it(`should handle ${hostHeader} and return a valid url`, () => {
        const headers: IncomingHttpHeaders = {};
        headers[hostHeader] = "my-test-host";

        expect(buildRootUrl({ headers } as Request)).to.deep.equal("http://my-test-host");
      });
    });
  });
});

describe("scrub tokens", () => {
  it("anonymizes authorization headers", () => {
    expect(scrubTokens({ authorization: "Bearer zzzzzzzzzzzzzzzzzzzzzz" })).to.have.property(
      "authorization",
      "Bearer zzzzz... REDACTED"
    );
  });
});

describe("mergeMaybe", () => {
  [
    ["undefined", undefined],
    ["null", null],
    ["empty strings", ""],
    ["empty arrays", []],
    ["NaN", parseFloat("foo")],
  ].forEach(([label, badValue]) => {
    it(`filters ${label}`, () => {
      expect(mergeMaybe({ good: "value" }, { myKey: badValue })).to.deep.equal({ good: "value" });
    });
  });

  it("does not filter out zero", () => {
    expect(mergeMaybe({ foo: "bar" }, { value: 0 })).to.deep.equal({ foo: "bar", value: 0 });
  });
});

describe("stacContext", () => {
  describe("given a root catalog path", () => {
    it("returns an ID of STAC", () => {
      const mockRequest = {
        method: "GET",
        headers: {
          "cloudfront-forwarded-proto": "https",
          host: "example.api",
        } as IncomingHttpHeaders,
        originalUrl: "/stac",
      } as Request;
      expect(stacContext(mockRequest)).to.deep.equal({
        id: "STAC",
        root: "https://example.api",
        stacRoot: "https://example.api/stac",
        path: "https://example.api/stac",
        self: "https://example.api/stac",
      });
    });
  });

  describe("given a provider catalog path", () => {
    it("returns the provider path", () => {
      const mockRequest = {
        method: "GET",
        headers: {
          "cloudfront-forwarded-proto": "https",
          host: "example.api",
        } as IncomingHttpHeaders,
        originalUrl: "/stac/TEST_PROV",
      } as Request;
      expect(stacContext(mockRequest)).to.deep.equal({
        id: "STAC",
        root: "https://example.api",
        stacRoot: "https://example.api/stac",
        path: "https://example.api/stac/TEST_PROV",
        self: "https://example.api/stac/TEST_PROV",
      });
    });
  });

  describe("given a provider search path", () => {
    it("returns a self property including the query", () => {
      const mockRequest = {
        method: "GET",
        headers: {
          "cloudfront-forwarded-proto": "https",
          host: "example.api",
        } as IncomingHttpHeaders,
        originalUrl: "/stac/TEST_PROV/search?collections=ABC_123",
      } as Request;
      expect(stacContext(mockRequest)).to.deep.equal({
        id: "STAC",
        root: "https://example.api",
        stacRoot: "https://example.api/stac",
        path: "https://example.api/stac/TEST_PROV/search",
        self: "https://example.api/stac/TEST_PROV/search?collections=ABC_123",
      });
    });
  });

  describe("given a cloudstac provider search path", () => {
    it("returns a self property including the query", () => {
      const mockRequest = {
        method: "GET",
        headers: {
          "cloud-stac": "true",
          "cloudfront-forwarded-proto": "https",
          host: "example.api",
        } as IncomingHttpHeaders,
        originalUrl: "/cloudstac/TEST_PROV/search?collections=ABC_123",
      } as Request;
      expect(stacContext(mockRequest)).to.deep.equal({
        id: "CLOUDSTAC",
        root: "https://example.api",
        stacRoot: "https://example.api/cloudstac",
        path: "https://example.api/cloudstac/TEST_PROV/search",
        self: "https://example.api/cloudstac/TEST_PROV/search?collections=ABC_123",
      });
    });
  });

  describe("given a stac provider collections path ending in a trailing slash", () => {
    it("strips the trailing slash", () => {
      const mockRequest = {
        method: "GET",
        headers: {
          "cloud-stac": "true",
          "cloudfront-forwarded-proto": "https",
          host: "example.api",
        } as IncomingHttpHeaders,
        originalUrl: "/cloudstac/TEST_PROV/collections/",
      } as Request;
      expect(stacContext(mockRequest)).to.deep.equal({
        id: "CLOUDSTAC",
        root: "https://example.api",
        stacRoot: "https://example.api/cloudstac",
        path: "https://example.api/cloudstac/TEST_PROV/collections",
        self: "https://example.api/cloudstac/TEST_PROV/collections",
      });
    });
  });
});
