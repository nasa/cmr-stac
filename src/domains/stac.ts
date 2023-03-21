import { Request } from "express";
import { IncomingHttpHeaders } from "http";
import { flattenDeep, isPlainObject } from "lodash";
import { request } from "graphql-request";

import { GeoJSONGeometry } from "../@types/StacItem";
import { InvalidParameterError } from "../models/errors";
import {
  CollectionsInput,
  GranulesInput,
  GraphQLHandler,
  GraphQLResults,
} from "../models/GraphQLModels";
import { StacQuery } from "../models/StacModels";
import { getAllCollectionIds } from "./collections";
import {
  flattenTree,
  mergeMaybe,
  buildClientId,
  scrubTokens,
  generatePossibleCollectionIds,
} from "../utils";
import { dateTimeToRange } from "../utils/datetime";

import { AssetLinks } from "../@types/StacCollection";
import { Collection, Granule, RelatedUrlType } from "../models/GraphQLModels";

/**
 * Return download assets if present.
 */
const downloadAssets = (concept: Collection | Granule) => {
  return (concept.relatedUrls ?? [])
    .filter((relatedUrl) => relatedUrl["type"] === RelatedUrlType.GET_DATA)
    .reduce((downloadAssets, relatedUrl, idx, available) => {
      const [entry, display] = available.length > 1 ? [`_${idx}`, ` [${idx}]`] : ["", ""];

      const downloadAsset: AssetLinks = {};
      downloadAsset[`download${entry}`] = {
        href: relatedUrl.url,
        title: `Direct Download${display}`,
        description: relatedUrl.description,
        roles: ["data"],
      };
      return { ...downloadAssets, ...downloadAsset };
    }, {} as AssetLinks);
};

/**
 * Return metadata assets if present.
 */
const metadataAssets = (concept: Collection | Granule) => {
  return (concept.relatedUrls ?? [])
    .filter((relatedUrl) => relatedUrl["type"] === RelatedUrlType.DATA_SET_LANDING_PAGE)
    .reduce((metadataAssets, relatedUrl, idx, available) => {
      const [entry, display] = available.length > 1 ? [`_${idx}`, ` [${idx}]`] : ["", ""];

      const metadataAsset: AssetLinks = {};
      metadataAsset[`provider_metadata${entry}`] = {
        href: relatedUrl.url,
        title: `Provider Metadata${display}`,
        description: relatedUrl.description,
        roles: ["metadata"],
      };
      return { ...metadataAssets, ...metadataAsset };
    }, {} as AssetLinks);
};

/**
 * Return thumbnail assets if present.
 */
const thumbnailAssets = (concept: Collection | Granule) => {
  const thumbnailTypes = [
    RelatedUrlType.GET_RELATED_VISUALIZATION /* , RelatedUrlType.THUMBNAIL */,
  ];
  return (concept.relatedUrls ?? [])
    .filter((relatedUrl) =>
      thumbnailTypes.find((thumbnailType) => thumbnailType === relatedUrl["type"])
    )
    .reduce((metadataAssets, relatedUrl, idx, available) => {
      const [entry, display] = available.length > 1 ? [`_${idx}`, ` [${idx}]`] : ["", ""];

      const thumbnailAsset: AssetLinks = {};
      thumbnailAsset[`thumbnail${entry}`] = {
        href: relatedUrl.url,
        title: `Thumbnail${display}`,
        description: relatedUrl.description,
        roles: ["thumbnail"],
      };
      return { ...metadataAssets, ...thumbnailAsset };
    }, {} as AssetLinks);
};

/**
 * Reducer for s3 buckets.
 */
const s3BucketToAsset = (assets: AssetLinks, s3Bucket: string) => {
  const assetTitle = s3Bucket.replace("s3://", "").replace(/[/\-:.]/gi, "_");
  const s3Asset: AssetLinks = {};
  const href = s3Bucket.startsWith("s3://") ? s3Bucket : `s3://${s3Bucket}`;
  s3Asset[`s3_${assetTitle}`] = { href, roles: ["data"], title: assetTitle };
  return { ...assets, ...s3Asset };
};

/**
 * Return a map of S3 links as assets if present.
 */
const s3Assets = (concept: Collection | Granule) => {
  if (!("directDistributionInformation" in concept)) return {} as AssetLinks;

  const s3Buckets = concept.directDistributionInformation?.s3BucketAndObjectPrefixNames ?? [];
  const s3Credentials = concept.directDistributionInformation?.s3CredentialsApiEndpoint;
  const s3CredentialsApiDocs =
    concept.directDistributionInformation?.s3CredentialsApiDocumentationUrl;

  const s3Assets: AssetLinks = s3Buckets
    .flatMap((s3Buckets) => s3Buckets.split(","))
    .map((s3Bucket) => s3Bucket.trim())
    .filter((s3Bucket) => s3Bucket)
    .reduce(s3BucketToAsset, {} as AssetLinks);

  if (s3Credentials) {
    s3Assets["s3_credentials"] = {
      href: s3Credentials,
      title: "S3 credentials API endpoint",
      roles: ["metadata"],
    };
  }

  if (s3CredentialsApiDocs) {
    s3Assets["s3_credentials_documentation"] = {
      href: s3CredentialsApiDocs,
      title: "S3 credentials API endpoint documentation",
      roles: ["metadata"],
    };
  }

  return s3Assets;
};

const defaultExtractors = [thumbnailAssets, downloadAssets, metadataAssets, s3Assets];

/**
 * Given a concept and a list of asset extractors return available assets.
 */
export const extractAssets = (
  collection: Collection | Granule,
  assetExtractors: ((concept: Collection | Granule) => AssetLinks)[] = defaultExtractors
): AssetLinks =>
  assetExtractors.reduce(
    (assets, extractAssetsFn) => mergeMaybe(assets, extractAssetsFn(collection)),
    {} as AssetLinks
  );
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3013";
export const CMR_QUERY_MAX = 2000;
export const MAX_SIGNED_INTEGER = 2 ** 31 - 1;

export const geoJsonToQuery = (geoJson: object | object[]) => {
  const geometries = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygon, line, point] = geometries
    .map((geometry: object | string) =>
      typeof geometry === "string" ? JSON.parse(geometry) : geometry
    )
    .reduce(
      ([polygon, line, point], geometry: GeoJSONGeometry) => {
        const flattened =
          typeof geometry.coordinates === "string"
            ? geometry.coordinates
            : flattenDeep(geometry.coordinates).join(",");

        switch (geometry.type.toLowerCase()) {
          case "point":
          case "multipoint":
            return [[...polygon], [...line], [...point, flattened]];
          case "linestring":
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
const intersectsQuery = (_req: Request, query: StacQuery) => {
  const { intersects } = query;
  if (!intersects) return;

  return geoJsonToQuery(intersects);
};

/**
 * Return a cloudCover property query object.
 */
const cloudCoverQuery = (_req: Request, query: StacQuery) => {
  if (!query || !query["query"] || !query["query"]["eo:cloud_cover"]) return;

  const { lt, lte, gt, gte } = query["query"]["eo:cloud_cover"];
  const max = lt || lte;
  const min = gt || gte;

  // TODO update graphql query for difference between lt,lte and gt,gte syntax

  const cloudCover = mergeMaybe(
    {},
    {
      max: Number.isNaN(Number(max)) ? null : Number(max),
      min: Number.isNaN(Number(min)) ? null : Number(min),
    }
  );

  return { cloudCover };
};

const limitQuery = (_req: Request, query: StacQuery) => ({
  limit: Number.isNaN(Number(query.limit)) ? null : Number(query.limit),
});

const temporalQuery = (_req: Request, query: StacQuery) => ({
  temporal: encodeURIComponent(dateTimeToRange(query.datetime) ?? ""),
});

const bboxQuery = (_req: Request, query: StacQuery) => ({
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
      return [...sortKeys, sortBy.startsWith("-") ? "-cloudCover" : "cloudCover"];
    }

    return [...sortKeys, sortBy];
  }, [] as string[]);
};

const sortKeyQuery = (_req: Request, query: StacQuery) => ({
  sortKey: sortByToSortKeys(query.sortBy),
});

const idsQuery = (req: Request, query: StacQuery) => {
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

const cursorQuery = (_req: Request, query: StacQuery) => ({ cursor: query.cursor });

/**
 * Convert bbox STAC query term to GraphQL query term.
 */
const bboxToBoundingBox = (query: StacQuery): string | null => {
  const { bbox: bboxInput } = query;
  if (!bboxInput) return null;

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

  if (swLon == null) return null;
  return [swLon, swLat, neLon, neLat].join(",");
};

/**
 * Filter collection ids on whether they are cloudhosted or not.
 * If no collections are specified, that means we are searching over ALL cloudhosted collections
 */
const filterCloudHosted = async (req: Request, ids: string[]): Promise<string[]> => {
  const {
    headers,
    params: { providerId: provider },
  } = req;

  // FIXME: this strategy is fundamentally broken, getting "ALL" cloudhosted concept ids is very bad
  // Refer to CMR-8996 for correct fix
  const { items: cloudHostedCollections } = await getAllCollectionIds(
    mergeMaybe(
      {
        provider,
        hasGranules: true,
        cloudHosted: true,
      },
      { entryId: ids }
    ),
    { headers }
  );
  return cloudHostedCollections.map((collection) => collection.id);
};

/**
 * Convert STAC collections parameter to GraphQl entry_ids parameter.
 *
 * NOTE: CloudSTAC requests need ALL collection ids when none are provided.
 */
const collectionsQuery = async (
  req: Request,
  query: { collections?: string[] }
): Promise<{ entryId: string[] }> => {
  const {
    headers,
    params: { collectionId },
  } = req;
  const cloudHosted = headers["cloud-stac"] === "true";

  const collections = Array.isArray(query.collections)
    ? [...query.collections, collectionId]
    : [query.collections, collectionId];

  const entryIds = collections
    .filter((id) => id) // remove falsey values
    // NOTE: ".v" is the legacy separator from the first version of CMR-STAC
    // See https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html#g-entry-id
    .flatMap((id) => generatePossibleCollectionIds(id as string, ".v", "_"));

  const searchableCollections = cloudHosted ? await filterCloudHosted(req, entryIds) : entryIds;

  return { entryId: searchableCollections };
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
    cloudCoverQuery,
    limitQuery,
    temporalQuery,
    sortKeyQuery,
    cursorQuery,
  ];

  return await queryBuilders.reduce(
    async (partialQuery, queryBuilder) =>
      mergeMaybe(await partialQuery, await queryBuilder(req, query)),
    Promise.resolve({ provider } as GranulesInput)
  );
};

export type SimpleMap = { [key: string]: unknown };
/**
 * Convert a JSON query structure to an array style query string.
 *
 * @example
 * stringifyQuery({provider:"my_prov", query:{"eo:cloud_cover": {"gt": 60}}})
 * => "provider=my_prov&query[eo:cloud_cover][gt]=60"
 */
export const stringifyQuery = (input: { [key: string]: unknown }) => {
  const queryParams = new URLSearchParams();

  Object.keys(input).forEach((key) => {
    if (isPlainObject(input[key])) {
      flattenTree(input[key] as SimpleMap).forEach((leaf: { key: string[]; value: unknown }) => {
        const deepKeys = leaf.key.map((k: string) => `[${k}]`).join("");
        queryParams.set(`${key}${deepKeys}`, leaf.value as string);
      });
    } else {
      queryParams.set(key, input[key] as string);
    }
  });

  return queryParams.toString();
};

/**
 * Query GraphQL with built in pagination handling and return the results.
 * Provide a results handler to handle the results of the query.
 */
export const paginateQuery = async (
  gqlQuery: string,
  params: GranulesInput | CollectionsInput,
  opts: {
    headers?: IncomingHttpHeaders;
  },
  handler: GraphQLHandler,
  prevResults: unknown[] = []
): Promise<GraphQLResults> => {
  const paginatedParams = { ...params };

  if (paginatedParams.limit != null) {
    paginatedParams.limit = Math.min(paginatedParams.limit, CMR_QUERY_MAX);
  }

  const variables = { params: { ...paginatedParams } };

  let userClientId, authorization;
  const { headers } = opts;
  if (headers) {
    userClientId = buildClientId(headers["client-id"] as string);
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe({ "client-id": userClientId }, { authorization });

  const timingMessage = `Outbound GQL query => ${JSON.stringify(
    paginatedParams,
    null,
    2
  )} ${JSON.stringify(scrubTokens(headers as IncomingHttpHeaders), null, 2)}`;

  try {
    console.info(timingMessage);
    const response = await request(GRAPHQL_URL, gqlQuery, variables, requestHeaders);

    // use the passed in results handler
    const [errors, data] = handler(response);

    if (errors) throw new Error(errors);
    if (!data) throw new Error("No data returned from GraphQL during paginated query");
    const { count, cursor, items } = data;

    const totalResults = [...prevResults, ...items];
    const moreResultsAvailable = totalResults.length !== count && cursor != null;
    const foundEnough = totalResults.length >= (params.limit ?? -1);

    if (moreResultsAvailable && !foundEnough) {
      console.debug(
        `Retrieved ${totalResults.length} of ${params.limit} for ${JSON.stringify(params, null, 2)}`
      );
      const nextParams = mergeMaybe({ ...params }, { cursor });
      return await paginateQuery(gqlQuery, nextParams, opts, handler, totalResults);
    }

    return { items: totalResults, count, cursor };
  } catch (err: unknown) {
    if (
      !(err instanceof Error) &&
      (err as { response: { status: number } }).response.status === 200
    ) {
      console.info(`GraphQL returned a non-items response.`, err);
      return { items: [], count: 0, cursor: null };
    }
    throw err;
  }
};
