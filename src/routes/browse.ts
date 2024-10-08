import { Request, Response } from "express";

import { Links } from "../@types/StacCatalog";

import { getCollections } from "../domains/collections";
import { buildQuery, stringifyQuery } from "../domains/stac";
import { ItemNotFound } from "../models/errors";
import { mergeMaybe, stacContext } from "../utils";

const collectionLinks = (req: Request, nextCursor?: string | null): Links => {
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

  const originalQuery = mergeMaybe(req.query, req.body);

  if (nextCursor) {
    const nextResultsQuery = { ...originalQuery, cursor: nextCursor };

    links.push({
      rel: "next",
      href: `${stacRoot}${req.path}?${stringifyQuery(nextResultsQuery)}`,
      type: "application/geo+json",
    });
  }

  return links;
};

export const collectionsHandler = async (req: Request, res: Response): Promise<void> => {
  const { headers } = req;

  const query = await buildQuery(req);

  const { cursor, items: collections } = await getCollections(query, {
    headers,
  });

  const { stacRoot, self } = stacContext(req);

  // Remove query parameters from the URL, keeping only the base path
  const baseUrl = self.replace(/\?.*$/, "");

  collections.forEach((collection) => {
    collection.links.push({
      rel: "self",
      href: `${baseUrl}/${encodeURIComponent(collection.id)}`,
      type: "application/json",
    });
    collection.links.push({
      rel: "root",
      href: encodeURI(stacRoot),
      type: "application/json",
    });
    // If the list of links of does not contain a link of type 'items' then add the default items element
    let itemsPresent = false
    for (const link of collection.links) {
      if (link.rel == 'items') {
        itemsPresent = true
        break
      }
    }
    console.log("I am in browse!");
    if (itemsPresent == false) {
      console.log("I am adding!");
      collection.links.push({
        rel: "items",
        href: `${baseUrl}/${encodeURIComponent(collection.id)}/items`,
        type: "application/json",
      });
    }
  });

  const links = collectionLinks(req, cursor);

  const collectionsResponse = {
    description: `All collections provided by ${self.split("/").at(-2)}`,
    links,
    collections,
  };

  res.json(collectionsResponse);
};

/**
 * Returns a STACCollection as the body.
 */
export const collectionHandler = async (req: Request, res: Response): Promise<void> => {
  const {
    collection,
    params: { collectionId, providerId },
  } = req;

  if (!collection) {
    throw new ItemNotFound(
      `Could not find collection [${collectionId}] in provider [${providerId}]`
    );
  }

  collection.links = collection.links
    ? [...collectionLinks(req), ...(collection.links ?? [])]
    : [...collectionLinks(req)];

  res.json(collection);
};
