export interface StacQuery {
  cursor?: string;
  sortby?: string;
  limit?: string;
  bbox?: string;
  datetime?: string;
  intersects?: string[];
  ids?: string[];
  collections?: string[];
}
