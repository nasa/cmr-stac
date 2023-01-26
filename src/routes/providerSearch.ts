import { Request, Response } from "express";

import { Link } from "../@types/StacCatalog";
import { STACItem } from "../@types/StacItem";
import { getItems, addProviderLinks } from "../domains/items";
import {
  DEFAULT_LIMIT,
  buildQuery,
  stringifyQuery,
} from "../domains/stacQuery";
import { buildRootUrl, mergeMaybe, ERRORS } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (
  root: string,
  nextCursor: string | null,
  req: Request
): Link[] => {
  const { providerId } = req.params;

  const originalQuery = mergeMaybe(req.query, req.body);

  let links = [
    {
      rel: "self",
      href: `${root}${req.originalUrl}`,
      type: "application/geo+json",
      title: "This search",
    },
    {
      rel: "root",
      href: `${root}`,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "provider",
      href: `${root}/${providerId}`,
      type: "application/json",
      title: `Provider Catalog`,
    },
    {
      rel: "first",
      href: `${root}/${providerId}/search?${stringifyQuery(originalQuery)}`,
      type: "application/geo+json",
      title: "First page of results",
    },
  ];

  // only include `next` if there is a cursor, and no limit has been set
  if (nextCursor && originalQuery.limit == null) {
    const newQuery = { ...originalQuery };
    newQuery["cursor"] = nextCursor;

    links = [
      ...links,
      {
        rel: "next",
        href: `${root}/${providerId}/search?${stringifyQuery(newQuery)}`,
        type: "application/json",
        title: "Next page of results",
      },
    ];
  }

  return links;
};

export const handler = async (req: Request, res: Response): Promise<any> => {
  const root = buildRootUrl(req);
  const { providerId } = req.params;

  const gqlQuery = await buildQuery(req);

  let itemsResponse;
  try {
    itemsResponse = await getItems(gqlQuery, { headers: req.headers });
  } catch (err) {
    console.error("A problem occurred retrieving granules", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }
  const { count, cursor, items } = itemsResponse;
  const features = items.map((item: STACItem) =>
    addProviderLinks(root, providerId, item)
  );

  const _selfLinks = selfLinks(root, cursor, req);

  res.json({
    type: "FeatureCollection",
    stac_version: STAC_VERSION,
    numberMatched: count,
    numberReturned: features.length,
    features,
    links: [..._selfLinks],
    context: {
      returned: features.length,
      matched: count,
      limit: req.query.limit ?? DEFAULT_LIMIT,
    },
  });
};
