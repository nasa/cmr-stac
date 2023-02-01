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

export const geoJsonToQuery = (geoJson: object | object[]) => {
  const geometries = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygons, lines, points] = geometries
    .map((geometry: any) =>
      typeof geometry === "string" ? JSON.parse(geometry) : geometry
    )
    .reduce(
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

/**
 * Return an intersects query object.
 */
const intersectsQuery = (query: any) => {
  const { intersects } = query;
  if (!intersects) return;

  const { polygons, lines, points } = geoJsonToQuery(intersects);

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

/**
 * Convert bbox STAC query term to GraphQL query term.
 */
const bboxToBoundingBox = (query: any) => {
  const { bbox: bboxInput } = query;
  if (!bboxInput) return;

  const bbox = Array.isArray(bboxInput)
    ? bboxInput
    : bboxInput.split(",").map((coord: string) => coord.trim());

  let swLon, swLat, neLon, neLat;
  if (bbox && bbox.length === 4) {
    // 2d bounding box
    swLon = bbox[0];
    swLat = bbox[1];
    neLon = bbox[2];
    neLat = bbox[3];
  } else if (bbox && bbox.length === 6) {
    // 3d bounding box passed in, but CMR only supports 2d,
    // drop the elevations for query

    swLon = bbox[0];
    swLat = bbox[1];
    // swEle = bbox[2]; // placeholder

    neLon = bbox[3];
    neLat = bbox[4];
    // neEle = bbox[5]; // placeholder
  }

  if (swLon == null) return;
  return [swLon, swLat, neLon, neLat].join(",");
};

export const buildQuery = async (req: Request | any) => {
  const { providerId: provider, collectionId } = req.params;
  const query = mergeMaybe(req.query, req.body);

  const limit = Number.isNaN(Number(query.limit)) ? null : Number(query.limit);

  const sortKey = sortByToSortKeys(query.sortBy);

  const boundingBox = bboxToBoundingBox(query);

  const cloudHosted = req.headers["cloud-stac"] === "true";

  const granuleIds = Array.isArray(query.ids)
    ? [...query.ids].flatMap((id) => id.split(","))
    : query.ids?.split(",");

  let gqlQuery: GranulesInput = mergeMaybe(
    { provider },
    {
      cursor: query.cursor,
      sortKey,
      boundingBox,
      limit,
      collectionConceptIds: collectionId ? [collectionId] : [],
      temporal: convertDateTime(query.datetime),
      conceptId: granuleIds,
    }
  );

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
          provider,
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
