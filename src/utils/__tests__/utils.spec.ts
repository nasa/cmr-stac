import { Request } from "express";
import { expect } from "chai";
import { buildRootUrl } from "../index";

describe("buildRootUrl", () => {
  describe("given request with HOST header set", () => {
    ["host", "x-forwarded-host"].forEach((hostHeader) => {
      it(`should handle ${hostHeader} and return a valid url`, () => {
        const headers: any = {};
        headers[hostHeader] = "my-test-host";

        expect(buildRootUrl({ headers } as Request)).to.deep.equal(
          "http://my-test-host"
        );
      });
    });
  });
});
