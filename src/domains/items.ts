import { chunk } from "lodash";
import { gql, request } from "graphql-request";

import { SpatialExtent } from "../@types/StacCollection";
import { STACItem, GeoJSONGeometry } from "../@types/StacItem";

import { Granule, GranulesInput, FacetGroup } from "../models/GraphQLModels";
import { inflectBox } from "./geodeticCoordinates";
import {
  WHOLE_WORLD_BBOX,
  addPointsToBbox,
  mergeBoxes,
  parseOrdinateString,
  pointStringToPoints,
  reorderBoxValues,
} from "./bounding-box";
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

/**
 * Convert a 2D bbox string into GeoJSON Polygon coordinates format.
 */
const cmrBoxToGeoJsonPolygon = (box: string): number[][][] => {
  const coordinates = parseOrdinateString(box) as number[];
  // a 6 coordinate box is technically valid if elevation is included but CMR only supports 2d boxes
  if (coordinates.length !== 4)
    throw new Error(
      `Invalid bbox [${box}], exactly 4 coordinates are required.`
    );

  const [s, w, n, e] = coordinates;
  return [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ];
};

/**
 * Convert a polygon string into a GeoJSON Polygon coordinates.
 */
const cmrPolygonToGeoJsonPolygon = (polygon: string[]) => {
  return polygon.map((ring: string) => pointStringToPoints(ring));
};

/**
 * Convert an array of polygon strings into a GeoJSON geometry.
 */
const granPolyConverter = (polygons: string[][]): GeoJSONGeometry | null => {
  const geometry = polygons.map(cmrPolygonToGeoJsonPolygon);

  if (geometry.length > 1) {
    return {
      type: "MultiPolygon",
      coordinates: geometry,
    } as GeoJSONGeometry;
  }

  if (geometry.length === 1) {
    return {
      type: "Polygon",
      coordinates: geometry[0],
    } as GeoJSONGeometry;
  }

  return null;
};

/**
 * Convert an array of boxes to a GeoJSON Geometry.
 *
 * @example
 * granBoxConverter([
 *   "26.685 15.016 47.471 46.31"
 * ])
 */
const granBoxConverter = (boxes: string[]): GeoJSONGeometry | null => {
  const geometries = boxes.map(cmrBoxToGeoJsonPolygon);

  if (geometries.length > 1) {
    return {
      type: "MultiPolygon",
      coordinates: geometries,
    } as GeoJSONGeometry;
  }

  if (geometries.length === 1) {
    return {
      type: "Polygon",
      coordinates: geometries[0],
    } as GeoJSONGeometry;
  }
  return null;
};

/**
 * Convert an array of points into a GeoJSON Geometry.
 */
const granPointsConverter = (points: string[]): GeoJSONGeometry | null => {
  const geometries = points.map((ps) => {
    const [lat, lon] = parseOrdinateString(ps);
    return [lon, lat];
  });

  if (geometries.length > 1) {
    return {
      type: "MultiPoint",
      coordinates: geometries,
    } as GeoJSONGeometry;
  }

  if (geometries.length === 1) {
    return {
      type: "Point",
      coordinates: geometries[0],
    } as GeoJSONGeometry;
  }

  return null;
};

/**
 * Convert an array of lines to GeoJSON Geometry.
 */
const granLinesConverter = (lines: string[]): GeoJSONGeometry | null => {
  const geometry = lines
    .map(parseOrdinateString)
    .map((line) => chunk(line, 2).map(([lat, lon]) => [lon, lat]));

  if (geometry.length > 1) {
    return {
      type: "MultiLineString",
      coordinates: geometry,
    } as GeoJSONGeometry;
  }

  if (geometry.length === 1) {
    return {
      type: "LineString",
      coordinates: geometry[0],
    } as GeoJSONGeometry;
  }
  return null;
};

/**
 * Create a GeoJSON geometry from a granule.
 *
 * May return null if no applicable geometry data exists.
 */
const cmrSpatialToGeoJSONGeometry = (gran: Granule): GeoJSONGeometry | null => {
  const { boxes, lines, polygons, points } = gran;

  if (polygons) return granPolyConverter(polygons);
  if (boxes) return granBoxConverter(boxes);
  if (points) return granPointsConverter(points);
  if (lines) return granLinesConverter(lines);

  console.debug(
    `Spatial system unknown or missing in concept [${gran.conceptId}]`
  );
  return null;
};

/**
 * Create a Bbox from a granule' geospatial data.
 * If the granule has no applicable geometry, the entire world bbox is returned.
 */
const granuleToBbox = (granule: Granule): SpatialExtent | null => {
  if (granule.polygons) {
    let points = granule.polygons
      .flatMap((ring) => ring.flatMap(pointStringToPoints))
      .map(([lon, lat]) => [lat, lon]);
    const inflectedPoints = inflectBox(points).map((point) =>
      parseFloat(point.toFixed(6))
    );
    return reorderBoxValues(inflectedPoints) as SpatialExtent;
  }

  if (granule.points) {
    const points = granule.points.map(parseOrdinateString);
    const orderedPoints = points.map(([lat, lon]) => [lon, lat]);
    return addPointsToBbox(null, orderedPoints) as SpatialExtent;
  }

  if (granule.lines) {
    const points = granule.lines
      .flatMap(pointStringToPoints)
      .map(([lon, lat]) => [lat, lon]);

    return addPointsToBbox(null, points) as SpatialExtent;
  }

  if (granule.boxes) {
    return granule.boxes.reduce(
      (box, boxStr) =>
        mergeBoxes(
          box,
          reorderBoxValues(parseOrdinateString(boxStr))
        ) as SpatialExtent,
      null as SpatialExtent
    ) as SpatialExtent;
  }

  return WHOLE_WORLD_BBOX as SpatialExtent;
};

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
  const bbox = granuleToBbox(granule);

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

  if (Array.isArray(item.links)) {
    item.links = [...item.links, ...providerLinks];
  } else {
    item.links = providerLinks;
  }

  return item;
};
