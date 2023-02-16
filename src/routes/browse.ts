import { Request, Response } from "express";

import { Links } from "../@types/StacCatalog";

import { getCollections } from "../domains/collections";
import { buildQuery, stringifyQuery } from "../domains/stacQuery";
import { buildRootUrl, mergeMaybe, stacContext } from "../utils";

const collectionLinks = (req: Request, nextCursor: string | null): Links => {
  const { stacRoot, self, path } = stacContext(req);

  const parent = self.split("/").slice(0, -1).join("/");

  const links = [
    {
      rel: "self",
      href: self,
      type: "application/json",
    },
    {
      rel: "root",
      href: stacRoot,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "parent",
      href: parent,
      type: "application/json",
      title: "Provider Collections",
    },
    {
      rel: "items",
      href: `${path}/items`,
      type: "application/geo+json",
      title: "Collection Items",
    },
  ];

  const root = buildRootUrl(req);
  const originalQuery = mergeMaybe(req.query, req.body);

  if (nextCursor) {
    const nextResultsQuery = { ...originalQuery };
    nextResultsQuery.cursor = nextCursor;

    links.push({
      rel: "next",
      href: `${root}${req.path}?${stringifyQuery(nextResultsQuery)}`,
      type: "application/geo+json",
    });
  }

  return links;
};

export const collectionsHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { headers } = req;

  const query = await buildQuery(req);

  const { cursor, items: collections } = await getCollections(query, {
    headers,
  });

  const { stacRoot, self } = stacContext(req);
  collections.forEach((collection) => {
    collection.links.push({
      rel: "self",
      href: `${self}/${collection.id}`,
      type: "application/json",
    });
    collection.links.push({
      rel: "root",
      href: stacRoot,
      type: "application/json",
    });
  });

  const links = collectionLinks(req, cursor);

  const collectionsResponse = {
    links,
    collections,
  };

  res.json(collectionsResponse);
};

/**
 * Returns a STACCollection as the body.
 */
export const collectionHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { collection } = req;

  // middleware handles this for us
  collection.links = collection.links
    ? [...collectionLinks(req, null), ...collection.links]
    : [...collectionLinks(req, null)];
  res.json(collection);
};
