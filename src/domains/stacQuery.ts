import { Request } from "express";
import { flattenDeep } from "lodash";

import { GeoJSONGeometry } from "../@types/StacItem";
import { InvalidParameterError } from "../models/errors";
import { GranulesInput } from "../models/GraphQLModels";
import { getCollectionIds } from "./collections";
import { flattenTree, mergeMaybe, isPlainObject } from "../utils";
import { convertDateTime } from "../utils/datetime";

export const DEFAULT_LIMIT = 250;
export const CMR_QUERY_MAX = 2000;

export const geoJsonToQuery = (geoJson: string | string[]) => {
  const geometryStrings = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygons, lines, points] = geometryStrings.map(stringToGeoJSON).reduce(
    ([polygons, lines, points], geometry: GeoJSONGeometry) => {
      const flattened = flattenDeep(geometry.coordinates).join(",");

      switch (geometry.type.toLowerCase()) {
        case "point":
        case "multipoint":
          return [[...polygons], [...lines], [...points, flattened]];

        case "linestring":
          return [[...polygons], [...lines, flattened], [...points]];
        case "multilinestring":
          console.warn(
            "Gaps in linestrings are not supported for intersects yet"
          );
          return [[...polygons], [...lines, flattened], [...points]];
        case "polygon":
        case "multipolygon":
          console.warn(
            "Holes in polygons are not supported for intersects yet"
          );
          return [[...polygons, flattened], [...lines], [...points]];
        default:
          throw new InvalidParameterError(
            "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
          );
      }
    },
    [[] as string[], [] as string[], [] as string[]]
  );

  return { polygons, lines, points };
};

export const stringToGeoJSON = (geometry: string): GeoJSONGeometry => {
  try {
    const geoJson = JSON.parse(geometry);
    if (!geoJson.type) {
      console.info(`Missing 'type' from GeoJSON geometry [${geometry}]`);
      throw new InvalidParameterError(
        "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
      );
    }

    if (!geoJson.coordinates) {
      console.info(`Missing 'coordinates' from GeoJSON geometry [${geometry}]`);
      throw new InvalidParameterError(
        "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
      );
    }
    return geoJson as GeoJSONGeometry;
  } catch (err) {
    console.info(
      `Failed to parse geoJSON [${geometry}] : ${(err as Error).message}`
    );
    throw new InvalidParameterError(
      "Invalid intersects parameter detected. Please verify it is a valid GeoJSON geometry."
    );
  }
};

/**
 * Return an intersects query object.
 */
const intersectsQuery = (query: any) => {
  const { intersects } = query;
  if (!intersects) return;

  const { polygons, lines, points } = geoJsonToQuery(intersects.toString());

  return mergeMaybe(
    {},
    {
      polygon: polygons,
      line: lines,
      point: points,
    }
  );
};

/**
 * Return a cloudCover property query object.
 */
const cloudCoverQuery = (query: any) => {
  if (!query || !query["query"] || !query["query"]["eo:cloud_cover"]) return;

  const { lt, lte, gt, gte } = query["query"]["eo:cloud_cover"];
  const max = lt || lte;
  const min = gt || gte;

  // TODO update graphql query for difference between lt,lte and gt,gte syntax

  const cloudCover = mergeMaybe(
    {},
    {
      max: Number.isNaN(Number(max)) ? null : parseFloat(max),
      min: Number.isNaN(Number(min)) ? null : parseFloat(min),
    }
  );

  return { cloudCover };
};
/**
 * Returns a list of sortKeys from the sortBy property
 */
export const sortByToSortKeys = (sortBys?: string | string[]): string[] => {
  if (!sortBys) return [];

  const baseSortKeys = Array.isArray(sortBys) ? [...sortBys] : [sortBys];

  return baseSortKeys.reduce((sortKeys, sortBy) => {
    if (!sortBy || sortBy.trim() === "") return sortKeys;
    if (sortBy.match(/(properties\.)?eo:cloud_cover$/gi)) {
      return [
        ...sortKeys,
        sortBy.startsWith("-") ? "-cloudCover" : "cloudCover",
      ];
    }

    return [...sortKeys, sortBy];
  }, [] as string[]);
};

export const buildQuery = async (req: Request | any) => {
  const { providerId, collectionId } = req.params;
  const query = mergeMaybe(req.query, req.body);

  const limit = Number.isNaN(Number(query.limit)) ? null : Number(query.limit);

  const sortKey = sortByToSortKeys(query.sortBy);

  const cloudHosted = req.headers["cloud-stac"] === "true";

  let gqlQuery: GranulesInput = mergeMaybe(
    { provider: providerId, limit },
    {
      sortKey,
      collectionConceptIds: collectionId ? [collectionId] : [],
      temporal: convertDateTime(query.datetime),
    }
  );

  const granuleIds = (
    Array.isArray(query.ids) ? [...query.ids] : [query.ids]
  ).filter((id) => id);

  gqlQuery = mergeMaybe(gqlQuery, {
    cursor: query.cursor,
    boundingBox: Array.isArray(query.bbox) ? query.bbox.join(",") : query.bbox,
    conceptId: granuleIds,
  });

  const queryBuilders = [intersectsQuery, cloudCoverQuery];

  gqlQuery = queryBuilders.reduce(
    (acc, bldr) => mergeMaybe(acc, bldr(query)),
    gqlQuery
  );

  if (cloudHosted || req.query?.collections || req.body?.collections) {
    // have to search by collectionConceptIds and not provider to filter on 'cloudHosted'
    const cloudHostedQuery = cloudHosted ? { cloudHosted: true } : {};
    const { conceptIds } = await getCollectionIds(
      mergeMaybe(
        {
          provider: providerId,
          hasGranules: true,
          limit: CMR_QUERY_MAX,
        },
        cloudHostedQuery
      ),
      { headers: req.headers }
    );

    gqlQuery = {
      ...gqlQuery,
      collectionConceptIds: conceptIds,
    } as GranulesInput;
  }
  return gqlQuery;
};

/**
 * Convert a JSON query structure to an array style query string.
 *
 * @example
 * stringifyQuery({provider:"my_prov", query:{"eo:cloud_cover": {"gt": 60}}})
 * => "provider=my_prov&query[eo:cloud_cover][gt]=60"
 */
export const stringifyQuery = (input: any) => {
  const queryParams = new URLSearchParams();

  Object.keys(input).forEach((key) => {
    if (isPlainObject(input[key])) {
      flattenTree(input[key]).forEach((leaf: any) => {
        const deepKeys = leaf.key.map((k: string) => `[${k}]`).join("");
        queryParams.set(`${key}${deepKeys}`, leaf.value);
      });
    } else {
      queryParams.set(key, input[key]);
    }
  });

  return queryParams.toString();
};
