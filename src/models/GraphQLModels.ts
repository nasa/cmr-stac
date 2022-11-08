interface GraphQLInput {
  // pagination
  limit?: number;
  cursor?: string;
  sortKey?: string;
  includeFacets?: string;
}

export interface GranulesInput extends GraphQLInput {
  // filtering
  provider?: string;

  // ids
  conceptIds?: string[];
  title?: string[];
  // TODO conceptIds: missing from graphQL

  // collections
  collectionConceptId?: string;
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
}

export interface CollectionsInput extends GraphQLInput {
  // filtering
  provider?: string;
  providers?: string[];
  conceptIds?: string[];
  cloudHosted?: boolean;
  hasGranules?: boolean;
}

export interface FacetFilter {
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
}

export interface FacetGroup {
  title: string;
  type: string;
  hasChildren: boolean;
  children: FacetFilter[] | FacetGroup[];
}

export interface Collection {
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
}

export interface Granule {
  title: string;
  conceptId: string;
  collectionConceptId: string;
  cloudCover: number | null;
  lines: string[] | null;
  boxes: string[] | null;
  polygons: string[][] | null;
  points: string[] | null;
  links: any[];
  timeStart: string;
  timeEnd: string | null;
}
