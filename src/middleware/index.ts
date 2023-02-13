import { Request, Response, NextFunction } from "express";

import { Provider } from "../models/CmrModels";
import { StacQuery } from "../models/StacModels";
import {
  InvalidParameterError,
  ItemNotFound,
  ServiceUnavailableError,
} from "../models/errors";

import { WarmCache } from "../domains/cache";
import { getCollections } from "../domains/collections";
import { parseOrdinateString } from "../domains/bounding-box";
import { getProviders, getCloudProviders } from "../domains/providers";

import { scrubTokens, mergeMaybe, ERRORS } from "../utils";
import { validDateTime } from "../utils/datetime";
import { uniq } from "lodash";

const STAC_QUERY_MAX = 5000;

// Will live in warm lambda instances for 10 minutes
const cachedProviders = new WarmCache<Provider>();
const cachedCloudProviders = new WarmCache<Provider>();

/**
 * Debug log relevant information for a request.
 */
export const logFullRequestMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.debug(
    `\n` +
      `PATH: ${req.path}\n` +
      `METHOD: ${req.method}\n` +
      `HOSTNAME: ${req.hostname}\n`,
    `HEADERS: ${JSON.stringify(scrubTokens(req.headers), null, 2)}\n` +
      `QUERY: ${JSON.stringify(req.query, null, 2)}\n` +
      `BODY: ${JSON.stringify(req.body, null, 2)}\n` +
      `URL: ${req.url}\n` +
      `ORIGINAL_URL: ${req.originalUrl}\n` +
      `BASE_URL: ${req.baseUrl}\n` +
      `PARAMS: ${JSON.stringify(req.params, null, 2)}`
  );
  next();
};

export const cacheMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.cache = {
    providers: cachedProviders,
    cloudProviders: cachedCloudProviders,
  };

  if (process.env.IS_LOCAL === "true") {
    req.on("end", () => {
      req.cache?.providers.clear();
      req.cache?.cloudProviders.clear();
    });
  }

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
export const notFoundHandler = (_req: Request, res: Response) =>
  res
    .status(404)
    .json({ errors: ["Oops! Unable to find the requested resource."] });

/**
 * Top level error handler
 * This *MUST* contain all 4 parameters
 */
export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof InvalidParameterError) {
    res.status(400).json({ errors: [err.message] });
  } else if (err instanceof ItemNotFound) {
    res.status(404).json({ errors: [err.message] });
  } else if (err instanceof ServiceUnavailableError) {
    res.status(503).json({ errors: [err.message] });
  } else {
    console.error("A fatal error occurred", err);
    res
      .status(err.status ?? 500)
      .json({ errors: [ERRORS.internalServerError] });
  }
};

export const refreshProviderCache = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const isCloudStacReq = req.headers["cloud-hosted"] === "true";

  if (
    cachedProviders.isEmpty() ||
    (isCloudStacReq && cachedCloudProviders.isEmpty())
  ) {
    const [errs, updatedProviders] = await getProviders();

    if (errs)
      return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));

    updatedProviders!.forEach((provider) => {
      cachedProviders.set(provider["provider-id"], provider);
    });

    // update cloud-hosted if necessary for this call
    if (isCloudStacReq) {
      const [searchErrs, cloudProvs] = await getCloudProviders(
        cachedProviders.getAll()
      );

      if (searchErrs)
        return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));

      cloudProvs.forEach((cloudProv) =>
        cachedCloudProviders.set(cloudProv["provider-id"], cloudProv)
      );
    }
  }

  next();
};

/**
 * Middleware validates the provider in the route is valid and exists.
 *
 * If the provider is found, the `provider` is attached to the request.
 * If the provider does not exist, it exits early with a 404.
 * If a problem occurs retrieving the information, a 503 is returned.
 */
export const validateProvider = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.params.providerId) {
    return next();
  }

  const { providerId } = req.params;
  const isCloudStacReq = req.headers["cloud-hosted"] === "true";

  const provider = isCloudStacReq
    ? req.cache?.cloudProviders.get(providerId)
    : req.cache?.providers.get(providerId);

  if (!provider && isCloudStacReq) {
    next(
      new ItemNotFound(
        `Provider [${providerId}] not found or is does not have any visible cloud hosted collections.`
      )
    );
  } else if (!provider) {
    next(new ItemNotFound(`Provider [${providerId}] not found.`));
  } else {
    req.provider = provider;
    next();
  }
};

/**
 * Middleware that adds the `collection` to the request object.
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
  _res: Response,
  next: NextFunction
) => {
  const {
    headers,
    params: { providerId, collectionId },
  } = req;
  const query = { provider: providerId, conceptId: collectionId };

  try {
    const {
      items: [collection],
    } = await getCollections(query, { headers });

    if (!collection)
      return next(
        new ItemNotFound(
          `Collection with ID [${collectionId}] in provider [${providerId}] not found.`
        )
      );

    req.collection = collection;
  } catch (err) {
    console.error(
      "A problem occurred querying for collections.",
      (err as Error).stack
    );
    return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));
  }
  next();
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
    validLon(swLon) &&
    validLat(swLat) &&
    validLon(neLon) &&
    validLat(neLat) &&
    swLat <= neLat &&
    swLon <= neLon
  );
};

const validateStacOrThrow = (query: StacQuery) => {
  const { bbox, intersects, datetime, limit: strLimit } = query;

  const limit = Number.isNaN(Number(strLimit)) ? null : Number(strLimit);

  if (limit && (limit < 0 || limit > STAC_QUERY_MAX)) {
    return new InvalidParameterError(
      `Limit must be between 0 and ${STAC_QUERY_MAX}`
    );
  }

  if (bbox && !validBbox(bbox)) {
    return new InvalidParameterError(
      `BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.`
    );
  }

  if (bbox && intersects) {
    return new InvalidParameterError(
      "Query params BBOX and INTERSECTS are mutually exclusive. You may only use one at a time."
    );
  }

  if (datetime && !validDateTime(datetime)) {
    return new InvalidParameterError(
      "Query param datetime does not match a valid date format. Please use RFC3339 or ISO8601 formatted datetime strings."
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
  // this feels hacky, check express decoding for proper handling of "+" symbol
  // this is for timestamps with offsets i.e. 1937-01-01T12:00:27.87+01:00
  if (req.query.datetime) {
    req.query.datetime = req.query.datetime.replace(" ", "+");
  }

  const query = mergeMaybe(req.query, req.body);
  next(validateStacOrThrow(query));
};
