import { gql } from "graphql-request";
import { Extents, AssetLinks, STACCollection } from "../@types/StacCollection";
import { Collection, CollectionsInput } from "../models/GraphQLModels";
import { cmrSpatialToExtent } from "./bounding-box";
import { mergeMaybe } from "../utils";
import { MAX_SIGNED_INTEGER, paginateQuery, GraphQLHandler } from "./stacQuery";

const CMR_ROOT = process.env.CMR_URL;
const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

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
  query getCollectionsIds($params: CollectionsInput!) {
    collections(params: $params) {
      count
      cursor
      items {
        conceptId
        title
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

const extractLicense = (collection: any) => {
  // See https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#license
  // license *should* be a SPDX string see https://spdx.org/licenses/ to be valid for STAC
  const spdxLicenseRx = /^[\w\-\.\+]+$/gi;

  let licenseLink = {
    rel: "license",
    href: "https://science.nasa.gov/earth-science/earth-science-data/data-information-policy",
    title: "EOSDIS Data Use Policy",
    type: "text/html",
  };
  const license = "proprietary";

  // TODO this misses valid licenses
  return { license, licenseLink };
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
      href: `${CMR_ROOT}/search/concepts/${collection.conceptId}.native`,
      title: "Native metadata for collection",
      type: "application/xml",
    },
    {
      rel: "via",
      href: `${CMR_ROOT}/search/concepts/${collection.conceptId}.echo10`,
      title: "ECHO10 metadata for collection",
      type: "application/echo10+xml",
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

  const provider = [
    {
      name: collection.conceptId?.split("-")[1] ?? "CMR",
      roles: collection.conceptId ? ["producer"] : ["host"],
    },
  ];

  const { license, licenseLink } = extractLicense(collection);

  links.push(licenseLink);

  return {
    type: "Collection",
    id: collection.conceptId,
    title: collection.title,
    description: collection["abstract"],
    stac_version: STAC_VERSION,
    extent,
    assets,
    provider,
    links,
    license,
  } as STACCollection;
};

const collectionHandler: GraphQLHandler = (response: any) => {
  try {
    const {
      collections: { count, items, cursor },
    } = response;

    return [
      null,
      {
        count,
        cursor,
        items: items.map(collectionToStac),
      },
    ];
  } catch (err) {
    return [(err as Error).message, null];
  }
};

export const getCollections = async (
  params: CollectionsInput,
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: STACCollection[];
}> => {
  return await paginateQuery(collectionsQuery, params, opts, collectionHandler);
};

const collectionIdsHandler: GraphQLHandler = (response: any) => {
  try {
    const {
      collections: { count, items, cursor },
    } = response;

    return [
      null,
      {
        count,
        cursor,
        items,
      },
    ];
  } catch (err) {
    return [(err as Error).message, null];
  }
};

/**
 * Fetches only collectionIds.
 */
export const getCollectionIds = async (
  params: CollectionsInput,
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: { conceptId: string; title: string }[];
}> => {
  return await paginateQuery(
    collectionIdsQuery,
    params,
    opts,
    collectionIdsHandler
  );
};

export const getAllCollectionIds = async (
  params: CollectionsInput,
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: { conceptId: string; title: string }[];
}> => {
  params.limit = MAX_SIGNED_INTEGER;
  return await getCollectionIds(params, opts);
};
