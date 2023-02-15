import { Request, Response, NextFunction } from "express";

export const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const ERRORS = {
  internalServerError:
    "Oops! Something has gone wrong. We have been alerted and are working to resolve the problem. Please try your request again later.",
  serviceUnavailable:
    "Oops! A problem occurred upstream and we were unable to process your request. We have been alerted and are working to resolve the problem. Please try your request again later.",
};

/**
 * Builds the root STAC url from the request.
 */
export const buildRootUrl = (req: Request): string => {
  const { headers } = req;

  const protocol =
    headers["cloudfront-forwarded-proto"] ??
    headers["x-forwarded-proto"] ??
    "http";

  const host =
    headers["x-forwarded-host"] ?? headers["host"] ?? "localhost:3000";

  return `${protocol}://${host}`;
};

export const buildClientId = (clientId?: string): string => {
  if (clientId) return `${clientId}-cmr-stac`;
  return "cmr-stac";
};

/**
 * Wrap express handler with async error handling.
 */
export const wrapErrorHandler = (fn: (rq: Request, rs: Response) => any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

export const stacContext = (req: Request) => {
  const { headers, originalUrl } = req;
  const isCloudStac = headers["cloud-stac"] === "true";
  const root = buildRootUrl(req);
  const stac = isCloudStac ? "cloudstac" : "stac";
  // default to empty string so `undefined` isn't printed
  const path = originalUrl.split("?")[0] ?? "";

  return {
    id: isCloudStac ? "CLOUD-STAC" : "STAC",
    root,
    stacRoot: `${root}/${stac}`,
    path: `${root}${path}`,
    self: `${root}${originalUrl}`,
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
  map: { [key: string]: any } | any,
  maybeMap?: { [key: string]: any }
) => {
  const baseMap = map ?? {};
  if (!maybeMap) return baseMap;

  return Object.keys(maybeMap).reduce((nextMap, key) => {
    // JS safety
    if (!Object.prototype.hasOwnProperty.call(maybeMap, key)) return nextMap;

    // skip null or undefined, purposely not using ===
    if (maybeMap[key] == null) return nextMap;

    // skip emptyStrings
    if (typeof maybeMap[key] === "string" && maybeMap[key].trim() === "")
      return nextMap;

    // don't bother with empty arrays
    if (Array.isArray(maybeMap[key]) && maybeMap[key].length === 0)
      return nextMap;

    const keyPair: { [k: string]: any } = {};
    keyPair[key] = maybeMap[key];
    return { ...nextMap, ...keyPair };
  }, baseMap);
};

export const scrubTokens = (headers: any) => {
  if (headers && headers["authorization"]) {
    return {
      ...headers,
      authorization: `${headers.authorization.substring(0, 12)}... REDACTED`,
    };
  }
  return headers;
};

export const isPlainObject = (input: any) => {
  return input && !Array.isArray(input) && typeof input === "object";
};

/**
 * Return a JSON object as an array of nodes with a leaf value.
 *
 * @example
 * This tree has a single leaf
 * {a: {b: c}} => [ {key: [a,b]}, value: c} ]
 *
 * @example
 * This tree has 2 leaves
 * {a: {b: z, c: y}} => [ {key: [a,b]}, value: z},
 *                        {key: [a,c]}, value: y} ]
 */
export const flattenTree = (
  tree: { [key: string]: any },
  nodes: string[] = []
): { key: string[]; value: any }[] => {
  return Object.keys(tree).flatMap((key: string) => {
    if (isPlainObject(tree[key])) {
      return flattenTree(tree[key], [...nodes, key]);
    } else {
      return { key: [...nodes, key], value: tree[key] };
    }
  });
};
