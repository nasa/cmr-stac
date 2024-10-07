export type GraphQLInput = {
  // pagination
  limit?: number;
  cursor?: string;

  // sorting
  sortKey?: string | string[];
};

export type GranulesInput = GraphQLInput & {
  // filtering
  provider?: string;

  // ids
  conceptIds?: string[];
  readableGranuleName?: string[];

  // collections
  collectionConceptIds?: string[];

  // bbox
  boundingBox?: string;

  // intersects
  polygon?: string[];
  line?: string[];
  point?: string[];

  // datetime
  temporal?: string;

  // extensions
  cloudCover?: {
    min?: number;
    max?: number;
  };
};

export type CollectionsInput = GraphQLInput & {
  // filtering
  cloudHosted?: boolean;
  conceptIds?: string[];
  entryId?: string[];
  hasGranules?: boolean;
  includeFacets?: string;
  keyword?: string;
  providers?: string[];
};

export type FacetFilter = {
  title: string;
  type: string;
  applied: boolean;
  count: number;
  links: {
    apply?: string;
    remove?: string;
  };
  hasChildren: boolean;
  children?: FacetFilter[];
};

export type FacetGroup = {
  title: string;
  type: string;
  hasChildren: boolean;
  children: FacetFilter[] | FacetGroup[];
};

export enum RelatedUrlType {
  DATA_SET_LANDING_PAGE = "DATA SET LANDING PAGE",
  VIEW_RELATED_INFORMATION = "VIEW RELATED INFORMATION",
  GET_DATA = "GET DATA",
  GET_SERVICE = "GET SERVICE",
  GET_RELATED_VISUALIZATION = "GET RELATED VISUALIZATION",
  PROJECT_HOME_PAGE = "PROJECT HOME PAGE",
  GET_CAPABILITIES = "GET CAPABILITIES",
  EXTENDED_METADATA = "EXTENDED METADATA",
  THUMBNAIL = "Thumbnail",
}

export enum UrlContentType {
  VISUALIZATION_URL = "VisualizationURL",
  DISTRIBUTION_URL = "DistributionURL",
  PUBLICATION_URL = "PublicationURL",
  COLLECTION_URL = "CollectionURL",
}

export enum RelatedUrlSubType {
  HOW_TO = "HOW-TO",
  GENERAL_DOCUMENTATION = "GENERAL DOCUMENTATION",
  DATA_TREE = "DATA TREE",
  EARTHDATA_SEARCH = "Earthdata Search",
  GIOVANNI = "GIOVANNI",
}

export type UseConstraints =
  | { description: string; licenseUrl?: string; freeAndOpenData?: boolean }
  | { licenseText: string }
  | {
      licenseUrl: {
        linkage: string;
        name: string;
        description: string;
        mimeType: string;
      };
    };

export type RelatedUrls = {
  description: string;
  urlContentType: UrlContentType;
  url: string;
  subtype?: RelatedUrlSubType | string;
  type?: RelatedUrlType | string;
  [key: string]: unknown;
  getData?: {
    format: string;
    mimeType: string;
    size: number;
    unit: string;
    checksum?: string;
    fees?: string;
  };
  getService?: {
    format: string;
    mimeType: string;
    protocol: string;
    fullName: string;
    dataId: string;
    dataType: string;
    uri: string[];
  };
}[];

export type Instrument = {
  shortName: string;
  longName: string;
};

export type Platform = {
  type: string;
  shortName: string;
  longName: string;
  instruments: Instrument[];
};

export type ScienceKeywords = {
  category: string;
  topic: string;
  term: string;
  variableLevel1?: string;
  variableLevel2?: string;
  variableLevel3?: string;
  detailedVariable?: string;
};

export type DirectDistributionInformation = {
  region: string;
  s3BucketAndObjectPrefixNames: string[];
  s3CredentialsApiEndpoint: string;
  s3CredentialsApiDocumentationUrl: string;
};

export type CollectionBase = {
  conceptId: string;
  version: string;
  shortName: string;
  title: string;
};

export type Collection = CollectionBase & {
  provider: string;
  description: string;

  polygons: string[][] | null;
  lines: string[] | null;
  boxes: string[] | null;
  points: string[] | null;

  timeStart: string | null;
  timeEnd: string | null;
  useConstraints: UseConstraints | null;
  relatedUrls: RelatedUrls | null;
  directDistributionInformation: DirectDistributionInformation | null;

  scienceKeywords: ScienceKeywords[];
  platforms: Platform[];
};

export type GranuleBase = {
  title: string | null;
  conceptId: string | null;
};

export type Granule = GranuleBase & {
  collection: CollectionBase | null;
  cloudCover: number | null;

  polygons: string[][] | null;
  lines: string[] | null;
  points: string[] | null;
  boxes: string[] | null;

  timeStart: string | null;
  timeEnd: string | null;
  relatedUrls: RelatedUrls | null;
};

export type GraphQLHandlerResponse =
  | [error: string, data: null]
  | [
      error: null,
      data: {
        count: number;
        cursor: string | null;
        items: object[];
      }
    ];

export type GraphQLHandler = (response: unknown) => GraphQLHandlerResponse;

export type GraphQLResults = {
  count: number;
  items: unknown[];
  cursor: string | null;
};
