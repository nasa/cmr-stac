import { Request, Response } from "express";

import { Links, STACCatalog } from "../@types/StacCatalog";
import { STACCollection } from "../@types/StacCollection";
import { buildRootUrl, ERRORS } from "../utils";
import { getCollections } from "../domains/collections";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (root: string, providerId: string): Links => {
  return [
    {
      rel: "self",
      href: `${root}/${providerId}`,
      type: "application/json",
      title: "Provider Catalog",
    },
    {
      rel: "root",
      href: `${root}`,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "collections",
      href: `${root}/${providerId}/collections`,
      type: "application/json",
      title: "Provider Collections",
    },
    {
      rel: "search",
      href: `${root}/${providerId}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "GET",
    },
    {
      rel: "search",
      href: `${root}/${providerId}/search`,
      type: "application/geo+json",
      title: "Provider Item Search",
      method: "POST",
    },
    {
      rel: "conformance",
      href: `${root}/${providerId}/conformance`,
      type: "application/geo+json",
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

const collectionsLinks = (
  root: string,
  providerId: string,
  collections: STACCollection[]
) => {
  return collections.map((collection) => {
    return {
      rel: "child",
      href: `${root}/${providerId}/collections/${collection.id}`,
      type: "application/json",
    };
  });
};

export const handler = async (req: Request, res: Response): Promise<any> => {
  const providerId = req.params?.providerId;

  const cloudOnly =
    req.headers["cloud-stac"] === "true" ? { cloudHosted: true } : {};
  const query = { provider: providerId, ...cloudOnly };

  let collections;
  try {
    const { items } = await getCollections(query, { headers: req.headers });
    collections = items;
  } catch (err) {
    console.error("A problem occurred querying for collections.", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }

  const root = buildRootUrl(req);
  const _selfLinks = selfLinks(root, providerId);
  const _childLinks = collectionsLinks(root, providerId, collections);

  const providerCatalog = {
    id: providerId,
    title: providerId,
    stac_version: STAC_VERSION,
    type: "Catalog",
    description: `Root catalog for ${providerId}`,
    links: [..._selfLinks, ..._childLinks],
  } as STACCatalog;

  res.json(providerCatalog);
};
