/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * This object represents Collections in a SpatioTemporal Asset Catalog.
 */
export type STACCollectionSpecification = STACCollection;
export type STACVersion = "1.0.0";
export type ReferenceToAJSONSchema = string;
export type STACExtensions = ReferenceToAJSONSchema[];
export type TypeOfSTACEntity = "Collection";
export type Identifier = string;
export type Title = string;
export type Description = string;
export type Keywords = string[];
export type CollectionLicenseName = string;
export type OrganizationName = string;
export type OrganizationDescription = string;
export type OrganizationRoles = ("producer" | "licensor" | "processor" | "host")[];
export type OrganizationHomepage = string;
/**
 * @minItems 1
 */
export type SpatialExtents = [SpatialExtent, ...SpatialExtent[]] | null;
export type SpatialExtent =
  | [number, number, number, number]
  | [number, number, number, number, number, number]
  | null;
/**
 * @minItems 1
 */
export type TemporalExtents = [TemporalExtent, ...TemporalExtent[]];
/**
 * @minItems 2
 * @maxItems 2
 */
export type TemporalExtent = [string | null, string | null];
export type AssetReference = string;
export type AssetTitle = string;
export type AssetDescription = string;
export type AssetType = string;
export type AssetRoles = string[];
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
export type OrganizationName1 = string;
export type OrganizationDescription1 = string;
export type OrganizationRoles1 = ("producer" | "licensor" | "processor" | "host")[];
export type OrganizationHomepage1 = string;
export type Providers = {
  name: OrganizationName1;
  description?: OrganizationDescription1;
  roles?: OrganizationRoles1;
  url?: OrganizationHomepage1;
  [k: string]: unknown;
}[];
export type LinkReference = string;
export type LinkRelationType = string;
export type LinkType = string;
export type LinkTitle = string;
export type Links = Link[];
export type JSONSchema = CoreSchemaMetaSchema;
export type CoreSchemaMetaSchema = CoreSchemaMetaSchema1 & CoreSchemaMetaSchema2;
export type CoreSchemaMetaSchema2 =
  | {
      $id?: string;
      $schema?: string;
      $ref?: string;
      $comment?: string;
      title?: string;
      description?: string;
      default?: true;
      readOnly?: boolean;
      writeOnly?: boolean;
      examples?: true[];
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: number;
      minimum?: number;
      exclusiveMinimum?: number;
      maxLength?: number;
      minLength?: number;
      pattern?: string;
      additionalItems?: CoreSchemaMetaSchema2;
      items?: CoreSchemaMetaSchema2 | SchemaArray;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      contains?: CoreSchemaMetaSchema2;
      maxProperties?: number;
      minProperties?: number;
      required?: StringArray;
      additionalProperties?: CoreSchemaMetaSchema2;
      definitions?: {
        [k: string]: CoreSchemaMetaSchema2;
      };
      properties?: {
        [k: string]: CoreSchemaMetaSchema2;
      };
      patternProperties?: {
        [k: string]: CoreSchemaMetaSchema2;
      };
      dependencies?: {
        [k: string]: CoreSchemaMetaSchema2 | StringArray;
      };
      propertyNames?: CoreSchemaMetaSchema2;
      const?: true;
      /**
       * @minItems 1
       */
      enum?: [true, ...unknown[]];
      type?:
        | ("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")
        | [
            "array" | "boolean" | "integer" | "null" | "number" | "object" | "string",
            ...("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")[]
          ];
      format?: string;
      contentMediaType?: string;
      contentEncoding?: string;
      if?: CoreSchemaMetaSchema2;
      then?: CoreSchemaMetaSchema2;
      else?: CoreSchemaMetaSchema2;
      allOf?: SchemaArray;
      anyOf?: SchemaArray;
      oneOf?: SchemaArray;
      not?: CoreSchemaMetaSchema2;
      [k: string]: unknown;
    }
  | boolean;
/**
 * @minItems 1
 */
export type SchemaArray = [CoreSchemaMetaSchema2, ...CoreSchemaMetaSchema2[]];
export type StringArray = string[];
export type MinimumValue = number | string;
export type MaximumValue = number | string;
/**
 * @minItems 1
 */
export type SetOfValues = [
  {
    [k: string]: unknown;
  },
  ...{
    [k: string]: unknown;
  }[]
];

/**
 * These are the fields specific to a STAC Collection. All other fields are inherited from STAC Catalog.
 */
export type STACCollection = {
  stac_version: STACVersion;
  stac_extensions?: STACExtensions;
  type: TypeOfSTACEntity;
  id: Identifier;
  title?: Title;
  description: Description;
  keywords?: Keywords;
  license: CollectionLicenseName;
  providers?: {
    name: OrganizationName;
    description?: OrganizationDescription;
    roles?: OrganizationRoles;
    url?: OrganizationHomepage;
    [k: string]: unknown;
  }[];
  extent: Extents;
  assets?: AssetLinks;
  links: Links;
  summaries?: Summaries;
  [k: string]: unknown;
};
export type Extents = {
  spatial: SpatialExtentObject;
  temporal: TemporalExtentObject;
  [k: string]: unknown;
};
export type SpatialExtentObject = {
  bbox: SpatialExtents;
  [k: string]: unknown;
};
export type TemporalExtentObject = {
  interval: TemporalExtents;
  [k: string]: unknown;
};
/**
 * Links to assets
 */
export type AssetLinks = {
  [k: string]: {
    href: AssetReference;
    title?: AssetTitle;
    description?: AssetDescription;
    type?: AssetType;
    roles?: AssetRoles;
    [k: string]: unknown;
  } & (BasicDescriptiveFields &
    DateAndTimeFields &
    InstrumentFields &
    LicensingFields &
    ProviderFields);
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
export type Link = {
  href: LinkReference;
  rel: LinkRelationType;
  type?: LinkType;
  title?: LinkTitle;
  [k: string]: unknown;
};
export type Summaries = {
  platform: string[];
  instruments: string[];
};
export type CoreSchemaMetaSchema1 = {
  $id?: string;
  $schema?: string;
  $ref?: string;
  $comment?: string;
  title?: string;
  description?: string;
  default?: true;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: true[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  additionalItems?: CoreSchemaMetaSchema2;
  items?: CoreSchemaMetaSchema2 | SchemaArray;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: CoreSchemaMetaSchema2;
  maxProperties?: number;
  minProperties?: number;
  required?: StringArray;
  additionalProperties?: CoreSchemaMetaSchema2;
  definitions?: {
    [k: string]: CoreSchemaMetaSchema2;
  };
  properties?: {
    [k: string]: CoreSchemaMetaSchema2;
  };
  patternProperties?: {
    [k: string]: CoreSchemaMetaSchema2;
  };
  dependencies?: {
    [k: string]: CoreSchemaMetaSchema2 | StringArray;
  };
  propertyNames?: CoreSchemaMetaSchema2;
  const?: true;
  /**
   * @minItems 1
   */
  enum?: [true, ...unknown[]];
  type?:
    | ("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")
    | [
        "array" | "boolean" | "integer" | "null" | "number" | "object" | "string",
        ...("array" | "boolean" | "integer" | "null" | "number" | "object" | "string")[]
      ];
  format?: string;
  contentMediaType?: string;
  contentEncoding?: string;
  if?: CoreSchemaMetaSchema2;
  then?: CoreSchemaMetaSchema2;
  else?: CoreSchemaMetaSchema2;
  allOf?: SchemaArray;
  anyOf?: SchemaArray;
  oneOf?: SchemaArray;
  not?: CoreSchemaMetaSchema2;
  [k: string]: unknown;
};
export type Range = {
  minimum: MinimumValue;
  maximum: MaximumValue;
  [k: string]: unknown;
};
