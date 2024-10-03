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
export const parseSortFields = (sortBys?: string | SortObject[]): string[] => {
  if (!sortBys) return [];

  if (Array.isArray(sortBys) && typeof sortBys[0] === "object") {
    // Handle object-based sorting (POST)
    return (sortBys as SortObject[]).map(
      (sort) => `${sort.direction === "desc" ? "-" : ""}${sort.field}`
    );
  }
  if (typeof sortBys === "string") {
    // Handle string-based sorting (GET)
    return sortBys.split(",").map((key) => key.trim());
  }

  return [];
};
