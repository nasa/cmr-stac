import { query, Request, Response } from "express";

import { Links, STACCatalog } from "../@types/StacCatalog";
import { STACCollection } from "../@types/StacCollection";
import { buildRootUrl, mergeMaybe, ERRORS } from "../utils";
import { getCollections } from "../domains/collections";
import { convertDateTime } from "../utils/datetime";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (
  root: string,
  req: Request,
  providerId: string,
  cursor?: string | null
): Links => {
  const links = [
    {
      rel: "self",
      href: `${root}${req.url}`,
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
    {
      rel: "first",
      href: `${root}/${providerId}/collections`,
      type: "application/json",
      title: `First page of collections by ${providerId}`,
    },
  ];
  
  if (cursor) {
    links.push({
      rel: "next",
      href: `${root}/${providerId}/collections?cursor=${cursor}${encodeQuery(req.query)}`,
      type: "application/json",
      title: `Next page of collections by ${providerId}`,
    });
  }

  return links;
};

const encodeQuery = (
  params: any
) => {
  let queryUrlString = "";
  Object.keys(params).forEach((key) => {
    queryUrlString += `&${key}=${params[key]}`
  });
  return queryUrlString;
}

const generateCollectionLinks = (
  root: string,
  providerId: string,
  collection: STACCollection
) => {
  return [
    {
      rel: "self",
      href: `${root}/${providerId}/collections/${collection.id}`,
      title: "Info about this collection",
      type: "application/json",
    },
    {
      rel: "root",
      href: `${root}`,
      title: "Root catalog",
      type: "application/json",
    },
    {
      rel: "parent",
      href: `${root}/${providerId}`,
      title: "Parent catalog",
      type: "application/json",
    },
    {
      rel: "items",
      href: `${root}/${providerId}/collections/${collection.id}/items`,
      title: "STAC Items in this collection",
      type: "application/json",
    },
  ];
};

const collectionsLinks = (
  root: string,
  providerId: string,
  collections: STACCollection[]
) => {
  return collections.map((collection) => {
    const {
      id,
      stac_version,
      license,
      title = "N/A",
      type,
      description = "N/A",
      extent,
      links,
    } = collection;
    return {
      id,
      stac_version,
      license,
      title,
      type,
      description,
      links: [
        ...generateCollectionLinks(root, providerId, collection),
        ...links,
      ],
      extent: { extent },
    };
  });
};

export const handler = async (req: Request, res: Response): Promise<any> => {
  const { providerId } = req.params;
  const cloudOnly =
    req.headers["cloud-stac"] === "true"
      ? { cloudHosted: true }
      : { cloudHosted: null };

  const query = mergeMaybe(
    { provider: providerId },
    {
      temporal: convertDateTime(req.query.datetime),
      sortKey: req.query.sortby,
      cursor: req.query.cursor,
      limit: Number.isNaN(Number(req.query.limit))
        ? 250
        : Number(req.query.limit),
      ...cloudOnly,
    }
  );

  let collections;
  let pageCursor;
  try {
    const { items, cursor } = await getCollections(query, {
      headers: req.headers,
    });
    collections = items;
    pageCursor = cursor;
  } catch (err) {
    console.error("A problem occurred querying for collections.", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }

  const root = buildRootUrl(req);
  const _selfLinks = selfLinks(root, req, providerId, pageCursor);
  const _childLinks = collectionsLinks(root, providerId, collections);
  const providerCatalog = {
    id: providerId,
    title: providerId,
    stac_version: STAC_VERSION,
    type: "Catalog",
    description: `Root catalog for ${providerId}`,
    links: [..._selfLinks],
    collections: [..._childLinks],
  } as STACCatalog;

  res.json(providerCatalog);
};
