import { gql, request } from "graphql-request";
import { Extents, AssetLinks, STACCollection } from "../@types/StacCollection";
import {
  Collection,
  CollectionsInput,
  FacetGroup,
} from "../models/GraphQLModels";
import { mergeMaybe, buildClientId } from "../utils";
import { cmrSpatialToExtent } from "./bounding-box";

const CMR_ROOT = process.env.CMR_URL;
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3003/api";

const collectionsQuery = gql`
  query getCollections($params: CollectionsInput!) {
    collections(params: $params) {
      count
      cursor
      items {
        conceptId
        provider
        shortName
        title
        abstract
        version

        polygons
        points
        lines
        boxes

        timeStart
        timeEnd

        useConstraints
        relatedUrls

        directDistributionInformation
      }
    }
  }
`;

const collectionIdsQuery = gql`
  query getCollections($params: CollectionsInput!) {
    collections(params: $params) {
      count
      cursor
      items {
        conceptId
      }
    }
  }
`;

const createExtent = (collection: Collection): Extents => {
  return {
    spatial: {
      bbox: [cmrSpatialToExtent(collection)],
    },
    temporal: {
      interval: [[collection.timeStart, collection.timeEnd]],
    },
  };
};

const extractAssets = (collection: any): AssetLinks => {
  const s3Info =
    collection.directDistributionInformation?.s3BucketAndObjectPrefixNames ??
    [];

  return s3Info
    .flatMap((s3Link: string) => s3Link.split(","))
    .map((s3Link: string) => s3Link.trim())
    .filter((s3Link: string) => s3Link !== "")
    .reduce((acc: AssetLinks, href: string) => {
      const assetTitle = href.replace("s3://", "").replace(/[\/\-:\.]/gi, "_");
      const newAsset: AssetLinks = {};
      newAsset[`s3_${assetTitle}`] = { href, roles: ["data"] };
      return { ...acc, ...newAsset };
    }, {});
};

/**
 * Convert a GraphQL collection item into a STACCollection.
 */
export const collectionToStac = (collection: any): STACCollection => {
  const extent = createExtent(collection);
  const assets = extractAssets(collection);

  return {
    type: "Collection",
    id: collection.conceptId,
    title: collection.title,
    description: collection["abstract"],
    license: collection.useConstraints?.description ?? "not-provided",
    stac_version: "1.0.0",
    extent,
    assets,
    links: [
      {
        rel: "about",
        href: `${CMR_ROOT}/search/concepts/${collection.conceptId}.html`,
        title: "HTML metadata for collection",
        type: "text/html",
      },
      {
        rel: "via",
        href: `${CMR_ROOT}/search/concepts/${collection.conceptId}.json`,
        title: "CMR JSON metadata for collection",
        type: "application/json",
      },
      {
        rel: "via",
        href: `${CMR_ROOT}/search/concepts/${collection.conceptId}.umm_json`,
        title: "CMR UMM_JSON metadata for collection",
        type: "application/vnd.nasa.cmr.umm+json",
      },
    ],
  };
};

export const getCollections = async (
  query: CollectionsInput,
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  facets: FacetGroup | null;
  cursor: string | null;
  items: STACCollection[];
}> => {
  const { headers = {} } = opts;

  const clientId = buildClientId(headers["client-id"]);
  const authorization = headers.authorization;

  const requestHeaders = mergeMaybe(
    { "client-id": clientId },
    { authorization }
  );

  console.debug("Outbound GQL collections query =>", query);
  const {
    collections: { count, cursor, items, facets },
  } = await request({
    url: GRAPHQL_URL,
    document: collectionsQuery,
    variables: { params: query },
    requestHeaders,
  });

  return { count, cursor, facets, items: items.map(collectionToStac) };
};

/**
 * Fetches only collectionIds.
 */
export const getCollectionIds = async (
  query: CollectionsInput,
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  conceptIds: String[];
}> => {
  let userClientId = "cmr-stac";
  let authorization;

  const { headers } = opts;
  if (headers) {
    userClientId = buildClientId(headers["client-id"]);
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe(
    { "client-id": userClientId },
    { authorization }
  );

  console.debug("Outbound GQL collectionIds query =>", query);
  const {
    collections: { count, cursor, items },
  } = await request({
    url: GRAPHQL_URL,
    document: collectionIdsQuery,
    variables: { params: query },
    requestHeaders,
  });

  const conceptIds = items.map((coll: { conceptId: string }) => coll.conceptId);

  return { count, cursor, conceptIds };
};
