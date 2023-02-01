import { Request, Response } from "express";

import { Links, STACCatalog } from "../@types/StacCatalog";
import { buildRootUrl, mergeMaybe, ERRORS } from "../utils";
import { CMR_QUERY_MAX, stringifyQuery } from "../domains/stacQuery";
import { getCollectionIds } from "../domains/collections";
import { convertDateTime } from "../utils/datetime";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (
  root: string,
  req: Request,
  providerId: string,
  nextCursor?: string | null
): Links => {
  const originalQuery = mergeMaybe(req.query, req.body);

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
      rel: "data",
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

  if (nextCursor) {
    const nextResultsQuery = { ...originalQuery };
    nextResultsQuery.cursor = nextCursor;

    links.push({
      rel: "next",
      href: `${root}/${providerId}/collections?${stringifyQuery(
        nextResultsQuery
      )}`,
      type: "application/json",
      title: `Next page of collections by ${providerId}`,
    });
  }

  return links;
};

const collectionsLinks = (
  root: string,
  providerId: string,
  collectionIds: string[]
) => {
  return collectionIds.map((id) => {
    return {
      rel: "child",
      href: `${root}/${providerId}/collections/${id}`,
      type: "application/geo+json",
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
        ? CMR_QUERY_MAX
        : Number(req.query.limit),
      ...cloudOnly,
    }
  );

  let collections = [];
  let pageCursor;
  let matched = 0;
  try {
    const { conceptIds, cursor, count } = await getCollectionIds(query, {
      headers: req.headers,
    });
    collections = conceptIds;
    pageCursor = cursor;
    matched = count;
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
    conformsTo: [],
    links: [..._selfLinks, ..._childLinks],
  } as STACCatalog;

  providerCatalog.context = {
    returned: collections.length,
    limit: query.limit,
    matched,
  };

  res.json(providerCatalog);
};
