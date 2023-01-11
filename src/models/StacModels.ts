export type StacQuery = {
  cursor?: string;
  sortby?: string;
  limit?: string;
  bbox?: string;
  datetime?: string;
  intersects?: string[];
  ids?: string[];
  collections?: string[];
};

export type StacExtension = {
  extension: string;
  properties: { [key: string]: any };
};

export type StacExtensions = {
  extensions: string[];
  properties: { [key: string]: any };
};
