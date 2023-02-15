import { chunk } from "lodash";
import { SpatialExtent } from "../@types/StacCollection";
import { Collection, Granule } from "../models/GraphQLModels";

const { max, min } = Math;

export const WHOLE_WORLD_BBOX_CMR: SpatialExtent = [-90, -180, 90, 180];
export const WHOLE_WORLD_BBOX_STAC: SpatialExtent = [-180, -90, 180, 90];

/**
 * Convert box coordintes between CMR format and GeoJSON.
 * See https://www.rfc-editor.org/rfc/rfc7946#section-5
 *
 * @param cmrBox Bounding box in CMR order [S, E, N, W]
 * @returns Bounding box in GeoJSON order [E, S, W, N]
 */
export const reorderBoxValues = (cmrBox: SpatialExtent) => {
  if (!cmrBox) return null;

  let east, west, north, south;

  if (cmrBox.length === 6) {
    // CMR doesn't currently support 3d bounding boxes but handle it just in case
    // extra comma and spaces are intentional placeholders for elevation values
    [south, east /* elevation */, , north, west /* elevation */] = cmrBox;
  }

  if (cmrBox.length === 4) {
    [south, east, north, west] = cmrBox;
  }

  if (east) return [east, south, west, north];
  else return null;
};

/**
 * Determines whether a bounding box crosses over the antimeridian
 *
 * @param bbox in STAC/GeoJSON `[E, S, W, N]` format
 * @returns true if the box crosses the antimeridian, false otherwise
 */
export const crossesAntimeridian = (bbox: SpatialExtent) => {
  if (!bbox) return false;
  if (bbox.length === 6) {
    // 3d bbox
    return bbox[0] > bbox[3];
  }
  // 2d bbox
  return bbox[0] > bbox[2];
};

/**
 *
 * @param bbox - An array of float coordinates in the format `[E, S, W, N]`
 * @param points - A single or array of coordinate objects
 * @returns SpatialExtent - A single array of float coordinates in the format `[E, S, W, N]`
 */
export const addPointsToBbox = (
  bbox: SpatialExtent,
  points: { lat: number; lon: number }[] | { lat: number; lon: number }
) => {
  const pointsList = Array.isArray(points) ? [...points] : [points];

  return pointsList
    .map(({ lon, lat }) => [lon, lat, lon, lat] as SpatialExtent)
    .reduce((extent: SpatialExtent, box: SpatialExtent) => {
      return mergeBoxes(extent, box);
    }, bbox);
};

/**
 * Join two bounding boxes to create a single box that is the minimal bounding box
 * encompassing the two.
 *
 * @param box1 - A bounding-box array of floats in the `[W, S, E, N]` format
 * @param box2 - A bounding-box array of floats in the `[W, S, E, N]` format
 * @returns SpatialExtent - A single combined bounding-box in the `[W, S, E, N]` format
 */
export const mergeBoxes = (
  box1: SpatialExtent,
  box2: SpatialExtent
): SpatialExtent => {
  if ((!box1 || box1.length < 4) && (!box2 || box2.length < 4)) {
    return null;
  }
  if (!box1 || box1.length < 4) {
    return box2;
  }
  if (!box2 || box2.length < 4) {
    return box1;
  }
  let w;
  let e;
  if (crossesAntimeridian(box1) && crossesAntimeridian(box2)) {
    // both cross the antimeridian
    w = min(box1[0], box2[0]);
    e = max(box1[2], box2[2]);
    if (w <= e) {
      // if the result covers the whole world then we'll set it to that.
      w = -180.0;
      e = 180.0;
    }
  } else if (crossesAntimeridian(box1) || crossesAntimeridian(box2)) {
    // one crosses the antimeridian
    let b1;
    let b2;
    if (crossesAntimeridian(box2)) {
      b1 = box2;
      b2 = box1;
    } else {
      b1 = box1;
      b2 = box2;
    }
    const w1 = b1[0];
    const w2 = b2[0];
    const e1 = b1[2];
    const e2 = b2[2];
    // We could expand b1 to the east or to the west. Pick the shorter of the two
    const westDist = w1 - w2;
    const eastDist = e1 - e2;
    if (westDist <= 0 || eastDist >= 0) {
      w = w1;
      e = e1;
    } else if (eastDist < westDist) {
      w = w1;
      e = e2;
    } else {
      w = w2;
      e = e1;
    }

    if (w <= e) {
      // if the result covers the whole world then we'll set it to that.
      w = -180.0;
      e = 180.0;
    }
  } else {
    // neither cross the Antimeridian
    let b1;
    let b2;
    if (box1[0] > box2[0]) {
      b1 = box2;
      b2 = box1;
    } else {
      b1 = box1;
      b2 = box2;
    }
    const w1 = b1[0];
    const w2 = b2[0];
    const e1 = b1[2];
    const e2 = b2[2];

    w = min(w1, w2);
    e = max(e1, e2);

    // Check if it's shorter to cross the AM
    const dist = e - w;
    const altWest = w2;
    const altEast = e1;
    const altDist = 180.0 - altWest + (altEast + 180.0);

    if (altDist < dist) {
      w = altWest;
      e = altEast;
    }
  }

  // latitude range union
  const n = max(box1[3], box2[3]);
  const s = min(box1[1], box2[1]);

  return [w, s, e, n];
};

/**
 * Return a list of floats from a array of string values
 * @param ordString - String consisting of numeric values
 * @returns An array of float values
 */
export const parseOrdinateString = (ordString: string) => {
  return ordString.split(/\s+|,/).map(parseFloat);
};

/**
 *
 * @param latLonPoints - A string of coordinate values in CMR `lat lon...` format
 * @returns An array of coordinates
 */
export const pointStringToPoints = (latLonPoints: string) => {
  return chunk(parseOrdinateString(latLonPoints), 2).map(([lat, lon]) => ({
    lat,
    lon,
  }));
};

export const cmrSpatialToExtent = (
  cmrData: Collection | Granule
): SpatialExtent => {
  const { polygons, lines, points, boxes } = cmrData;

  if (polygons) {
    return polygons
      .map((rings: string[]) => rings[0]) // outer rings only
      .map(pointStringToPoints)
      .reduce(addPointsToBbox, null);
  }

  if (points) {
    return points.map(pointStringToPoints).reduce(addPointsToBbox, null);
  }

  if (lines) {
    return lines.flatMap(pointStringToPoints).reduce(addPointsToBbox, null);
  }

  if (boxes) {
    return boxes
      .map(parseOrdinateString)
      .map(reorderBoxValues) // CMR returns box coordinates in lon/lat
      .reduce(mergeBoxes, null);
  }

  return WHOLE_WORLD_BBOX_STAC as SpatialExtent;
};
