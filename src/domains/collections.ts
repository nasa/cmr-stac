import { gql, request } from "graphql-request";
import {
  Extents,
  SpatialExtent,
  STACCollection,
} from "../@types/StacCollection";
import {
  Collection,
  CollectionsInput,
  FacetGroup,
} from "../models/GraphQLModels";
import { mergeMaybe } from "../utils";

const CMR_ROOT = process.env.CMR_URL;

import {
  WHOLE_WORLD_BBOX,
  pointStringToPoints,
  parseOrdinateString,
  addPointsToBbox,
  mergeBoxes,
  reorderBoxValues,
} from "./bounding-box";

const GRAPHQL_URL = process.env.GRAPHQL_URL ?? "http://localhost:3002/api";

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
      }
    }
  }
`;

export const cmrCollSpatialToExtents = (
  collection: Collection
): SpatialExtent => {
  if (collection.polygons) {
    return collection.polygons
      .map((rings: any) => rings[0])
      .map(pointStringToPoints)
      .reduce(addPointsToBbox, []);
  }

  if (collection.points) {
    const points: number[][] = collection.points.map(parseOrdinateString);
    const orderedPoints = points.map((point) => [point[1], point[0]]);
    return addPointsToBbox(null, orderedPoints) as SpatialExtent;
  }

  if (collection.lines) {
    const linePoints = collection.lines.map(parseOrdinateString);
    const orderedLines = linePoints.map(reorderBoxValues);
    return orderedLines.reduce(
      (box: SpatialExtent, line: any) => mergeBoxes(box, line),
      null as SpatialExtent
    );
  }

  if (collection.boxes) {
    return collection.boxes.reduce(
      (box: SpatialExtent, boxStr: string) =>
        mergeBoxes(box, reorderBoxValues(parseOrdinateString(boxStr))),
      []
    );
  }

  return WHOLE_WORLD_BBOX as SpatialExtent;
};

const createExtent = (collection: Collection): Extents => {
  return {
    spatial: {
      bbox: [cmrCollSpatialToExtents(collection)],
    },
    temporal: {
      interval: [[collection.timeStart, collection.timeEnd]],
    },
  };
};

export const collectionToStac = (collection: any): STACCollection => {
  const extent = createExtent(collection);
  return {
    type: "Collection",
    id: collection.conceptId,
    title: collection.title,
    description: collection["abstract"],
    license: collection.useConstraints?.description ?? "not-provided",
    stac_version: "1.0.0",
    extent,
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
  let userClientId = "cmr-stac";
  let authorization;

  const { headers } = opts;
  if (headers) {
    userClientId = headers["client-id"]
      ? `${headers["client-id"]}-cmr-stac`
      : "cmr-stac";
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe(
    { "client-id": userClientId },
    { authorization: authorization }
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