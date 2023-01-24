import { gql, request } from "graphql-request";
import { Extents, AssetLinks, STACCollection } from "../@types/StacCollection";
import {
  Collection,
  CollectionsInput,
  FacetGroup,
} from "../models/GraphQLModels";
import { mergeMaybe, buildClientId, scrubTokens } from "../utils";
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

/**
 * Return an Extent object based on the the CMR spatial and temporal values.
 */
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

/**
 * Return a download asset if present.
 */
const downloadAsset = (collection: any) => {
  const dataLink = collection.relatedUrls?.find(
    (link: any) => link.rel === "http://esipfed.org/ns/fedsearch/1.1/data#"
  );

  if (dataLink) {
    return {
      data: { href: dataLink.href, title: "Direct Download" },
    };
  }
};

/**
 * Return a metadata asset if present.
 */
const metadataAsset = (collection: any) => {
  const metadataLink = collection.links?.find(
    (link: any) => link.rel === "http://esipfed.org/ns/fedsearch/1.1/metadata#"
  );

  if (metadataLink) {
    return {
      provider_metadata: {
        href: metadataLink.href,
        title: "Provider Metadata",
      },
    };
  }
};

/**
 * Return a thumbnail asset if present.
 */
const thumbnailAsset = (collection: any) => {
  const thumbnail = collection.relatedUrls?.find(
    (link: { type: string; url: string; [key: string]: any }) =>
      link.type === "GET RELATED VISUALIZATION"
  );

  if (thumbnail) {
    return {
      thumbnail: {
        href: thumbnail.url,
        title: "Thumbnail",
        roles: ["thumbnail"],
      },
    };
  }
};

/**
 * Return a map of S3 links as assets if present.
 */
const s3Assets = (collection: any) => {
  const s3Info =
    collection.directDistributionInformation?.s3BucketAndObjectPrefixNames ??
    [];

  return s3Info
    .flatMap((s3Link: string) => s3Link.split(","))
    .map((s3Link: string) => s3Link.trim())
    .filter((s3Link: string) => s3Link !== "")
    .reduce((acc: AssetLinks, href: string) => {
      const assetTitle = href.replace("s3://", "").replace(/[/\-:.]/gi, "_");
      const newAsset: AssetLinks = {};
      const s3Link = href.startsWith("s3://") ? href : `s3://${href}`;
      newAsset[`s3_${assetTitle}`] = { href: s3Link, roles: ["data"] };
      return { ...acc, ...newAsset };
    }, {});
};

const extractAssets = (
  collection: any,
  assetExtractors: ((c: any) => AssetLinks)[]
): AssetLinks => {
  return assetExtractors.reduce(
    (accAssets, extract) => mergeMaybe(accAssets, extract(collection)),
    {} as AssetLinks
  );
};

/**
 * Convert a GraphQL collection item into a STACCollection.
 */
export const collectionToStac = (collection: any): STACCollection => {
  const assetExtractors = [
    downloadAsset,
    metadataAsset,
    thumbnailAsset,
    s3Assets,
  ];

  const extent = createExtent(collection);
  const assets = extractAssets(collection, assetExtractors);

  const links = [
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
  ];

  return {
    type: "Collection",
    id: collection.conceptId,
    title: collection.title,
    description: collection["abstract"],
    license: collection.useConstraints?.description ?? "not-provided",
    stac_version: "1.0.0",
    extent,
    assets,
    links,
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

  const timingMessage = `Outbound GQL collections query => ${JSON.stringify(
    query,
    null,
    2
  )} ${JSON.stringify(scrubTokens(requestHeaders), null, 2)}`;
  console.time(timingMessage);
  const {
    collections: { count, cursor, items, facets },
  } = await request({
    url: GRAPHQL_URL,
    document: collectionsQuery,
    variables: { params: query },
    requestHeaders,
  });
  console.timeEnd(timingMessage);

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
  conceptIds: string[];
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

  const timingMessage = `Outbound GQL collectionIds query => ${JSON.stringify(
    query,
    null,
    2
  )} ${JSON.stringify(scrubTokens(requestHeaders), null, 2)}`;
  console.time(timingMessage);
  const {
    collections: { count, cursor, items },
  } = await request({
    url: GRAPHQL_URL,
    document: collectionIdsQuery,
    variables: { params: query },
    requestHeaders,
  });
  console.timeEnd(timingMessage);

  const conceptIds = items.map((coll: { conceptId: string }) => coll.conceptId);

  return { count, cursor, conceptIds };
};
