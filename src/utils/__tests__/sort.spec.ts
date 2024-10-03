import { expect } from "chai";
import { parseSortFields } from "../sort";
import { SortObject } from "../../models/StacModels";

describe("parseSortFields", () => {
  it("should return an empty array for undefined input", () => {
    const parsedField = parseSortFields();

    expect(parsedField).to.deep.equal([]);
  });

  it("should handle a single field in string based sorting (GET)", () => {
    const parsedField = parseSortFields("field1");
    expect(parsedField).to.deep.equal(["field1"]);
  });

  it("should handle multi field string based sorting (GET)", () => {
    const parsedField = parseSortFields("field1, -field2, field3");

    expect(parsedField).to.deep.equal(["field1", "-field2", "field3"]);
  });

  it("should handle a single object in object based sorting (POST)", () => {
    const input: SortObject[] = [{ field: "field1", direction: "desc" }];
    expect(parseSortFields(input)).to.deep.equal(["-field1"]);
  });

  it("should handle multi field object based sorting (POST)", () => {
    const input: SortObject[] = [
      { field: "field1", direction: "asc" },
      { field: "field2", direction: "desc" },
      { field: "field3", direction: "asc" },
    ];
    expect(parseSortFields(input)).to.deep.equal(["field1", "-field2", "field3"]);
  });

  it("should return an empty array for an empty array", () => {
    const parsedField = parseSortFields([]);

    expect(parsedField).to.deep.equal([]);
  });

  it("should handle mixed array (treating non-strings as empty strings)", () => {
    const input: any[] = ["field1", { field: "field2", direction: "desc" }, "-field3"];

    expect(parseSortFields(input)).to.deep.equal(["field1", "", "-field3"]);
  });
});
