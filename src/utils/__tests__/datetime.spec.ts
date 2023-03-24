import { expect } from "chai";

import { validDateTime } from "../datetime";

describe("validDateTime", () => {
  describe("given a valid datetime string", () => {
    [
      "1985-04-12T23:20:50.52Z",
      "1996-12-19T16:39:57-00:00",
      "1996-12-19T16:39:57+00:00",
      "1996-12-19T16:39:57-08:00",
      "1996-12-19T16:39:57+08:00",
      "../1985-04-12T23:20:50.52Z",
      "1985-04-12T23:20:50.52Z/..",
      "/1985-04-12T23:20:50.52Z",
      "1985-04-12T23:20:50.52Z/",
      "1985-04-12T23:20:50.52Z/1986-04-12T23:20:50.52Z",
      "1985-04-12T23:20:50.52+01:00/1986-04-12T23:20:50.52+01:00",
      "1985-04-12T23:20:50.52-01:00/1986-04-12T23:20:50.52-01:00",
      "1937-01-01T12:00:27.87+01:00",
      "1985-04-12T23:20:50.52Z",
      "1937-01-01T12:00:27.8710+01:00",
      "1937-01-01T12:00:27.8+01:00",
      "1937-01-01T12:00:27.8Z",
      "2020-07-23T00:00:00.000+03:00",
      "2020-07-23T00:00:00+03:00",
      "1985-04-12t23:20:50.000z",
      "2020-07-23T00:00:00Z",
      "2020-07-23T00:00:00.0Z",
      "2020-07-23T00:00:00.01Z",
      "2020-07-23T00:00:00.012Z",
      "2020-07-23T00:00:00.0123Z",
      "2020-07-23T00:00:00.01234Z",
      "2020-07-23T00:00:00.012345Z",
      "2020-07-23T00:00:00.0123456Z",
      "2020-07-23T00:00:00.01234567Z",
      "2020-07-23T00:00:00.012345678Z",
    ].forEach((input) => {
      it(`${input} should return true`, () => {
        expect(validDateTime(input)).to.be.true;
      });
    });
  });

  describe("given an invalid datetime string", () => {
    [
      ["unbounded slash", "/"],
      ["unbounded slash and dots", "../.."],
      ["unbounded slash and future dots", "/.."],
      ["unbounded past and slash", "../"],
      ["extra delimiter front", "/1984-04-12T23:20:50.52Z/1985-04-12T23:20:50.52Z"],
      ["extra delimiter end", "1984-04-12T23:20:50.52Z/1985-04-12T23:20:50.52Z/"],
      ["extra delimiter front and end", "/1984-04-12T23:20:50.52Z/1985-04-12T23:20:50.52Z/"],
      ["date only", "1985-04-12"],
      ["invalid TZ format", "1937-01-01T12:00:27.87+0100"],
      ["invalid year", "37-01-01T12:00:27.87Z"],
      ["no TZ", "1985-12-12T23:20:50.52"],
      ["not 4 digit year", "21985-12-12T23:20:50.52Z"],
      ["month out of range", "1985-13-12T23:20:50.52Z"],
      ["day out of range", "1985-12-32T23:20:50.52Z"],
      ["hour out of range", "1985-12-01T25:20:50.52Z"],
      ["minute out of range", "1985-12-01T00:60:50.52Z"],
      ["secound out of range", "1985-12-01T00:06:61.52Z"],
      ["franctional sec but no value, dot", "1985-04-12T23:20:50.Z"],
      ["franctional sec but no value, comma", "1985-04-12T23:20:50,Z"],
      ["second out of range without fractional", "1990-12-31T23:59:61Z"],
      ["end before start", "1986-04-12T23:20:50.52Z/1985-04-12T23:20:50.52Z"],
      ["comma as frac sec sep allowed in ISO8601 but not RFC3339", "1985-04-12T23:20:50,52Z"],
    ].forEach(([label, input]) => {
      it(`${label} [${input}] should return false`, () => {
        expect(validDateTime(input)).to.be.false;
      });
    });
  });
});
