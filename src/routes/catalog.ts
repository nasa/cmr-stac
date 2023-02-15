import { Request, Response } from "express";

import { Links, STACCatalog } from "../@types/StacCatalog";

import { getAllCollectionIds } from "../domains/collections";
import { conformance } from "../domains/providers";
import { ServiceUnavailableError } from "../models/errors";
import { mergeMaybe, stacContext } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const generateSelfLinks = (req: Request): Links => {
  const { stacRoot, path, self } = stacContext(req);

  return [
    {
      rel: "self",
      href: self,
      type: "application/json",
      title: "Provider Catalog",
    },
    {
      rel: "root",
      href: stacRoot,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "data",
      href: `${path}/collections`,
      type: "application/json",
      title: "Provider Collections",
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
};

const providerCollections = async (req: Request) => {
  const { headers, provider } = req;

  const cloudOnly =
    headers["cloud-stac"] === "true" ? { cloudHosted: true } : {};

  const query = mergeMaybe(
    { provider: provider?.["provider-id"] },
    { ...cloudOnly }
  );

  try {
    const { items } = await getAllCollectionIds(query, {
      headers,
    });

    return [null, items];
  } catch (err) {
    console.error("A problem occurred querying for collections.", err);
    return [(err as Error).message, null];
  }
};

export const providerCatalogHandler = async (req: Request, res: Response) => {
  const { provider } = req;

  const [err, collections] = await providerCollections(req);

  if (err) throw new ServiceUnavailableError(err as string);

  const { self } = stacContext(req);

  const selfLinks = generateSelfLinks(req);
  const childLinks = (
    collections as { conceptId: string; title: string }[]
  ).map(({ conceptId, title }) => ({
    rel: "child",
    href: `${self}/collections/${conceptId}`,
    title,
    type: "application/json",
  }));

  const providerCatalog = {
    type: "Catalog",
    id: provider!["provider-id"],
    title: `${provider!["short-name"]} STAC Catalog`,
    stac_version: STAC_VERSION,
    description: `Root STAC catalog for ${provider!["short-name"]}`,
    conformsTo: conformance,
    links: [...selfLinks, ...childLinks],
  } as STACCatalog;

  res.json(providerCatalog);
};
