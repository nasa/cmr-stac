import { Request, Response, NextFunction } from "express";

export const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const ERRORS = {
  internalServerError: {
    status: 500,
    errors: [
      "Oops! Something has gone wrong. We have been alerted and are working to resolve the problem. Please try your request again later.",
    ],
  },
  serviceUnavailable: {
    status: 503,
    errors: [
      "Oops! A problem occurred upstream and we were unable to process your request. We have been alerted and are working to resolve the problem. Please try your request again later.",
    ],
  },
};

export const buildRootUrl = (req: Request): string => {
  const stacPath = req.baseUrl;
  const protocol =
    req.headers["cloudfront-forwarded-proto"] ??
    req.headers["x-forwarded-proto"] ??
    "http";
  const host =
    req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost:3000";

  return `${protocol}://${host}${stacPath}`;
};

export const buildClientId = (clientId?: string): string => {
  if (clientId) return `${clientId}-cmr-stac`;
  else return "cmr-stac";
};

/**
 * Wrap express handler with async error handling.
 */
export const makeAsyncHandler = (fn: Function) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Merge non-trivial map entries.
 * Filters out
 * - null
 * - undefined
 * - empty arrays
 * - empty strings
 */
export const mergeMaybe = (
  map: { [key: string]: any },
  maybeMap: { [key: string]: any }
) => {
  return Object.keys(maybeMap).reduce((nextMap, key) => {
    // JS safety
    if (!maybeMap.hasOwnProperty(key)) return nextMap;

    // skip null and undefined
    if (maybeMap[key] === null || maybeMap[key] === undefined) return nextMap;

    // skip emptyStrings
    if (typeof maybeMap[key] === "string" && maybeMap[key].trim() === "")
      return nextMap;

    // don't bother with empty arrays
    if (Array.isArray(maybeMap[key]) && maybeMap[key].length === 0)
      return nextMap;

    const keyPair: { [k: string]: any } = {};
    keyPair[key] = maybeMap[key];
    return { ...nextMap, ...keyPair };
  }, map);
};
