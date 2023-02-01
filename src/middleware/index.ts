import { Request, Response, NextFunction } from "express";
import { ERRORS, scrubTokens, mergeMaybe } from "../utils";
import { validDateTime } from "../utils/datetime";
import { getProvider } from "../domains/providers";
import { getCollections } from "../domains/collections";
import { StacQuery } from "../models/StacModels";
import { InvalidParameterError } from "../models/errors";
import { parseOrdinateString } from "../domains/bounding-box";

const MAX_LIMIT_SIZE = 250;

export const logFullRequestMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.debug(
    `\n` +
      `PATH: ${req.path}\n` +
      `METHOD: ${req.method}\n` +
      `HEADERS: ${JSON.stringify(scrubTokens(req.headers), null, 2)}\n` +
      `QUERY: ${JSON.stringify(req.query, null, 2)}\n` +
      `BODY: ${JSON.stringify(req.body, null, 2)}\n` +
      `URL: ${req.url}`
  );
  next();
};

export const cloudStacMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.originalUrl.indexOf("/cloudstac") !== -1) {
    req.headers["cloud-stac"] = "true";
  }
  next();
};

/**
 * Top level not found handler
 */
export const notFoundHandler = (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  res
    .status(404)
    .json({ errors: ["Oops! Unable to find the requested resource."] });
  next();
};

/**
 * Top level error handler
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof InvalidParameterError) {
    return res.status(400).json({ errors: [err.message] });
  }

  console.error("A fatal error occurred", err);
  res.status(500).json(ERRORS.internalServerError);
  next();
};

/**
 * Middleware that adds `provider` to the request object.
 */
export const validateProvider = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { providerId } = req.params;

  try {
    const provider = await getProvider(providerId);

    if (!provider) {
      return res.status(404).json({
        errors: [`Provider [${providerId}] not found.`],
      });
    }

    req.provider = provider;

    next();
  } catch (err) {
    console.error("A problem occurred retrieving providers.", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }
};

/**
 * Middleware that adds the collection to the request object.
 * Should be used after the provider has been validated.
 *
 * @example
 * router.get('/stac/PROV/collections/COLL/items',
 *   validateProvider,
 *   validateCollection,
 *   (req, res)=> res.status(200));
 */
export const validateCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { providerId, collectionId } = req.params;
  const query = { provider: providerId, conceptId: collectionId };

  try {
    const {
      items: [collection],
    } = await getCollections(query, { headers: req.headers });

    if (!collection) {
      return res.status(404).json({
        errors: `Collection with ID [${collectionId}] in provider [${providerId}] not found.`,
      });
    }

    req.collection = collection;

    next();
  } catch (err) {
    console.error("A problem occurred querying for collections.", err);
    return res.status(503).json(ERRORS.serviceUnavailable);
  }
};

const inclusiveBetween = (v: number, mmin: number, mmax: number) =>
  mmin <= v && v <= mmax;

const validLat = (lat: number) => inclusiveBetween(lat, -90.0, 90.0);

const validLon = (lon: number) => inclusiveBetween(lon, -180.0, 180.0);

const validBbox = (bbox: string | number[]) => {
  const parsedBbox =
    typeof bbox === "string" ? parseOrdinateString(bbox) : bbox;

  if (parsedBbox.length !== 4 && parsedBbox.length !== 6) return false;

  let swLon, swLat, neLon, neLat;
  if (parsedBbox.length === 4) {
    [swLon, swLat, neLon, neLat] = parsedBbox;
  } else {
    [swLon, swLat, , neLon, neLat] = parsedBbox;
  }
  return (
    validLon(swLon) && validLat(swLat) && validLon(neLon) && validLat(neLat)
  );
};

const validateStacOrThrow = (query: StacQuery) => {
  const { bbox, intersects, datetime, limit: strLimit } = query;

  const limit = Number.isNaN(Number(strLimit)) ? null : Number(strLimit);

  if (limit && limit < 0) {
    throw new InvalidParameterError(`Limit may not be negative.`);
  }

  if (bbox && !validBbox(bbox)) {
    throw new InvalidParameterError(
      `BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.`
    );
  }

  if (bbox && intersects) {
    throw new InvalidParameterError(
      "Query params BBOX and INTERSECTS are mutually exclusive. You may only use one at a time."
    );
  }

  if (!validDateTime(datetime)) {
    throw new InvalidParameterError(
      "Query param datetime does not match any valid date format. Please use RFC3339 or ISO8601 valid dates."
    );
  }
};

/**
 * Middleware that validates query params.
 */
export const validateStacQuery = (
  req: Request<object, StacQuery, object, StacQuery>,
  _res: Response,
  next: NextFunction
) => {
  const query = mergeMaybe(req.query, req.body);
  validateStacOrThrow(query);

  next();
};
