import { Request, Response } from "express";

import { addProviderLinks, getItems } from "../domains/items";
import { getCollections } from "../domains/collections";
import { buildQuery, stringifyQuery } from "../domains/stacQuery";
import { buildRootUrl, mergeMaybe, WEEK_IN_MS } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (req: Request) => {
  const root = buildRootUrl(req);
  return [
    {
      rel: "root",
      href: `${root}`,
    },
    {
      rel: "first",
      href: `${root}${req.path}`,
    },
  ];
};

export const itemHandler = async (req: Request, res: Response) => {
  const { providerId, collectionId, itemId } = req.params;
  const itemQuery = await buildQuery(req);

  const {
    items: [item],
  } = await getItems(itemQuery, { headers: req.headers });

  if (!item) {
    return res.status(404).json({
      errors: [
        `Could not find item with ID [${itemId}] in collection [${collectionId}]`,
      ],
    });
  }

  const root = buildRootUrl(req);
  return res
    .contentType("application/geo+json")
    .json(addProviderLinks(root, providerId, item));
};

/**
 * Handle requests for a collection' items.
 *
 * Returns a FeatureCollection as response
 */
export const itemsHandler = async (req: Request, res: Response) => {
  const { cursor } = req.query;
  const { providerId, collectionId } = req.params;

  const itemQuery = await buildQuery(req);

  const collectionQuery = {
    provider: providerId,
    conceptId: collectionId,
  };

  // only query for the collection if necessary
  const {
    items: [collection],
  } = req.collection
    ? { items: [req.collection] }
    : await getCollections(collectionQuery, { headers: req.headers });

  const _selfLinks = selfLinks(req);

  try {
    const {
      cursor: nextCursor,
      count,
      items,
    } = await getItems(itemQuery, {
      headers: req.headers,
    });

    const root = buildRootUrl(req);
    const originalQuery = mergeMaybe(req.query, req.body);

    if (cursor && req.cookies[`prev-${cursor}`]) {
      const prevResultsQuery = { ...originalQuery };
      prevResultsQuery.cursor = req.cookies[`prev-${cursor}`];

      _selfLinks.push({
        rel: "prev",
        href: `${root}${req.path}?${stringifyQuery(prevResultsQuery)}`,
      });
    }

    if (nextCursor && originalQuery.limit == null) {
      const nextResultsQuery = { ...originalQuery };
      nextResultsQuery.cursor = nextCursor;

      _selfLinks.push({
        rel: "next",
        href: `${root}${req.path}?${stringifyQuery(nextResultsQuery)}`,
      });
    }

    if (cursor && nextCursor) {
      res.cookie(`prev-${nextCursor}`, cursor, {
        maxAge: WEEK_IN_MS,
      });
    }

    const itemsResponse = {
      type: "FeatureCollection",
      description: `Items in the collection ${collectionId}`,
      id: `${collectionId}-items`,
      license: collection.license ?? "NOT FOUND",
      extent: collection.extent,
      stac_version: STAC_VERSION,
      numberMatched: count,
      numberReturned: items.length,
      features: items.map((item) => {
        item.links = [
          {
            rel: "self",
            href: `${root}${req.url}/${item.id}`,
            type: "application/geo+json",
            title: item.id,
          },
        ];
        return item;
      }),
      links: _selfLinks,
      context: {
        returned: items.length,
        limit: itemQuery.limit,
        matched: count,
      },
    };

    return res.contentType("application/geo+json").json(itemsResponse);
  } catch (err) {
    console.error(JSON.stringify(err, null, 2));
    return res
      .status(503)
      .json({ errors: ["A problem occurred fetching items."] });
  }
};
