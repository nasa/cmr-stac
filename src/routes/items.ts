import { Request, Response } from "express";
import { parseURL } from "whatwg-url";

import { getItems } from "../domains/items";
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
  const { collectionId, itemId } = req.params;
  const itemQuery = {
    collectionConceptIds: [collectionId],
    conceptId: itemId,
  };

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

  return res.contentType("application/geo+json").json(item);
};

/**
 * Handle requests for a collection' items.
 *
 * Returns a FeatureCollection as response
 */
export const itemsHandler = async (req: Request, res: Response) => {
  const { collectionId } = req.params;
  const { cursor } = req.query;

  const limit = Number.isNaN(Number(req.query.limit))
    ? 250
    : Number(req.query.limit);

  const itemQuery = mergeMaybe(
    {
      collectionConceptIds: [collectionId],
      limit,
    },
    { cursor }
  );

  let _selfLinks = selfLinks(req);

  try {
    const {
      cursor: nextCursor,
      count,
      items,
    } = await getItems(itemQuery, {
      headers: req.headers,
    });

    const root = buildRootUrl(req);
    let queryString;
    try {
      queryString = parseURL(req.url)?.query ?? "";
    } catch (err) {
      console.error("Failed to parse query string ", req.query, err);
    }

    if (cursor && req.cookies[`prev-${cursor}`]) {
      const prevQueryParams = new URLSearchParams(queryString);
      prevQueryParams.set("cursor", req.cookies[`prev-${cursor}`]);

      _selfLinks.push({
        rel: "prev",
        href: `${root}${req.path}?${prevQueryParams.toString()}`,
      });
    }

    if (nextCursor) {
      const nextQueryParams = new URLSearchParams(queryString);
      nextQueryParams.set("cursor", nextCursor);

      _selfLinks.push({
        rel: "next",
        href: `${root}${req.path}?${nextQueryParams.toString()}`,
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
      license: "INHERITS FROM PARENT LICENSE",
      extent: null,
      stac_version: STAC_VERSION,
      numberMatched: count,
      numberReturned: items.length,
      features: items,
      links: _selfLinks,
      context: {
        returned: items.length,
        limit,
        matched: count,
      },
    };

    return res.contentType("application/geo+json").json(itemsResponse);
  } catch (err) {
    return res
      .status(503)
      .json({ errors: ["A problem occurred fetching items."] });
  }
};
