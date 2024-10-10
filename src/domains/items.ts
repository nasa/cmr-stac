import { Request } from "express";
import { IncomingHttpHeaders } from "http";
import { gql } from "graphql-request";

import { AssetLinks, STACItem } from "../@types/StacItem";
import { Granule, GranulesInput, GraphQLHandler, GraphQLResults } from "../models/GraphQLModels";
import { StacExtension, StacExtensions } from "../models/StacModels";

import { cmrSpatialToExtent } from "./bounding-box";
import { cmrSpatialToGeoJSONGeometry } from "./geojson";
import { mergeMaybe, stacContext } from "../utils";
import { extractAssets, paginateQuery } from "./stac";
import { collectionToId } from "./collections";
import { ItemNotFound } from "../models/errors";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";
const CMR_URL = process.env.CMR_URL;

const granulesQuery = gql`
  query getGranules($params: GranulesInput) {
    granules(params: $params) {
      count
      cursor
      items {
        title
        conceptId
        collection {
          conceptId
          shortName
          version
          title
        }
        cloudCover
        lines
        boxes
        polygons
        points
        links
        timeStart
        timeEnd
        relatedUrls
      }
    }
  }
`;

const granuleIdsQuery = gql`
  query getGranules($params: GranulesInput) {
    granules(params: $params) {
      count
      cursor
      items {
        conceptId
        title
      }
    }
  }
`;

const filterUnique = (val: string, idx: number, arr: string[]) => arr.indexOf(val) === idx;

/**
 * Return the cloudCover extension schema and properties for a granule.
 */
const cloudCoverExtension = (granule: Granule) => {
  // purposely using ==
  if (granule.cloudCover == null) return;
  return {
    extension: "https://stac-extensions.github.io/eo/v1.0.0/schema.json",
    properties: { "eo:cloud_cover": granule.cloudCover },
  };
};

/**
 * Return the CMR extension schema and properties for a granule.
 */
const cmrGranuleExtension = (granule: Granule) => {
  return {
    extension: "https://stac-extensions.github.io/cmr/v0.0.0/schema.json",
    properties: {
      "cmr:provider": granule.collection?.conceptId.split("-")[1],
      "cmr:collection_id": granule.collection?.conceptId,
      "cmr:concept_id": granule.conceptId
    },
  };
};

/**
 * Returns the self-links for a STACItem.
 *
 * @param root URL root of the STAC catalog.
 * @param providerId Provider ID
 * @param item The STAC Item
 */
const selfLinks = (req: Request, item: STACItem) => {
  const { provider } = req;
  const { stacRoot } = stacContext(req);

  if (!provider) {
    throw new ItemNotFound("No provider detected in path.");
  }

  const { id, collection } = item;

  const providerId = provider["provider-id"];
  const itemId = encodeURIComponent(id);
  const collectionId = encodeURIComponent(collection as string);

  return [
    {
      rel: "self",
      href: `${stacRoot}/${providerId}/collections/${collectionId}/items/${itemId}`,
      type: "application/geo+json",
    },
    {
      rel: "parent",
      href: `${stacRoot}/${providerId}/collections/${collectionId}/`,
      type: "application/geo+json",
    },
    {
      rel: "collection",
      href: `${stacRoot}/${providerId}/collections/${collectionId}/`,
      type: "application/geo+json",
    },
    {
      rel: "root",
      href: `${stacRoot}`,
      type: "application/json",
    },
    {
      rel: "provider",
      href: `${stacRoot}/${providerId}`,
      type: "application/json",
    },
  ];
};

/**
 * Build a list of STAC extensions and properties for the given granule.
 *
 * Extension builder functions must take a granule as input and
 * should return an array with the Schema of the extension
 * as the first element, and the associated property map as the second.
 *
 * @example
 * deriveExtensions(granule, [cloudCoverBldr, projectionBldr]) =>
 * [
 *    ["https://stac-extensions.github.io/eo/v1.0.0/schema.json",
 *     "https://stac-extensions.github.io/projection/v1.0.0/schema.json"],
 *   { "eo:cloud_cover": 50,
 *     "proj:epsg" : 32659
 *     "proj:shape" : [ 5558, 9559 ]}
 * ]
 */
const deriveExtensions = (
  granule: Granule,
  extensionBuilders: ((g: Granule) => StacExtension | undefined)[]
): StacExtensions => {
  return extensionBuilders.reduce(
    ({ extensions, properties }, extBldr) => {
      const ext = extBldr(granule);
      if (!ext) return { extensions, properties };

      return {
        extensions: [...extensions, ext.extension].filter(filterUnique),
        properties: mergeMaybe(properties, ext.properties),
      };
    },
    { extensions: [], properties: {} } as StacExtensions
  );
};

/**
 * Convert a granule to a STAC Item.
 */
export const granuleToStac = (granule: Granule): STACItem => {
  if (!granule.collection) {
    throw new Error(`Cannot have a granule without a collection, [${granule.conceptId}]`);
  }

  const { extensions, properties: extensionProperties } = deriveExtensions(granule, [
    cloudCoverExtension,
    cmrGranuleExtension
  ]);

  const properties: { [key: string]: string } = mergeMaybe(
    {},
    {
      datetime: granule.timeStart,
      ...extensionProperties,
    }
  );

  if (granule.timeStart && granule.timeEnd) {
    // BOTH are required if available
    properties.start_datetime = granule.timeStart;
    properties.end_datetime = granule.timeEnd;
  }

  const geometry = cmrSpatialToGeoJSONGeometry(granule);
  const bbox = cmrSpatialToExtent(granule);
  const assets: AssetLinks = extractAssets(granule);

  const links = [
    {
      rel: "via",
      href: `${CMR_URL}/search/concepts/${granule.conceptId}.json`,
      title: "CMR JSON metadata for item",
      type: "application/json",
    },
    {
      rel: "via",
      href: `${CMR_URL}/search/concepts/${granule.conceptId}.umm_json`,
      title: "CMR UMM_JSON metadata for item",
      type: "application/vnd.nasa.cmr.umm+json",
    },
  ];

  // core STACItem
  const item = {
    type: "Feature",
    id: granule.title,
    stac_version: STAC_VERSION,
    stac_extensions: extensions,
    properties,
    geometry,
    bbox,
    assets,
    links,
  } as STACItem;

  return {
    ...item,
    collection: collectionToId(granule.collection),
  };
};

const granulesQueryHandler: GraphQLHandler = (response: unknown) => {
  try {
    const {
      granules: { count, items, cursor },
    } = response as { granules: GraphQLResults };

    return [
      null,
      {
        count,
        cursor,
        items: (items as Granule[]).map(granuleToStac),
      },
    ];
  } catch (err) {
    return [(err as Error).message, null];
  }
};

/**
 * Return an object containing list of STAC Items matching the given query.
 */
export const getItems = async (
  params: GranulesInput,
  opts: {
    headers?: IncomingHttpHeaders;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: STACItem[];
}> => {
  const { count, cursor, items } = await paginateQuery(
    granulesQuery,
    params,
    opts,
    granulesQueryHandler
  );
  return { count, cursor, items: items as STACItem[] };
};

const granuleIdsQueryHandler: GraphQLHandler = (response: unknown) => {
  try {
    const {
      granules: { count, items, cursor },
    } = response as { granules: GraphQLResults };

    return [
      null,
      {
        count,
        cursor,
        items: items as Granule[],
      },
    ];
  } catch (err) {
    return [(err as Error).message, null];
  }
};

/**
 * Return an object containing list of STAC Items Ids matching the given query.
 */
export const getItemIds = async (
  params: GranulesInput,
  opts: {
    headers?: { "client-id"?: string; authorization?: string };
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  ids: string[];
}> => {
  const { count, cursor, items } = await paginateQuery(
    granuleIdsQuery,
    params,
    opts,
    granuleIdsQueryHandler
  );

  return { count, cursor, ids: items as string[] };
};

/**
 * Add or append self links to an item.
 */
export const addProviderLinks = (req: Request, item: STACItem): STACItem => {
  const providerLinks = selfLinks(req, item);

  item.links = [...providerLinks, ...(item.links ?? [])];

  return item;
};
