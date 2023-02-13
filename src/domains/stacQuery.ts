import { Request } from "express";
import { flattenDeep } from "lodash";
import { request } from "graphql-request";

import { GeoJSONGeometry } from "../@types/StacItem";
import { InvalidParameterError } from "../models/errors";
import { CollectionsInput, GranulesInput } from "../models/GraphQLModels";
import { getCollectionIds } from "./collections";
import {
  flattenTree,
  mergeMaybe,
  isPlainObject,
  buildClientId,
  scrubTokens,
} from "../utils";
import { dateTimeToRange } from "../utils/datetime";

type OptionalString = string | null;

type GraphQLHandlerResponse =
  | [error: string, data: null]
  | [
      error: null,
      data: {
        count: number;
        cursor: OptionalString;
        items: any[];
      }
    ];

export type GraphQLHandler = (response: any) => GraphQLHandlerResponse;

export type GraphQLResults = {
  count: number;
  items: any[];
  cursor: OptionalString;
};

const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3013";
export const CMR_QUERY_MAX = 500;
export const MAX_SIGNED_INTEGER = Math.pow(2, 31) - 1;

export const geoJsonToQuery = (geoJson: object | object[]) => {
  const geometries = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygon, line, point] = geometries
    .map((geometry: any) =>
      typeof geometry === "string" ? JSON.parse(geometry) : geometry
    )
    .reduce(
      ([polygon, line, point], geometry: GeoJSONGeometry) => {
        const flattened = flattenDeep(geometry.coordinates).join(",");

        switch (geometry.type.toLowerCase()) {
          case "point":
          case "multipoint":
            return [[...polygon], [...line], [...point, flattened]];
          case "linestring":
            return [[...polygon], [...line, flattened], [...point]];
          case "multilinestring":
            return [[...polygon], [...line, flattened], [...point]];
          case "polygon":
          case "multipolygon":
            return [[...polygon, flattened], [...line], [...point]];
          default:
            throw new InvalidParameterError(
              "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
            );
        }
      },
      [[] as string[], [] as string[], [] as string[]]
    );

  return { polygon, line, point };
};

/**
 * Return an intersects query object.
 */
const intersectsQuery = (_req: Request, query: any) => {
  const { intersects } = query;
  if (!intersects) return;

  return geoJsonToQuery(intersects);
};

const propertyQuery = (_req: Request, _query: any) => ({});

/**
 * Return a cloudCover property query object.
 */
const cloudCoverQuery = (_req: Request, query: any) => {
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

const limitQuery = (_req: Request, query: any) => ({
  limit: Number.isNaN(Number(query.limit)) ? null : Number(query.limit),
});

const temporalQuery = (_req: Request, query: any) => ({
  temporal: encodeURIComponent(dateTimeToRange(query.datetime) ?? ""),
});

const bboxQuery = (_req: Request, query: any) => ({
  boundingBox: bboxToBoundingBox(query),
});

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

const sortKeyQuery = (_req: Request, query: any) => ({
  sortKey: sortByToSortKeys(query.sortBy),
});

const idsQuery = (req: Request, query: any) => {
  const {
    params: { itemId },
  } = req;

  let itemIds: string[] = [];
  if (itemId) {
    itemIds.push(itemId);
  } else {
    itemIds = Array.isArray(query.ids)
      ? query.ids.flatMap((id: string) => id.split(","))
      : query.ids?.split(",") ?? [];
  }

  return { conceptId: itemIds };
};

const cursorQuery = (query: any) => ({ cursor: query.cursor });

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

const collectionsQuery = async (req: Request, query: any) => {
  const {
    headers,
    params: { providerId: provider, collectionId },
  } = req;
  const cloudHosted = headers["cloud-stac"] === "true";

  let collectionConceptIds: string[] = [];
  if (collectionId) {
    collectionConceptIds.push(collectionId);
  } else {
    collectionConceptIds = Array.isArray(query.collections)
      ? query.collections.flatMap((id: string) => id.split(","))
      : query.collections?.split(",") ?? [];
  }

  if (cloudHosted) {
    const cloudHostedQuery = cloudHosted ? { cloudHosted: true } : {};
    const { items: cloudHostedConcepts } = await getCollectionIds(
      mergeMaybe(
        {
          provider,
          hasGranules: true,
          limit: CMR_QUERY_MAX,
        },
        cloudHostedQuery
      ),
      { headers }
    );

    const searchableCollections = collectionConceptIds.length
      ? cloudHostedConcepts.filter(({ conceptId }) =>
          collectionConceptIds.find((queriedId) => queriedId === conceptId)
        )
      : cloudHostedConcepts;

    return {
      collectionConceptIds: searchableCollections,
    };
  }

  return { collectionConceptIds };
};

/**
 * Merge the query params and body into a single query object and return the GraphQL query.
 *
 * Defaults to POST body when conflicting keys are passed.
 */
export const buildQuery = async (req: Request) => {
  const {
    params: { providerId: provider },
  } = req;

  const query = mergeMaybe(req.query, req.body);

  const queryBuilders = [
    idsQuery,
    collectionsQuery,
    bboxQuery,
    intersectsQuery,
    propertyQuery,
    cloudCoverQuery,
    limitQuery,
    temporalQuery,
    sortKeyQuery,
    cursorQuery,
  ];

  return await queryBuilders.reduce(
    async (partialQuery, bldr) =>
      mergeMaybe(await partialQuery, await bldr(req, query)),
    Promise.resolve({ provider } as GranulesInput)
  );
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

export const paginateQuery = async (
  gqlQuery: string,
  params: GranulesInput | CollectionsInput,
  opts: any,
  handler: GraphQLHandler,
  prevResults: any[] = []
): Promise<GraphQLResults> => {
  const paginatedParams = { ...params };

  if (paginatedParams.limit != null) {
    paginatedParams.limit = Math.min(paginatedParams.limit, CMR_QUERY_MAX);
  }
  const variables = { params: { ...paginatedParams } };

  let userClientId, authorization;
  const { headers } = opts;
  if (headers) {
    userClientId = buildClientId(headers["client-id"]);
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe(
    { "client-id": userClientId },
    { authorization }
  );

  const timingMessage = `Outbound GQL query => ${JSON.stringify(
    paginatedParams,
    null,
    2
  )} ${JSON.stringify(scrubTokens(headers), null, 2)}`;

  try {
    console.info(timingMessage);
    const response = await request(
      GRAPHQL_URL,
      gqlQuery,
      variables,
      requestHeaders
    );

    // use the passed in results handler
    const [errors, data] = handler(response);

    if (errors) throw new Error(errors);
    const { count, cursor, items } = data!;

    const totalResults = [...prevResults, ...items];
    const moreResultsAvailable =
      totalResults.length !== count && cursor != null;
    const foundEnough = totalResults.length >= (params.limit ?? -1);

    if (moreResultsAvailable && !foundEnough) {
      console.debug(
        `Retrieved ${totalResults.length} of ${
          params.limit
        } for ${JSON.stringify(params, null, 2)}`
      );
      const nextParams = mergeMaybe({ ...params }, { cursor });
      return await paginateQuery(
        gqlQuery,
        nextParams,
        opts,
        handler,
        totalResults
      );
    }

    return { items: totalResults, count, cursor };
  } catch (err: any) {
    if (err.response?.status === 200) {
      console.info(`GraphQL returned a non-items response.`, err);
      return { items: [], count: 0, cursor: null };
    }
    throw err;
  }
};
