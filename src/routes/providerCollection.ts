import { Request, Response } from "express";
import { buildRootUrl } from "../utils";
import { Link } from "../@types/StacCollection";
import { getCollections } from "../domains/collections";

const CMR_ROOT = process.env.CMR_URL;

const selfLinks = (req: Request): Link[] => {
  const root = buildRootUrl(req);
  const { providerId, collectionId } = req.params;

  return [
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
      rel: "parent",
      href: `${root}/${providerId}`,
      title: "Parent catalog",
      type: "application/json",
    },
    {
      rel: "items",
      href: `${root}${req.url}/items`,
      title: "STAC Items in this collection",
      type: "application/json",
    },
    {
      rel: "about",
      href: `${CMR_ROOT}/search/concepts/${collectionId}.html`,
      title: "HTML metadata for the collection",
      type: "text/html",
    },
    {
      rel: "via",
      href: `${CMR_ROOT}/search/concepts/${collectionId}.json`,
      title: "CMR JSON for the collection",
      type: "application/json",
    },
    {
      rel: "via",
      href: `${CMR_ROOT}/search/concepts/${collectionId}.umm_json`,
      title: "CMR UMM for the collection",
      type: "application/vnd.nasa.cmr.umm+json",
    },
  ];
};

export const handler = async (req: Request, res: Response): Promise<any> => {
  const { providerId, collectionId } = req.params;
  const query = { provider: providerId, conceptId: collectionId };

  const {
    items: [collection],
  } = await getCollections(query, { headers: req.headers });

  if (!collection) {
    return res.status(404).json({
      errors: `Collection with ID [${collectionId}] in provider [${providerId}] not found.`,
    });
  }

  collection.links = selfLinks(req);
  return res.json(collection);
};
