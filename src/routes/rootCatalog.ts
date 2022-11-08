import { Request, Response } from "express";
import { Link, STACCatalog } from "../@types/StacCatalog";
import {
  getCloudProviders,
  getProviders,
  conformance,
} from "../domains/providers";
import { Provider as CmrProvider } from "../models/CmrModels";
import { buildRootUrl, ERRORS } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (root: string): Link[] => {
  const id = "STAC";

  return [
    {
      rel: "self",
      href: root,
      title: `NASA CMR-${id} Root Catalog`,
      type: "application/json",
    },
    {
      rel: "root",
      href: root,
      title: `NASA CMR-${id} Root Catalog`,
      type: "application/json",
    },
    {
      rel: "about",
      href: "https://wiki.earthdata.nasa.gov/display/ED/CMR+SpatioTemporal+Asset+Catalog+%28CMR-STAC%29+Documentation",
      title: `NASA CMR-${id} Documentation`,
      type: "application/json",
    },
  ];
};

const providerLinks = (root: string, providers: CmrProvider[]): Link[] => {
  return providers.map((provider) => {
    return {
      title: provider["short-name"],
      rel: "child",
      type: "application/json",
      href: `${root}/${provider["provider-id"]}`,
    };
  });
};

export const conformanceHandler = (_: Request, res: Response): any =>
  res.json(conformance);

export const rootCatalogHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  const isCloudStac = req.headers["cloud-stac"] === "true";
  const id = isCloudStac ? "CLOUDSTAC" : "STAC";

  let providers: CmrProvider[] = [];
  try {
    providers = isCloudStac ? await getCloudProviders() : await getProviders();
  } catch (err) {
    console.error("A problem occurred getting providers", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }

  const appRoot = buildRootUrl(req);
  const _selfLinks = selfLinks(appRoot);
  const _providerLinks = providerLinks(appRoot, providers);

  const rootCatalog = {
    id,
    title: `NASA' Common Metadata Repository ${id} API`,
    stac_version: STAC_VERSION,
    type: "Catalog",
    description: `This is the landing page for CMR-${id}. Each provider link contains a STAC endpoint.`,
    links: [..._selfLinks, ..._providerLinks],
  } as STACCatalog;

  return res.json(rootCatalog);
};
