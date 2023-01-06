import { GeoJSONGeometry } from "../@types/StacItem";
import { chunk } from "lodash";
import { Collection, Granule } from "../models/GraphQLModels";
import { pointStringToPoints, parseOrdinateString } from "./bounding-box";

/**
 * Convert a list of polygon strings into a GeoJSON Polygon coordinates.
 * STAC GeoJSON requires LAT then LON, or easting and northing
 */
export const cmrPolygonToGeoJsonCoordinates = (polygons: string[]) => {
  return polygons
    .map(pointStringToPoints)
    .map((coords) => coords.map(({ lat, lon }) => [lat, lon]));
};

/**
 * Convert a 2D bbox string into GeoJSON Polygon coordinates format.
 */
export const cmrBoxToGeoJsonPolygonCoordinates = (
  box: string
): number[][][] => {
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
 * Convert an array of polygon strings into a GeoJSON geometry.
 */
export const polygonToGeoJSON = (
  polygons: string[][]
): GeoJSONGeometry | null => {
  const geometries = polygons.map(cmrPolygonToGeoJsonCoordinates);

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
 * Convert an array of boxes to a GeoJSON Geometry.
 */
export const boxToGeoJSON = (boxes: string[]): GeoJSONGeometry | null => {
  const geometries = boxes.map(cmrBoxToGeoJsonPolygonCoordinates);

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
export const pointsToGeoJSON = (points: string[]): GeoJSONGeometry | null => {
  const geometries = points
    .map(parseOrdinateString)
    .flatMap((points) => chunk(points, 2));

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
export const linesToGeoJSON = (lines: string[]): GeoJSONGeometry | null => {
  const geometry = lines.map(parseOrdinateString).map((line) => chunk(line, 2));

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
 * Return a GeoJSON geometry from CMR Spatial data.
 * Null returned if no applicable geometry data exists.
 *
 * CMR/GraphQL returns geometry strings in `lat1 lon1 lat2 lon2...` format
 * GeoJSON requires LAT then LON, or easting then northing
 *
 * @see https://www.rfc-editor.org/rfc/rfc7946#section-3.1.1
 */
export const cmrSpatialToGeoJSONGeometry = (
  cmrData: Granule | Collection
): GeoJSONGeometry | null => {
  const { boxes, lines, polygons, points } = cmrData;

  if (polygons) return polygonToGeoJSON(polygons);
  if (boxes) return boxToGeoJSON(boxes);
  if (points) return pointsToGeoJSON(points);
  if (lines) return linesToGeoJSON(lines);

  console.debug(
    `Spatial system unknown or missing in concept [${cmrData.conceptId}]`
  );
  return null;
};
