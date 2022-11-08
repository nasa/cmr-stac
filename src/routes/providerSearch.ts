import { Request, Response } from "express";
import { parse as parseUrl, URLSearchParams } from "url";
import { flattenDeep } from "lodash";

import { Link } from "../@types/StacCatalog";
import { GeoJSONGeometry, STACItem } from "../@types/StacItem";

import { GranulesInput } from "../models/GraphQLModels";
import { getCollections } from "../domains/collections";
import { getItems, addProviderLinks } from "../domains/items";
import { mergeMaybe, buildRootUrl, ERRORS } from "../utils";
import { InvalidParameterError } from "../models/errors";

const STAC_VERSION = process.env.STAC_VERSION ?? "1.0.0";
const DEFAULT_LIMIT = 250;

const selfLinks = (
  root: string,
  cursor: string | null,
  req: Request
): Link[] => {
  const { providerId } = req.params;
  const parsedUrl = parseUrl(req.originalUrl);

  const originalQuery = new URLSearchParams(parsedUrl.query ?? "");
  originalQuery.delete("cursor");

  let links = [
    {
      rel: "self",
      href: `${root}${req.originalUrl}`,
      type: "application/geo+json",
      title: "This search",
    },
    {
      rel: "root",
      href: `${root}`,
      type: "application/json",
      title: `Root Catalog`,
    },
    {
      rel: "provider",
      href: `${root}/${providerId}`,
      type: "application/json",
      title: `Provider Catalog`,
    },
    {
      rel: "first",
      href: `${root}/${providerId}/search?${originalQuery.toString()}`,
      type: "application/geo+json",
      title: "First page of results",
    },
  ];

  if (cursor) {
    const newQuery = new URLSearchParams(parsedUrl.query ?? "");
    newQuery.set("cursor", cursor);
    links = [
      ...links,
      {
        rel: "next",
        href: `${root}/${providerId}/search?${newQuery.toString()}`,
        type: "application/json",
        title: "Next page of results",
      },
    ];
  }

  return links;
};

export const stringToGeoJSON = (geometry: string): GeoJSONGeometry => {
  try {
    const geoJson = JSON.parse(geometry);
    if (!geoJson.type) {
      console.info(`Missing 'type' from GeoJSON geometry [${geometry}]`);
      throw new InvalidParameterError(
        "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
      );
    }

    if (!geoJson.coordinates) {
      console.info(`Missing 'coordinates' from GeoJSON geometry [${geometry}]`);
      throw new InvalidParameterError(
        "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
      );
    }
    return geoJson as GeoJSONGeometry;
  } catch (err) {
    console.info(
      `Failed to parse geoJSON [${geometry}] : ${(err as Error).message}`
    );
    throw new InvalidParameterError(
      "Invalid intersects parameter detected. Please verify it is a valid GeoJSON geometry."
    );
  }
};

export const geoJsonToQuery = (geoJson: string | string[]) => {
  const geometryStrings = Array.isArray(geoJson) ? geoJson : [geoJson];

  const [polygons, lines, points] = geometryStrings.map(stringToGeoJSON).reduce(
    ([polygons, lines, points], geometry: GeoJSONGeometry) => {
      const flattened = flattenDeep(geometry.coordinates).join(",");

      switch (geometry.type.toLowerCase()) {
        case "point":
        case "multipoint":
          return [[...polygons], [...lines], [...points, flattened]];

        case "linestring":
          return [[...polygons], [...lines, flattened], [...points]];
        case "multilinestring":
          console.warn(
            "Gaps in linestrings are not supported for intersects yet"
          );
          return [[...polygons], [...lines, flattened], [...points]];
        case "polygon":
        case "multipolygon":
          console.warn(
            "Holes in polygons are not supported for intersects yet"
          );
          return [[...polygons, flattened], [...lines], [...points]];
        default:
          throw new InvalidParameterError(
            "Invalid intersects parameter detected. Please verify all intersects are a valid GeoJSON geometry."
          );
      }
    },
    [[] as string[], [] as string[], [] as string[]]
  );

  return { polygons, lines, points };
};

const buildQuery = async (req: Request) => {
  const limit = Number.isNaN(Number(req.query.limit))
    ? DEFAULT_LIMIT
    : Number(req.query.limit);

  const cloudOnly = req.headers["cloud-stac"] === "true";

  let gqlQuery: GranulesInput = {
    provider: req.params.providerId,
    limit,
  };

  // TODO in CLOUDSTAC validate query.collections are in-fact cloudhosted
  gqlQuery = mergeMaybe(gqlQuery, {
    cursor: req.query.cursor,
    boundingBox: req.query.bbox,
    conceptIds: req.query.ids,
    collectionConceptIds: req.query.collections,
  });

  if (req.query.intersects) {
    const { polygons, lines, points } = geoJsonToQuery(
      req.query.intersects.toString()
    );
    gqlQuery = mergeMaybe(gqlQuery, {
      polygon: polygons,
      line: lines,
      point: points,
    });
  }

  if (cloudOnly && req.query.collections) {
    // have to search by collectionConceptIds and not provider to filter on 'cloudHosted'
    const { items: collections } = await getCollections(
      {
        provider: req.params.providerId,
        cloudHosted: true,
        hasGranules: true,
      },
      { headers: req.headers }
    );

    gqlQuery = {
      ...gqlQuery,
      collectionConceptIds: collections.map((c) => c.id),
    } as GranulesInput;
  }
  return gqlQuery;
};

export const handler = async (req: Request, res: Response): Promise<any> => {
  const root = buildRootUrl(req);
  const providerId = req.params.providerId!;

  const gqlQuery = await buildQuery(req);

  let itemsResponse;
  try {
    itemsResponse = await getItems(gqlQuery, { headers: req.headers });
  } catch (err) {
    console.error("A problem occurred retrieving granules", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }
  const { count, cursor, items } = itemsResponse;
  const features = items.map((item: STACItem) =>
    addProviderLinks(root, providerId, item)
  );

  const _selfLinks = selfLinks(root, cursor, req);

  res.json({
    type: "FeatureCollection",
    stac_version: STAC_VERSION,
    numberMatched: count,
    numberReturned: features.length,
    features,
    links: [..._selfLinks],
    context: {
      returned: features.length,
      matched: count,
      limit: req.query.limit ?? DEFAULT_LIMIT,
    },
  });
};
