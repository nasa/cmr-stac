import { SortObject } from "../models/StacModels";

/**
 * Parses sortby value into a single array
 * This function handles three possible input formats:
 * 1. A string of comma-separated sort fields (used in GET requests)
 *  - /collections?sortby=endDate
 * 2. An array of SortObject (used in POST requests)
 *  {
      "sortby": [
          {
              "field": "properties.endDate",
              "direction": "desc"
          }
      ]
    }
 * 3. Undefined or null (returns an empty array)
 * 
 * @param sortBys - The sortby value
 * @returns An array of strings, each representing a sort field. 
 *          Fields for descending sort are prefixed with '-'.
 */
export const parseSortFields = (sortBys?: string | string[] | SortObject[]): string[] => {
  if (Array.isArray(sortBys)) {
    if (sortBys.length === 0) return [];

    if (sortBys[0] !== null && typeof sortBys[0] === "object") {
      // Handle object-based sorting (POST). Anything that is not a usable sort
      // object becomes an empty field so the caller rejects it rather than throwing.
      return (sortBys as SortObject[]).map((sort) =>
        sort && typeof sort.field === "string"
          ? `${sort.direction === "desc" ? "-" : ""}${sort.field}`
          : ""
      );
    } else {
      // Handle array of strings
      return sortBys.map((item) => (typeof item === "string" ? item.trim() : ""));
    }
  } else if (typeof sortBys === "string") {
    // Handle string-based sorting (GET)
    return sortBys.split(",").map((key) => key.trim());
  }

  return [];
};

export const mapIdSortKey = (searchType = ""): string => {
  if (searchType === "collection") {
    return "entryId";
  } else if (searchType === "item") {
    return "readableGranuleName";
  }

  return "";
};
