import { Request, Response } from "express";

import { addProviderLinks, getItems } from "../domains/items";
import { buildQuery, stringifyQuery } from "../domains/stacQuery";
import { ItemNotFound } from "../models/errors";
import { mergeMaybe, stacContext, WEEK_IN_MS } from "../utils/index";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const generateLinks = (req: Request) => {
  const { stacRoot, self } = stacContext(req);

  return [
    {
      rel: "self",
      href: self,
      type: "application/geo+json",
    },
    {
      rel: "root",
      href: stacRoot,
      type: "application/json",
    },
    {
      rel: "parent",
      href: self.split("/").slice(0, -1).join("/"),
      type: "application/json",
    },
  ];
};

/**
 * Handle requests for a collection' items.
 *
 * Returns a FeatureCollection as response
 */
export const singleItemHandler = async (req: Request, res: Response) => {
  const {
    headers,
    params: { collectionId, itemId },
  } = req;

  const itemQuery = await buildQuery(req);

  const {
    items: [item],
  } = await getItems(itemQuery, { headers });

  if (!item)
    throw new ItemNotFound(
      `Could not find item with ID [${itemId}] in collection [${collectionId}]`
    );

  const itemResponse = addProviderLinks(req, item);

  res.contentType("application/geo+json").json(itemResponse);
};

/**
 * Handle requests for a collection' items.
 *
 * Returns a FeatureCollection as response
 */
export const multiItemHandler = async (req: Request, res: Response) => {
  const {
    query: { cursor },
    collection,
  } = req;

  const itemQuery = await buildQuery(req);

  const links = generateLinks(req);

  const {
    cursor: nextCursor,
    count,
    items,
  } = await getItems(itemQuery, {
    headers: req.headers,
  });

  const { stacRoot } = stacContext(req);
  const originalQuery = mergeMaybe(req.query, req.body);

  if (cursor && req.cookies[`prev-${cursor}`]) {
    const prevResultsQuery = { ...originalQuery };
    prevResultsQuery.cursor = req.cookies[`prev-${cursor}`];

    links.push({
      rel: "prev",
      href: `${stacRoot}${req.path}?${stringifyQuery(prevResultsQuery)}`,
      type: "application/geo+json",
    });
  }

  if (nextCursor && nextCursor !== cursor) {
    const nextResultsQuery = { ...originalQuery };
    nextResultsQuery.cursor = nextCursor;

    links.push({
      rel: "next",
      href: `${stacRoot}${req.path}?${stringifyQuery(nextResultsQuery)}`,
      type: "application/geo+json",
    });
  }

  if (cursor && nextCursor && nextCursor !== cursor) {
    res.cookie(`prev-${nextCursor}`, originalQuery.cursor, {
      maxAge: WEEK_IN_MS,
    });
  }

  const { self } = stacContext(req);

  const itemsResponse = {
    type: "FeatureCollection",
    description: `Items in the collection ${collection.id}`,
    id: `${collection.id}-items`,
    license: collection.license,
    extent: collection.extent,
    stac_version: STAC_VERSION,
    numberMatched: count,
    numberReturned: items.length,
    features: items.map((item) => {
      item.links = [
        {
          rel: "self",
          href: `${self}/${item.id}`,
          type: "application/geo+json",
          title: item.id,
        },
      ];

      return item;
    }),
    links,
    context: {
      returned: items.length,
      limit: itemQuery.limit,
      matched: count,
    },
  };

  res.contentType("application/geo+json").json(itemsResponse);
};
