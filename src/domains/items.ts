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
import { mergeMaybe } from "../utils";

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

const cmrBoxToGeoJsonPolygon = (box: string): number[][][] => {
  const [s, w, n, e] = parseOrdinateString(box) as number[];
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

const cmrPolygonToGeoJsonPolygon = (polygon: string[]) => {
  return polygon.map((ring: string) => pointStringToPoints(ring));
};

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

const cloudCoverExtension = (
  granule: Granule
): [string, { [key: string]: number | string }] | undefined => {
  if (granule.cloudCover === null) return;

  return [
    "https://stac-extensions.github.io/eo/v1.0.0/schema.json",
    { "eo:cloud_cover": granule.cloudCover },
  ];
};

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

const deriveExtensions = (
  granule: Granule
): [string[], { [key: string]: any }] => {
  const extensionBuilders = [cloudCoverExtension];

  const [extensions, props] = extensionBuilders.reduce(
    ([accExts, accProps], extBldr) => {
      const data = extBldr(granule);
      if (!data) return [accExts, accProps];

      const [newExt, newProps] = data;
      return [[...accExts, newExt], { ...accProps, ...newProps }];
    },
    [[] as string[], {}]
  );

  return [extensions.filter(filterUnique), props];
};

export const granuleToStac = (granule: Granule): STACItem => {
  const [stac_extensions, extensionProps] = deriveExtensions(granule);

  const properties = {
    datetime: granule.timeStart,
    start_datetime: granule.timeStart,
    end_datetime: granule.timeEnd,
    ...extensionProps,
  };

  const geometry = cmrSpatialToGeoJSONGeometry(granule);
  const bbox = granuleToBbox(granule);

  const item = {
    id: granule.conceptId,
    stac_version: STAC_VERSION,
    type: "Feature",
    stac_extensions,
    properties,
    geometry,
    bbox,
  } as STACItem;

  return { ...item, collection: granule.collectionConceptId };
};

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
    userClientId = headers["client-id"]
      ? `${headers["client-id"]}-cmr-stac`
      : "cmr-stac";
    authorization = headers.authorization;
  }

  const requestHeaders = mergeMaybe(
    { "client-id": userClientId },
    { authorization: authorization }
  );

  console.time("GQL items query took");
  console.debug("outbound gql items query =>", query);
  const {
    granules: { count, items, cursor, facets },
  } = await request(GRAPHQL_URL, granulesQuery, variables, requestHeaders);
  console.timeEnd("GQL items query took");

  return { facets, count, cursor, items: items.map(granuleToStac) };
};

export const addProviderLinks = (
  root: string,
  providerId: string,
  item: STACItem
): STACItem => {
  item.links = selfLinks(root, providerId, item);
  return item;
};
