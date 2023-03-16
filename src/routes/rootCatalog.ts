import { Request, Response } from "express";
import { Link, STACCatalog } from "../@types/StacCatalog";

import { conformance } from "../domains/providers";
import { Provider } from "../models/CmrModels";
import { stacContext } from "../utils";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";

const selfLinks = (req: Request): Link[] => {
  const { stacRoot, id } = stacContext(req);

  return [
    {
      rel: "self",
      href: stacRoot,
      type: "application/json",
      title: `NASA CMR-${id} Root Catalog`,
    },
    {
      rel: "root",
      href: stacRoot,
      title: `NASA CMR-${id} Root Catalog`,
      type: "application/geo+json",
    },
    {
      rel: "service-desc",
      href: `${stacRoot}/docs/swagger.json`,
      title: "OpenAI Documentation",
      type: "application/vnd.oai.openapi+json;version=3.0",
    },
    {
      rel: "service-doc",
      href: "https://wiki.earthdata.nasa.gov/display/ED/CMR+SpatioTemporal+Asset+Catalog+%28CMR-STAC%29+Documentation",
      title: `NASA CMR-${id} Documentation`,
      type: "text/html",
    },
  ];
};

const providerLinks = (req: Request, providers: Provider[]): Link[] => {
  const { self } = stacContext(req);

  return providers.map(({ "short-name": title, "provider-id": providerId }) => ({
    rel: "child",
    title,
    type: "application/json",
    href: `${self}/${providerId}`,
  }));
};

export const rootCatalogHandler = async (req: Request, res: Response) => {
  const isCloudStac = req.headers["cloud-stac"] === "true";
  const id = isCloudStac ? "CMR-CLOUDSTAC" : "CMR-STAC";

  const providers = isCloudStac
    ? req.cache?.cloudProviders.getAll()
    : req.cache?.providers.getAll();

  const _selfLinks = selfLinks(req);
  const _providerLinks = providerLinks(req, providers ?? []);

  const rootCatalog = {
    type: "Catalog",
    id,
    stac_version: STAC_VERSION,
    conformsTo: conformance,
    links: [..._selfLinks, ..._providerLinks],
    title: `NASA Common Metadata Repository ${id} API`,
    description: `This is the landing page for ${id}. Each provider link contains a STAC endpoint.`,
  } as STACCatalog;

  res.json(rootCatalog);
};
