import { gql } from "graphql-request";

import { IncomingHttpHeaders } from "http";

import { Extents, Keywords, Links, STACCollection, Summaries } from "../@types/StacCollection";

import {
  Collection,
  CollectionBase,
  CollectionsInput,
  GraphQLHandler,
  GraphQLResults,
} from "../models/GraphQLModels";

import { cmrSpatialToExtent } from "./bounding-box";

import { extractAssets, MAX_SIGNED_INTEGER, paginateQuery } from "./stac";

const CMR_ROOT = process.env.CMR_URL;
const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const collectionsQuery = gql`
  query getCollections($params: CollectionsInput!) {
    collections(params: $params) {
      count
      cursor
      items {
        boxes
        conceptId
        description: abstract
        directDistributionInformation
        lines
        points
        polygons
        platforms
        provider
        relatedUrls
        scienceKeywords
        shortName
        timeEnd
        timeStart
        title
        useConstraints
        version
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
        shortName
        title
        version
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
 * Return a license string and license link for a collection;
 */
const extractLicense = (_collection: Collection) => {
  // See https://github.com/radiantearth/stac-spec/blob/master/collection-spec/collection-spec.md#license
  // license *should* be a SPDX string see https://spdx.org/licenses/ to be valid for STAC
  // const spdxLicenseRx = /^[\w\-\.\+]+$/gi;

  const licenseLink = {
    rel: "license",
    href: "https://science.nasa.gov/earth-science/earth-science-data/data-information-policy",
    title: "EOSDIS Data Use Policy",
    type: "text/html",
  };
  const license = "proprietary";

  return { license, licenseLink };
};

const generateCollectionLinks = (collection: Collection, links: Links) => {
  return [
    ...links,
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
};

const createKeywords = (collection: Collection): Keywords => {
  const { scienceKeywords } = collection;

  return scienceKeywords.reduce((keywordsArr: string[], scienceKeyword) => {
    return [
      ...keywordsArr,
      ...Object.values(scienceKeyword).filter((keyword) => !keywordsArr.includes(keyword)),
    ];
  }, []);
};

const createSummaries = (collection: Collection): Summaries => {
  const { platforms } = collection;
  interface Summaries {
    platform: string[];
    instruments: string[];
  }

  return platforms.reduce<Summaries>(
    (summaries, platform) => {
      const { platform: currPlatforms, instruments: currInstruments } = summaries;
      const { instruments, shortName } = platform;

      return {
        platform: [...currPlatforms, shortName],
        instruments: [
          ...currInstruments,
          ...instruments.map(({ shortName: instrumentShortName }) => instrumentShortName),
        ],
      };
    },
    { platform: [], instruments: [] }
  );
};

const generateProviders = (collection: Collection) => [
  {
    name: collection.provider,
    roles: ["producer"],
  },
  {
    name: "NASA EOSDIS",
    roles: ["host"],
  },
];

/**
 * Convert a GraphQL collection item into a STACCollection.
 */
export const collectionToStac = (collection: Collection): STACCollection => {
  const { description, title } = collection;

  const { license, licenseLink } = extractLicense(collection);

  const assets = extractAssets(collection);
  const extent = createExtent(collection);
  const id = collectionToId(collection);
  const keywords = createKeywords(collection);
  const links = generateCollectionLinks(collection, [licenseLink]);
  const provider = generateProviders(collection);
  const summaries = createSummaries(collection);

  return {
    type: "Collection",
    id,
    title,
    description,
    stac_version: STAC_VERSION,
    extent,
    assets,
    provider,
    links,
    license,
    keywords,
    summaries,
  } as STACCollection;
};

/**
 * Handler for collection queries.
 */
const collectionHandler: GraphQLHandler = (response: unknown) => {
  try {
    const {
      collections: { count, items, cursor },
    } = response as { collections: GraphQLResults };

    return [
      null,
      {
        count,
        cursor,
        items: (items as Collection[]).map(collectionToStac),
      },
    ];
  } catch (err) {
    return [(err as Error).message, null];
  }
};

/**
 * Get collections matching the params.
 */
export const getCollections = async (
  params: CollectionsInput,
  opts: { headers?: IncomingHttpHeaders } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: STACCollection[];
}> => {
  const {
    cursor,
    count,
    items: collections,
  } = await paginateQuery(collectionsQuery, params, opts, collectionHandler);
  return { cursor, count, items: collections as STACCollection[] };
};

/**
 * Return a STAC ID for a given collection.
 * STAC ID should correspond to a CMR entry_id
 * TODO: handle this type of situation ~> 10.3334/cdiac/otg.vos_alligatorhope_1999-2001_Not applicable as entry_id
 */
export const collectionToId = (collection: { shortName: string; version?: string | null }) => {
  const { shortName, version } = collection;
  return version ? `${shortName}_${version}` : shortName;
};

const attachId = (collection: { shortName: string; version?: string | null }) => ({
  ...collection,
  id: collectionToId(collection),
});

/**
 * Handler for collectionId queries to GraphQL.
 */
const collectionIdsHandler: GraphQLHandler = (response: unknown) => {
  try {
    const {
      collections: { count, items, cursor },
    } = response as { collections: GraphQLResults };

    return [null, { count, cursor, items: (items as CollectionBase[]).map(attachId) }];
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
    headers?: IncomingHttpHeaders;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: { id: string; title: string }[];
}> => {
  const {
    cursor,
    count,
    items: collectionIds,
  } = await paginateQuery(collectionIdsQuery, params, opts, collectionIdsHandler);
  return { cursor, count, items: collectionIds as { id: string; title: string }[] };
};

/**
 * Retrieves all collection ids.
 * @deprecated by CMR-8996
 */
export const getAllCollectionIds = async (
  params: CollectionsInput,
  opts: {
    headers?: IncomingHttpHeaders;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: { id: string; title: string }[];
}> => {
  params.limit = MAX_SIGNED_INTEGER;
  return await getCollectionIds(params, opts);
};
