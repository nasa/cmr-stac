import { Request, Response } from "express";
import { stringify as stringifyQuery } from "qs";

import { Links, STACCatalog } from "../@types/StacCatalog";

import { getAllCollectionIds } from "../domains/collections";
import { conformance } from "../domains/providers";
import { ServiceUnavailableError } from "../models/errors";
import { getBaseUrl, mergeMaybe, stacContext } from "../utils";
import { CMR_QUERY_MAX } from "../domains/stac";
import { ALL_PROVIDER } from "../domains/providers";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const generateSelfLinks = (req: Request, nextCursor?: string | null, count?: number): Links => {
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

  const { provider } = req;
  if (provider && provider["provider-id"] != ALL_PROVIDER) {
    links.push({
      rel: "search",
      href: `${path}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "GET",
    });
    links.push({
      rel: "search",
      href: `${path}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "POST",
    });
  }

  const originalQuery = mergeMaybe(req.query, req.body);

  // Add a 'next' link if there are more results available
  // This is determined by:
  //  1. The presence of a nextCursor (indicating more results)
  //  2. The number of collection equaling CMR_QUERY_MAX (100)
  // The 'next' link includes the original query parameters plus the new cursor
  if (nextCursor && count === CMR_QUERY_MAX) {
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
): Promise<
  [null, { id: string; title: string; provider: string }[], string | null] | [string, null]
> => {
  const { headers, provider, query } = req;

  const cloudOnly = headers["cloud-stac"] === "true" ? { cloudHosted: true } : {};

  const mergedQuery = mergeMaybe(
    {
      provider: provider?.["provider-id"],
      cursor: query?.cursor,
    },
    { ...cloudOnly }
  );

  try {
    if ("provider" in mergedQuery && mergedQuery.provider == ALL_PROVIDER)
      delete mergedQuery.provider;
    const { items, cursor } = await getAllCollectionIds(mergedQuery, { headers });
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

  const selfLinks = generateSelfLinks(req, cursor, collections?.length);

  const childLinks = (collections ?? []).map(({ id, title, provider }) => ({
    rel: "child",
    href: `${getBaseUrl(self).replace("ALL", provider)}/collections/${encodeURIComponent(id)}`,
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
