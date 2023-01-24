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
  provider?: string;
  providers?: string[];
  conceptIds?: string[];
  cloudHosted?: boolean;
  hasGranules?: boolean;
  includeFacets?: string;
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

export type Collection = {
  shortName: string;
  provider: string;
  version: string;
  conceptId: string;
  cloudHosted: boolean | null;
  description: string;
  title: string;

  polygons: any | null;
  lines: any | null;
  boxes: any | null;
  points: any | null;

  timeStart: string;
  timeEnd: string | null;
  useConstraints: { description: string } | null;
  relatedUrls: any[];
};

export type Granule = {
  title: string | null;
  conceptId: string | null;
  collectionConceptId: string | null;
  cloudCover: number | null;
  lines: string[] | null;
  boxes: string[] | null;
  polygons: string[][] | null;
  points: string[] | null;
  links: any[] | null;
  timeStart: string | null;
  timeEnd: string | null;
};
