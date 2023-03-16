import { Request, Response } from "express";

import { Link, STACItem } from "../@types/StacItem";

import { addProviderLinks, getItems } from "../domains/items";
import { buildQuery, stringifyQuery } from "../domains/stac";
import { mergeMaybe, stacContext } from "../utils";

const searchLinks = (req: Request, nextCursor: string | null): Link[] => {
  const {
    params: { providerId },
  } = req;

  const { stacRoot, self } = stacContext(req);
  const currentQuery = mergeMaybe(req.query, req.body);

  const firstQuery = { ...currentQuery };
  delete firstQuery["cursor"];

  let links = [
    {
      rel: "self",
      href: self,
      type: "application/geo+json",
      title: "This search",
    },
    {
      rel: "root",
      href: `${stacRoot}`,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "parent",
      href: `${stacRoot}/${providerId}`,
      type: "application/json",
      title: `Provider Catalog`,
    },
    {
      rel: "first",
      href: `${stacRoot}/${providerId}/search?${stringifyQuery(firstQuery)}`,
      type: "application/geo+json",
      title: "First page of results",
    },
  ];

  if (nextCursor) {
    const nextQuery = { ...currentQuery };
    nextQuery["cursor"] = nextCursor;

    links = [
      ...links,
      {
        rel: "next",
        href: `${stacRoot}/${providerId}/search?${stringifyQuery(nextQuery)}`,
        type: "application/geo+json",
        title: "Next page of results",
      },
    ];
  }

  return links;
};

export const searchHandler = async (req: Request, res: Response): Promise<any> => {
  const { headers } = req;
  const gqlQuery = await buildQuery(req);

  const itemsResponse = await getItems(gqlQuery, { headers });

  const { cursor, items } = itemsResponse;
  const features = items.map((item: STACItem) => addProviderLinks(req, item));

  const links = searchLinks(req, cursor);

  res.contentType("application/geo+json").json({
    type: "FeatureCollection",
    features,
    links,
  });
};
