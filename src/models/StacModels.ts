export type PropertyQuery = {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  // TODO: Add full support for STAC property query extension, see CMR-9010
};

export type StacQuery = {
  cursor?: string;
  sortby?: string;
  limit?: string;
  bbox?: string;
  datetime?: string;
  intersects?: string[];
  ids?: string[];
  collections?: string[];
  query?: {
    [key: string]: PropertyQuery;
  };
};

export type StacExtension = {
  extension: string;
  properties: { [key: string]: any };
};

export type StacExtensions = {
  extensions: string[];
  properties: { [key: string]: any };
};
