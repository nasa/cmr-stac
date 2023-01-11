import { Request } from "express";
import { expect } from "chai";
import { buildRootUrl } from "../index";

describe("buildRootUrl", () => {
  describe("given request with HOST header set", () => {
    it("should return a valid url", () => {
      expect(
        buildRootUrl({
          baseUrl: "/stac",
          headers: {
            host: "my-test-host",
          },
        } as Request)
      ).to.equal("http://my-test-host/stac");
    });
  });
});
