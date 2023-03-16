/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * This object represents the metadata for an item in a SpatioTemporal Asset Catalog.
 */
export type STACItem = Core;
export type Core = GeoJSONFeature &
  (
    | {
        geometry: GeoJSONGeometry;
        bbox: Bbox;
        [k: string]: unknown;
      }
    | {
        geometry: null;
        bbox?: Bbox;
        [k: string]: unknown;
      }
  ) & {
    stac_version: STACVersion;
    stac_extensions?: STACExtensions;
    id: ProviderID;
    links: ItemLinks;
    assets: AssetLinks;
    properties: CommonMetadata &
      (
        | {
            datetime: {
              [k: string]: unknown;
            };
            [k: string]: unknown;
          }
        | {
            [k: string]: unknown;
          }
      );
    [k: string]: unknown;
  };
export type GeoJSONGeometry =
  | GeoJSONPoint2
  | GeoJSONLineString2
  | GeoJSONPolygon2
  | GeoJSONMultiPoint2
  | GeoJSONMultiLineString2
  | GeoJSONMultiPolygon2;
export type Bbox =
  | [number, number, number, number]
  | [number, number, number, number, number, number];
export type STACVersion = "1.0.0";
export type ReferenceToAJSONSchema = string;
export type STACExtensions = ReferenceToAJSONSchema[];
/**
 * Provider item ID
 */
export type ProviderID = string;
export type LinkReference = string;
export type LinkRelationType = string;
export type LinkType = string;
export type LinkTitle = string;
/**
 * Links to item relations
 */
export type ItemLinks = Link[];
export type Asset = {
  href: AssetReference;
  title?: AssetTitle;
  description?: AssetDescription;
  type?: AssetType;
  roles?: AssetRoles;
  [k: string]: unknown;
} & CommonMetadata;
export type AssetReference = string;
export type AssetTitle = string;
export type AssetDescription = string;
export type AssetType = string;
export type AssetRoles = string[];
export type CommonMetadata = BasicDescriptiveFields &
  DateAndTimeFields &
  InstrumentFields &
  LicensingFields &
  ProviderFields;
/**
 * A human-readable title describing the Item.
 */
export type ItemTitle = string;
/**
 * Detailed multi-line description to fully explain the Item.
 */
export type ItemDescription = string;
/**
 * The searchable date/time of the assets, in UTC (Formatted in RFC 3339)
 */
export type DateAndTime = string | null;
/**
 * The searchable start date/time of the assets, in UTC (Formatted in RFC 3339)
 */
export type StartDateAndTime = string;
/**
 * The searchable end date/time of the assets, in UTC (Formatted in RFC 3339)
 */
export type EndDateAndTime = string;
export type CreationTime = string;
export type LastUpdateTime = string;
export type Platform = string;
export type Instruments = string[];
export type Constellation = string;
export type Mission = string;
export type GroundSampleDistance = number;
export type OrganizationName = string;
export type OrganizationDescription = string;
export type OrganizationRoles = ("producer" | "licensor" | "processor" | "host")[];
export type OrganizationHomepage = string;
export type Providers = {
  name: OrganizationName;
  description?: OrganizationDescription;
  roles?: OrganizationRoles;
  url?: OrganizationHomepage;
  [k: string]: unknown;
}[];

export type GeoJSONFeature = {
  type: "Feature";
  id?: number | string;
  properties: null | {
    [k: string]: unknown;
  };
  geometry:
    | null
    | GeoJSONPoint
    | GeoJSONLineString
    | GeoJSONPolygon
    | GeoJSONMultiPoint
    | GeoJSONMultiLineString
    | GeoJSONMultiPolygon
    | GeoJSONGeometryCollection;
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPoint = {
  type: "Point";
  /**
   * @minItems 2
   */
  coordinates: [number, number, ...number[]];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONLineString = {
  type: "LineString";
  /**
   * @minItems 2
   */
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPolygon = {
  type: "Polygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPoint = {
  type: "MultiPoint";
  coordinates: [number, number, ...number[]][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiLineString = {
  type: "MultiLineString";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONGeometryCollection = {
  type: "GeometryCollection";
  geometries: (
    | GeoJSONPoint1
    | GeoJSONLineString1
    | GeoJSONPolygon1
    | GeoJSONMultiPoint1
    | GeoJSONMultiLineString1
    | GeoJSONMultiPolygon1
  )[];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPoint1 = {
  type: "Point";
  /**
   * @minItems 2
   */
  coordinates: [number, number, ...number[]];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONLineString1 = {
  type: "LineString";
  /**
   * @minItems 2
   */
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPolygon1 = {
  type: "Polygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPoint1 = {
  type: "MultiPoint";
  coordinates: [number, number, ...number[]][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiLineString1 = {
  type: "MultiLineString";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPolygon1 = {
  type: "MultiPolygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPoint2 = {
  type: "Point";
  /**
   * @minItems 2
   */
  coordinates: [number, number, ...number[]];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONLineString2 = {
  type: "LineString";
  /**
   * @minItems 2
   */
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONPolygon2 = {
  type: "Polygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPoint2 = {
  type: "MultiPoint";
  coordinates: [number, number, ...number[]][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiLineString2 = {
  type: "MultiLineString";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type GeoJSONMultiPolygon2 = {
  type: "MultiPolygon";
  coordinates: [
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    [number, number, ...number[]],
    ...[number, number, ...number[]][]
  ][][];
  /**
   * @minItems 4
   */
  bbox?: [number, number, number, number, ...number[]];
  [k: string]: unknown;
};
export type Link = {
  href: LinkReference;
  rel: LinkRelationType;
  type?: LinkType;
  title?: LinkTitle;
  [k: string]: unknown;
};
/**
 * Links to assets
 */
export type AssetLinks = {
  [k: string]: Asset;
};
export type BasicDescriptiveFields = {
  title?: ItemTitle;
  description?: ItemDescription;
  [k: string]: unknown;
};
export type DateAndTimeFields = {
  datetime?: DateAndTime;
  start_datetime?: StartDateAndTime;
  end_datetime?: EndDateAndTime;
  created?: CreationTime;
  updated?: LastUpdateTime;
  [k: string]: unknown;
};
export type InstrumentFields = {
  platform?: Platform;
  instruments?: Instruments;
  constellation?: Constellation;
  mission?: Mission;
  gsd?: GroundSampleDistance;
  [k: string]: unknown;
};
export type LicensingFields = {
  license?: string;
  [k: string]: unknown;
};
export type ProviderFields = {
  providers?: Providers;
  [k: string]: unknown;
};
