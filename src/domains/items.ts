import { gql, request } from "graphql-request";

import { AssetLinks, STACItem } from "../@types/StacItem";
import { Granule, GranulesInput, FacetGroup } from "../models/GraphQLModels";
import { StacExtension, StacExtensions } from "../models/StacModels";

import { cmrSpatialToExtent } from "./bounding-box";
import { cmrSpatialToGeoJSONGeometry } from "./geojson";
import { mergeMaybe, buildClientId, scrubTokens } from "../utils";
import { CMR_QUERY_MAX } from "./stacQuery";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";
const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3013";
const CMR_URL = process.env.CMR_URL;

const granulesQuery = gql`
  query getGranules($params: GranulesInput) {
    granules(params: $params) {
      count
      cursor
      items {
        title
        conceptId
        collectionConceptId
        cloudCover
        lines
        boxes
        polygons
        points
        links
        timeStart
        timeEnd
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
      }
    }
  }
`;

const filterUnique = (val: string, idx: number, arr: string[]) =>
  arr.indexOf(val) === idx;

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
 * Returns the self-links for a STACItem.
 *
 * @param root URL root of the STAC catalog.
 * @param providerId Provider ID
 * @param item The STAC Item
 */
const selfLinks = (root: string, providerId: string, item: STACItem) => {
  return [
    {
      rel: "self",
      href: `${root}/${providerId}/collections/${item.collection}/items/${item.id}`,
    },
    {
      rel: "parent",
      href: `${root}/${providerId}/collections/${item.collection}`,
    },
    {
      rel: "collection",
      href: `${root}/${providerId}/collections/${item.collection}`,
    },
    {
      rel: "root",
      href: `${root}`,
    },
    {
      rel: "provider",
      href: `${root}/${providerId}`,
    },
    {
      rel: "via",
      href: `${root}/search/concepts/${item.id}.json`,
      title: "CMR JSON metadata for item",
      type: "application/json",
    },
    {
      rel: "via",
      href: `${root}/search/concepts/${item.id}.umm_json`,
      title: "CMR UMM_JSON metadata for item",
      type: "application/vnd.nasa.cmr.umm+json",
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
  const { extensions, properties: extProps } = deriveExtensions(granule, [
    cloudCoverExtension,
  ]);

  const properties: { [key: string]: string } = mergeMaybe(
    {},
    {
      datetime: granule.timeStart,
      ...extProps,
    }
  );

  if (granule.timeStart && granule.timeEnd) {
    // BOTH are required if available
    properties.start_datetime = granule.timeStart;
    properties.end_datetime = granule.timeEnd;
  }

  const geometry = cmrSpatialToGeoJSONGeometry(granule);
  const bbox = cmrSpatialToExtent(granule);

  let assets: AssetLinks = {};

  const dataLink = granule.links?.find(
    (link: any) => link.rel === "http://esipfed.org/ns/fedsearch/1.1/data#"
  );
  if (dataLink) {
    assets = mergeMaybe(assets, {
      data: { href: dataLink.href, title: "Direct Download" },
    });
  }

  const metadataLink = granule.links?.find(
    (link: any) => link.rel === "http://esipfed.org/ns/fedsearch/1.1/metadata#"
  );

  if (metadataLink) {
    assets = mergeMaybe(assets, {
      provider_metadata: {
        href: metadataLink.href,
        title: "Provider Metadata",
      },
    });
  }

  // core STACItem
  const item = {
    type: "Feature",
    id: granule.conceptId,
    stac_version: STAC_VERSION,
    stac_extensions: extensions,
    properties,
    geometry,
    bbox,
    assets,
  } as STACItem;

  return { ...item, collection: granule.collectionConceptId };
};

/**
 * Return an object containing list of STAC Items matching the given query.
 */
export const getItems = async (
  query: GranulesInput = {},
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {},
  prevItems: STACItem[] = []
): Promise<{
  count: number;
  cursor: string | null;
  items: STACItem[];
  facets: FacetGroup | null;
}> => {
  const paginatedQuery = { ...query };
  if (paginatedQuery.limit != null) {
    paginatedQuery.limit = Math.min(query.limit!, CMR_QUERY_MAX);
  }
  const variables = { params: { ...paginatedQuery } };

  const { headers } = opts;

  let userClientId, authorization;
  if (headers) {
    userClientId = buildClientId(headers["client-id"]);
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe(
    {},
    {
      "client-id": userClientId,
      authorization,
    }
  );

  const timingMessage = `Outbound GQL items query => ${JSON.stringify(
    paginatedQuery,
    null,
    2
  )} ${JSON.stringify(scrubTokens(headers), null, 2)}`;

  try {
    console.time(timingMessage);
    const {
      granules: { count, items, cursor },
    } = await request(GRAPHQL_URL, granulesQuery, variables, requestHeaders);

    const totalItems = [...prevItems, ...items.map(granuleToStac)];

    const moreResultsAvailable = !!cursor;
    const foundEnoughItems = totalItems.length >= (query.limit ?? -1);

    if (!foundEnoughItems && moreResultsAvailable) {
      const nextQuery = { ...query, cursor };
      return await getItems(nextQuery, opts, totalItems);
    }

    return { items: totalItems, count, facets: null, cursor };
  } catch (err: any) {
    if (err.response?.status === 200) {
      const errors = err.response.errors
        .map((e: any) => e.message)
        .filter((msg: any) => msg)
        .reduce(
          (errs: string[], errMsg: string) => [...errs, errMsg],
          [] as string[]
        );
      console.info(
        `An invalid collections query was provided. ${errors.join(" ")}`
      );
      return { count: 0, cursor: null, items: [], facets: null };
    } else {
      throw err;
    }
    return { items: [], count: 0, facets: null, cursor: null };
  } finally {
    console.timeEnd(timingMessage);
  }
};

/**
 * Return an object containing list of STAC Items Ids matching the given query.
 */
export const getItemIds = async (
  query: GranulesInput = {},
  opts: {
    headers?: { "client-id"?: string; [key: string]: any };
    [key: string]: any;
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  conceptIds: string[];
}> => {
  const variables = { params: { ...query } };

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

  const timingMessage = `Outbound GQL item Ids query => ${JSON.stringify(
    query,
    null,
    2
  )}\n ${JSON.stringify(scrubTokens(requestHeaders), null, 2)}`;

  const {
    granules: { count, items, cursor },
  } = await request(GRAPHQL_URL, granuleIdsQuery, variables, requestHeaders);
  console.timeEnd(timingMessage);

  const conceptIds = items.map((item: { conceptId: string }) => item.conceptId);

  return { count, cursor, conceptIds };
};

/**
 * Add or append self links to an item.
 */
export const addProviderLinks = (
  root: string,
  providerId: string,
  item: STACItem
): STACItem => {
  const providerLinks = selfLinks(root, providerId, item);

  item.links = Array.isArray(item.links)
    ? [...item.links, ...providerLinks]
    : providerLinks;

  item.assets = mergeMaybe(item.assets, {
    metadata: {
      href: `${CMR_URL}/search/concepts/${item.id}.json`,
      title: "Metadata",
      type: "application/json",
    },
  });

  return item;
};
