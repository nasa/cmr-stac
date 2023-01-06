import { gql, request } from "graphql-request";

import { STACItem } from "../@types/StacItem";
import { Granule, GranulesInput, FacetGroup } from "../models/GraphQLModels";

import { cmrSpatialToExtent } from "./bounding-box";
import { cmrSpatialToGeoJSONGeometry } from "./geojson";
import { mergeMaybe, buildClientId } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";
const GRAPHQL_URL = process.env.GRAPHQL_URL!;

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

const filterUnique = (val: string, idx: number, arr: string[]) =>
  arr.indexOf(val) === idx;

/**
 * Return the cloudCover extension schema and properties for a granule.
 */
const cloudCoverExtension = (
  granule: Granule
): [string, { [key: string]: any }] | undefined => {
  if (granule.cloudCover === null || granule.cloudCover === undefined) return;

  return [
    "https://stac-extensions.github.io/eo/v1.0.0/schema.json",
    { "eo:cloud_cover": granule.cloudCover },
  ];
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
  extensionBuilders: Function[]
): [string[], { [key: string]: any }] => {
  const [extensions, props] = extensionBuilders.reduce(
    ([accExtensions, accProps], extBldr) => {
      const data = extBldr(granule);
      if (!data) return [accExtensions, accProps];

      const [newExt, newProps] = data;
      return [[...accExtensions, newExt], { ...accProps, ...newProps }];
    },
    [[] as string[], {}]
  );

  return [extensions.filter(filterUnique), props];
};

/**
 * Convert a granule to a STAC Item.
 */
export const granuleToStac = (granule: Granule): STACItem => {
  const [stacExtensions, extensionProps] = deriveExtensions(granule, [
    cloudCoverExtension,
  ]);

  const properties = {
    datetime: granule.timeStart,
    start_datetime: granule.timeStart,
    end_datetime: granule.timeEnd,
    ...extensionProps,
  };

  const geometry = cmrSpatialToGeoJSONGeometry(granule);
  const bbox = cmrSpatialToExtent(granule);

  const item = {
    type: "Feature",
    id: granule.conceptId,
    stac_version: STAC_VERSION,
    stac_extensions: stacExtensions,
    properties,
    geometry,
    bbox,
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
  } = {}
): Promise<{
  count: number;
  cursor: string | null;
  items: STACItem[];
  facets: FacetGroup | null;
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

  console.time("GQL items query took");
  console.debug("outbound gql items query =>", query);
  const {
    granules: { count, items, cursor, facets },
  } = await request(GRAPHQL_URL, granulesQuery, variables, requestHeaders);
  console.timeEnd("GQL items query took");

  return { facets, count, cursor, items: items.map(granuleToStac) };
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

  return item;
};
