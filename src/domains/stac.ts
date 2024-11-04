import { Request } from "express";
import { IncomingHttpHeaders } from "http";
import { flattenDeep } from "lodash";
import { request } from "graphql-request";

import {
  GeoJSONGeometry,
  GeoJSONMultiPolygon,
  GeoJSONPolygon,
  GeoJSONMultiLineString,
  GeoJSONLineString,
  GeoJSONMultiPoint,
  GeoJSONPoint,
  GeoJSONGeometryCollection,
} from "../@types/StacItem";
import { InvalidParameterError } from "../models/errors";
import {
  CollectionsInput,
  GranulesInput,
  GraphQLHandler,
  GraphQLResults,
} from "../models/GraphQLModels";
import { SortObject, StacQuery } from "../models/StacModels";
import { getAllCollectionIds } from "./collections";
import {
  mergeMaybe,
  buildClientId,
  extractAssetMapKey,
  scrubTokens,
  generatePossibleCollectionIds,
} from "../utils";
import { dateTimeToRange } from "../utils/datetime";

import { AssetLinks } from "../@types/StacCollection";
import { Collection, Granule, RelatedUrlType } from "../models/GraphQLModels";
import { parseSortFields } from "../utils/sort";

const CMR_ROOT = process.env.CMR_URL;

/**
 * Return download assets if present.
 */
const downloadAssets = (concept: Collection | Granule) => {
  return (concept.relatedUrls ?? [])
    .filter((relatedUrl) => relatedUrl["type"] === RelatedUrlType.GET_DATA)
    .reduce((downloadAssets, relatedUrl, idx, available) => {
      const display = available.length > 1 ? ` [${idx}]` : "";
      const relatedUrlKey = extractAssetMapKey(relatedUrl.url);
      const downloadAsset: AssetLinks = {};
      downloadAsset[`${relatedUrlKey}`] = {
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
 * Return the xml metadata asset.
 */
const xmlMetadataAssets = (concept: Collection | Granule) => {
  const xmlMetadataAsset: AssetLinks = {};
  xmlMetadataAsset[`metadata`] = {
    href: `${CMR_ROOT}/search/concepts/${concept.conceptId}.xml`,
    title: `CMR XML metadata for ${concept.conceptId}`,
    type: "application/xml",
    roles: ["metadata"],
  };
  return { ...metadataAssets, ...xmlMetadataAsset } as AssetLinks;
};

/**
 * Return thumbnail assets if present.
 */
const thumbnailAssets = (concept: Collection | Granule) => {
  const thumbnailTypes = [RelatedUrlType.THUMBNAIL, RelatedUrlType.GET_RELATED_VISUALIZATION];
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
 * Return browse assets if present.
 */
export const browseAssets = (concept: Collection | Granule) => {
  const browseTypes = [RelatedUrlType.GET_RELATED_VISUALIZATION];
  return (concept.relatedUrls ?? [])
    .filter((relatedUrl) =>
      browseTypes.find(
        (browseType) => browseType === relatedUrl["type"] && relatedUrl.url.startsWith("http")
      )
    )
    .reduce((metadataAssets, relatedUrl) => {
      const browseAsset: AssetLinks = {};
      browseAsset[`browse`] = {
        href: relatedUrl.url,
        title: `Download ${relatedUrl.url.split("/").at(-1)}`,
        type: "image/jpeg",
        roles: ["browse"],
      };
      return { ...metadataAssets, ...browseAsset };
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

const defaultExtractors = [
  browseAssets,
  thumbnailAssets,
  downloadAssets,
  metadataAssets,
  s3Assets,
  xmlMetadataAssets,
];

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

export const CMR_QUERY_MAX = Number(process.env.PAGE_SIZE);

const pointToQuery = (point: GeoJSONPoint) => point.coordinates.join(",");

const multiPointToQuery = (multiPoint: GeoJSONMultiPoint) =>
  multiPoint.coordinates.map((point) => flattenDeep(point).join(","));

const lineStringToQuery = (lineString: GeoJSONLineString) =>
  flattenDeep(lineString.coordinates).join(",");

const multiLineStringToQuery = (multiLine: GeoJSONMultiLineString) =>
  multiLine.coordinates.map((childLine) => flattenDeep(childLine).join(","));

const polygonToQuery = (polygon: GeoJSONPolygon) =>
  typeof polygon.coordinates === "string"
    ? polygon.coordinates
    : // outer polygon only, exclude holes
      flattenDeep(polygon.coordinates.at(0)).join(",");

const multiPolygonToQuery = (multiPolygon: GeoJSONMultiPolygon) =>
  multiPolygon.coordinates.map((childPolygon) => {
    // ignore holes, they are not supported yet
    const [outerChildPolygon] = childPolygon;
    return flattenDeep(outerChildPolygon).join(",");
  });

export const geoJsonToQuery = (
  geoJson: GeoJSONGeometryCollection | GeoJSONGeometry | string | string[]
): { polygon: string[]; line: string[]; point: string[] } => {
  const geometries = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygon, line, point] = geometries
    .map((geometry: object | string) =>
      typeof geometry === "string" ? JSON.parse(geometry) : geometry
    )
    .reduce(
      ([polygon, line, point], geometry: GeoJSONGeometry | GeoJSONGeometryCollection) => {
        switch (geometry.type.toLowerCase()) {
          case "point":
            return [polygon, line, [...point, pointToQuery(geometry as GeoJSONPoint)]];
          case "multipoint":
            return [polygon, line, [...point, ...multiPointToQuery(geometry as GeoJSONMultiPoint)]];
          case "linestring":
            return [polygon, [...line, lineStringToQuery(geometry as GeoJSONLineString)], point];
          case "multilinestring":
            return [
              polygon,
              [...line, ...multiLineStringToQuery(geometry as GeoJSONMultiLineString)],
              point,
            ];
          case "polygon":
            return [[...polygon, polygonToQuery(geometry as GeoJSONPolygon)], line, point];
          case "multipolygon":
            return [
              [...polygon, ...multiPolygonToQuery(geometry as GeoJSONMultiPolygon)],
              line,
              point,
            ];
          case "geometrycollection":
            return (geometry as GeoJSONGeometryCollection).geometries.reduce(
              ([accPolygons, accLines, accPoints], subGeometry) => {
                const {
                  polygon: subPolygons,
                  line: subLines,
                  point: subPoints,
                } = geoJsonToQuery(subGeometry);

                return [
                  [...accPolygons, ...subPolygons],
                  [...accLines, ...subLines],
                  [...accPoints, ...subPoints],
                ];
              },
              [polygon, line, point]
            );
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
export const sortByToSortKeys = (sortBys?: string | SortObject[] | string[]): string[] => {
  const baseSortKeys: string[] = parseSortFields(sortBys);

  return baseSortKeys.reduce((sortKeys, sortBy) => {
    if (!sortBy || sortBy.trim() === "") return sortKeys;

    const isDescending = sortBy.startsWith("-");
    const cleanSortBy = isDescending ? sortBy.slice(1) : sortBy;
    // Allow for `properties` prefix
    const fieldName = cleanSortBy.replace(/^properties\./, "");

    let mappedField;

    if (fieldName.match(/^eo:cloud_cover$/i)) {
      mappedField = "cloudCover";
    } else if (fieldName.match(/^id$/i)) {
      mappedField = "entryId";
    } else if (fieldName.match(/^title$/i)) {
      mappedField = "entryTitle";
    } else {
      mappedField = fieldName;
    }

    return [...sortKeys, isDescending ? `-${mappedField}` : mappedField];
  }, [] as string[]);
};

const sortKeyQuery = (_req: Request, query: StacQuery) => ({
  // Use the sortByToSortKeys function to convert STAC sortby to CMR sortKey
  sortKey: sortByToSortKeys(query.sortby),
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

  return { readableGranuleName: itemIds };
};

const cursorQuery = (_req: Request, query: StacQuery) => ({ cursor: query.cursor });

const freeTextQuery = (_req: Request, query: StacQuery) => ({ keyword: query.q });
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
const collectionsQuery = async (req: Request, query: StacQuery): Promise<{ entryId: string[] }> => {
  const {
    headers,
    params: { collectionId },
  } = req;
  const cloudHosted = headers["cloud-stac"] === "true";

  // query.collections could be a comma separated string of multiple collections.
  // Need to ensure this would be split out appropriately.
  if (query.collections && !Array.isArray(query.collections)) {
    query.collections = query.collections.split(",");
  }

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
    bboxQuery,
    cloudCoverQuery,
    collectionsQuery,
    cursorQuery,
    freeTextQuery,
    idsQuery,
    intersectsQuery,
    limitQuery,
    sortKeyQuery,
    temporalQuery,
  ];

  return await queryBuilders.reduce(
    async (partialQuery, queryBuilder) =>
      mergeMaybe(await partialQuery, await queryBuilder(req, query)),
    Promise.resolve({ provider } as GranulesInput)
  );
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
  handler: GraphQLHandler
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

  const timingMessage = `Outbound GQL query => ${gqlQuery} ${JSON.stringify(
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

    return { items: items, count, cursor };
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
