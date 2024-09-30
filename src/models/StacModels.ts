import { GeoJSONGeometry, GeoJSONGeometryCollection } from "../@types/StacItem";

export type PropertyQuery = {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  // TODO: Add full support for STAC property query extension, see CMR-9010
};

export type StacQuery = {
  cursor?: string;
  sortBy?: string | string[];
  limit?: string;
  bbox?: string;
  datetime?: string;
  intersects?: GeoJSONGeometry | GeoJSONGeometryCollection | string | string[];
  ids?: string | string[];
  collections?: string | string[];
  query?: {
    [key: string]: PropertyQuery;
  };
  q?: string; //query for free text search
};

export type StacExtension = {
  extension: string;
  properties: { [key: string]: unknown };
};

export type StacExtensions = {
  extensions: string[];
  properties: { [key: string]: unknown };
};
