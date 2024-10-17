import { Request, Response } from "express";

import { Links, STACCatalog } from "../@types/StacCatalog";

import { getAllCollectionIds } from "../domains/collections";
import { conformance } from "../domains/providers";
import { ServiceUnavailableError } from "../models/errors";
import { getBaseUrl, mergeMaybe, stacContext } from "../utils";
import { stringifyQuery } from "../domains/stac";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const generateSelfLinks = (req: Request, nextCursor?: string | null): Links => {
  const { stacRoot, path, self } = stacContext(req);

  const links = [
    {
      rel: "self",
      href: self,
      type: "application/geo+json",
      title: "Provider Catalog",
    },
    {
      rel: "root",
      href: stacRoot,
      type: "application/geo+json",
      title: `Root Catalog`,
    },
    {
      rel: "data",
      href: `${path}/collections`,
      type: "application/json",
      title: "Provider Collections",
      method: "GET",
    },
    {
      rel: "data",
      href: `${path}/collections`,
      type: "application/json",
      title: "Provider Collections",
      method: "POST",
    },
    {
      rel: "search",
      href: `${path}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "GET",
    },
    {
      rel: "search",
      href: `${path}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "POST",
    },
    {
      rel: "conformance",
      href: `${path}/conformance`,
      type: "application/json",
      title: "Conformance Classes",
    },
    {
      rel: "service-desc",
      href: "https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml",
      type: "application/vnd.oai.openapi;version=3.0",
      title: "OpenAPI Doc",
    },
    {
      rel: "service-doc",
      href: "https://api.stacspec.org/v1.0.0-beta.1/index.html",
      type: "text/html",
      title: "HTML documentation",
    },
  ];

  const originalQuery = mergeMaybe(req.query, req.body);

  if (nextCursor) {
    const nextResultsQuery = { ...originalQuery, cursor: nextCursor };

    links.push({
      rel: "next",
      href: `${stacRoot}${req.path}?${stringifyQuery(nextResultsQuery)}`,
      type: "application/json",
      title: "Next page of results",
    });
  }

  return links;
};

const providerCollections = async (
  req: Request
): Promise<[null, { id: string; title: string }[], string | null] | [string, null]> => {
  const { headers, provider, query } = req;

  const cloudOnly = headers["cloud-stac"] === "true" ? { cloudHosted: true } : {};

  const query2 = mergeMaybe(
    { provider: provider?.["provider-id"], cursor: query?.cursor },
    { ...cloudOnly }
  );

  try {
    const { items, cursor } = await getAllCollectionIds(query2, { headers });
    return [null, items, cursor];
  } catch (err) {
    console.error("A problem occurred querying for collections.", err);
    return [(err as Error).message, null];
  }
};

export const providerCatalogHandler = async (req: Request, res: Response) => {
  const { provider } = req;

  if (!provider) throw new ServiceUnavailableError("Could not retrieve provider information");

  const [err, collections, cursor] = await providerCollections(req);

  if (err) throw new ServiceUnavailableError(err as string);

  const { self } = stacContext(req);

  const selfLinks = generateSelfLinks(req, cursor);

  const childLinks = (collections ?? []).map(({ id, title }) => ({
    rel: "child",
    href: `${getBaseUrl(self)}/collections/${encodeURIComponent(id)}`,
    title,
    type: "application/json",
  }));

  const providerCatalog = {
    type: "Catalog",
    id: provider["provider-id"],
    title: `${provider["provider-id"]} STAC Catalog`,
    stac_version: STAC_VERSION,
    description: `Root STAC catalog for ${provider["provider-id"]}`,
    conformsTo: conformance,
    links: [...selfLinks, ...childLinks],
  } as STACCatalog;

  res.json(providerCatalog);
};
