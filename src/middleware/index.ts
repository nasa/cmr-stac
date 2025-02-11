import { Request, Response, NextFunction } from "express";

import { SortObject, StacQuery } from "../models/StacModels";
import {
  ErrorHandler,
  InvalidParameterError,
  ServiceUnavailableError,
  ItemNotFound,
} from "../models/errors";

import { WarmProviderCache } from "../domains/cache";
import { getCollections } from "../domains/collections";
import { parseOrdinateString } from "../domains/bounding-box";
import { ALL_PROVIDER, getProviders, getCloudProviders, ALL_PROVIDERS } from "../domains/providers";

import { scrubTokens, mergeMaybe, ERRORS } from "../utils";
import { validDateTime } from "../utils/datetime";
import { parseSortFields } from "../utils/sort";

const STAC_QUERY_MAX = 5000;

// Will live in warm lambda instances for 10 minutes
const cachedProviders = new WarmProviderCache();
const cachedCloudProviders = new WarmProviderCache();

/**
 * Debug log relevant information for a request.
 */
export const logFullRequestMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  console.debug(
    `\n` + `PATH: ${req.path}\n` + `METHOD: ${req.method}\n` + `HOSTNAME: ${req.hostname}\n`,
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

export const cacheMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  req.cache = {
    providers: cachedProviders,
    cloudProviders: cachedCloudProviders,
  };

  if (process.env.NODE_ENV !== "production") {
    req.on("end", () => {
      req.cache?.providers.clear();
      req.cache?.cloudProviders.clear();
    });
  }

  next();
};

export const cloudStacMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const cloudStacRx = /^\/cloudstac.*/gi;
  if (cloudStacRx.test(req.originalUrl)) {
    req.headers["cloud-stac"] = "true";
  }
  next();
};

/**
 * Top level not found handler.
 */
export const notFoundHandler = (_req: Request, res: Response) =>
  res.status(404).json({ errors: ["Oops! Unable to find the requested resource."] });

/**
 * Top level error handler
 * This *MUST* contain all 4 parameters
 */
export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  if ("handle" in (err as ErrorHandler)) {
    // use mixin applied error handler if it's a custom error type
    (err as ErrorHandler).handle(err as Error, req, res, next);
  } else {
    // handle any other top level error
    console.error("A fatal error occurred", err);
    res.status(500).json({ errors: [ERRORS.internalServerError] });
  }
};

export const refreshProviderCache = async (req: Request, _res: Response, next: NextFunction) => {
  const isCloudStacReq = req.headers["cloud-stac"] === "true";

  if (cachedProviders.isEmpty() || (isCloudStacReq && cachedCloudProviders.isEmpty())) {
    const [errs, updatedProviders] = await getProviders();

    if (errs || !updatedProviders) {
      return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));
    }
    updatedProviders;
    updatedProviders.push(ALL_PROVIDERS);
    updatedProviders.forEach((provider) => {
      cachedProviders.set(provider["provider-id"], provider);
    });

    // update cloud-hosted if necessary for this call
    if (isCloudStacReq) {
      const [searchErrs, cloudProvs] = await getCloudProviders(cachedProviders.getAll());

      if (searchErrs) return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));

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
export const validateProvider = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.params.providerId) {
    return next();
  }

  const { providerId } = req.params;
  const isCloudStacReq = req.headers["cloud-stac"] === "true";

  const provider = isCloudStacReq
    ? await req.cache?.cloudProviders.get(providerId)
    : await req.cache?.providers.get(providerId);

  if (!provider && isCloudStacReq) {
    next(
      new ItemNotFound(
        `Provider [${providerId}] not found or does not have any visible cloud hosted collections.`
      )
    );
    // If it's not the 'ALL' provider and the provider ID cannot be found then throw an error
  } else if (!provider && providerId != ALL_PROVIDER.toString()) {
    next(new ItemNotFound(`Provider [${providerId}] not found.`));
  } else {
    req.provider = provider;
    next();
  }
};

/**
 * Middleware validates the provider in the route is not ALL.
 *  
 * This validation is only required for routes that will search CMR based on the provider
 * supplied.
 *
 * If the provider is not 'ALL' then validation passes.
 * If the provider is 'ALL', it exits early with a 404.

 */
export const validateNotAllProvider = async (req: Request, _res: Response, next: NextFunction) => {
  const { providerId } = req.params;

  if (providerId == ALL_PROVIDER.toString()) {
    next(
      new ItemNotFound(`This operation is not allowed for the ${ALL_PROVIDER.toString()} Catalog.`)
    );
  } else {
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
export const validateCollection = async (req: Request, _res: Response, next: NextFunction) => {
  const {
    headers,
    params: { providerId, collectionId },
  } = req;
  const query = { provider: providerId, entryId: [collectionId] };

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
    console.error("A problem occurred querying for collections.", (err as Error).stack);
    return next(new ServiceUnavailableError(ERRORS.serviceUnavailable));
  }
  next();
};

const inclusiveBetween = (v: number, mmin: number, mmax: number) => mmin <= v && v <= mmax;

const validLat = (lat: number) => inclusiveBetween(lat, -90.0, 90.0);

const validLon = (lon: number) => inclusiveBetween(lon, -180.0, 180.0);

// validBbox should be able to accept a comma separated string, a string array and
// a number array. We noticed the string array should be accepted when running the
// R Stac script.
export const validBbox = (bbox: string | string[] | number[]) => {
  const parsedBbox = typeof bbox === "string" ? parseOrdinateString(bbox) : bbox;

  if (parsedBbox.length !== 4 && parsedBbox.length !== 6) return false;

  let swLon, swLat, neLon, neLat;
  if (parsedBbox.length === 4) {
    [swLon, swLat, neLon, neLat] = parsedBbox;
  } else {
    [swLon, swLat, , neLon, neLat] = parsedBbox;
  }

  return (
    validLon(Number(swLon)) &&
    validLat(Number(swLat)) &&
    validLon(Number(neLon)) &&
    validLat(Number(neLat)) &&
    // Ensure that number comparisons are used instead of string comparisons
    Number(swLat) <= Number(neLat) &&
    Number(swLon) <= Number(neLon)
  );
};

const validFreeText = (freeText: string) => {
  // Check if it's a single keyword or multiple keywords separated by spaces
  // This allows for queries like "alpha beta" or "alpha%20beta"
  if (/^[^\s"]+(\s+[^\s"]+)*$/.test(freeText)) {
    return true;
  }

  // Check if it's a properly formatted phrase (enclosed in quotes)
  if (/^"[^""]+"$/.test(freeText)) {
    return true;
  }

  // If it doesn't match either pattern, it's invalid
  return false;
};

const VALID_SORT_FIELDS = ["startDate", "endDate", "id", "title", "eo:cloud_cover", "datetime"];

const validSortBy = (sortBy: string | string[] | SortObject[]) => {
  const fields: string[] = parseSortFields(sortBy);

  return fields.every((value) => {
    const isDescending = value.startsWith("-");
    const cleanSortBy = isDescending ? value.slice(1) : value;
    // Allow for `properties` prefix
    const fieldName = cleanSortBy.replace(/^properties\./, "");

    return VALID_SORT_FIELDS.includes(fieldName);
  });
};

const validateQueryTerms = (query: StacQuery) => {
  const { bbox, datetime, intersects, limit: strLimit, q: freeText, sortby } = query;

  const limit = Number.isNaN(Number(strLimit)) ? null : Number(strLimit);

  if (limit && (limit < 0 || limit > STAC_QUERY_MAX)) {
    return new InvalidParameterError(`Limit must be between 0 and ${STAC_QUERY_MAX}`);
  }

  if (bbox && !validBbox(bbox)) {
    return new InvalidParameterError(
      `BBOX must be in the form of 'bbox=swLon,swLat,neLon,neLat' with valid latitude and longitude.`
    );
  }

  if (bbox && intersects) {
    // NOTE: this is a STAC specification
    // https://github.com/radiantearth/stac-api-spec/tree/main/item-search#query-parameters-and-fields
    return new InvalidParameterError(
      "Query params BBOX and INTERSECTS are mutually exclusive. You may only use one at a time."
    );
  }

  if (datetime && !validDateTime(datetime)) {
    return new InvalidParameterError(
      "Query param datetime does not match a valid date format. Please use RFC3339 or ISO8601 formatted datetime strings."
    );
  }

  if (freeText && !validFreeText(freeText)) {
    return new InvalidParameterError(
      "Search query must be either a single keyword or a single phrase enclosed in double quotes."
    );
  }

  if (sortby && !validSortBy(sortby)) {
    return new InvalidParameterError(
      `Invalid sort field(s). Valid fields are: ${VALID_SORT_FIELDS.join(", ")}`
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
  // HACK: check express decoding for proper handling of "+" symbol
  // this is for timestamps with positive offsets i.e. 1937-01-01T12:00:27.87+01:00
  // which get deserialized into spaces, and break graphql queries.
  if (req.query.datetime) {
    req.query.datetime = req.query.datetime.replace(" ", "+");
  }

  const query = mergeMaybe(req.query, req.body);
  next(validateQueryTerms(query));
};
