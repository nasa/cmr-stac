import { Request, Response, NextFunction } from "express";
import { IncomingHttpHeaders } from "http";
import { isPlainObject } from "lodash";

export type OptionalString = string | null;

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

  const protocol = headers["cloudfront-forwarded-proto"] ?? headers["x-forwarded-proto"] ?? "http";

  const host = headers["x-forwarded-host"] ?? headers["host"] ?? "localhost:3000";

  return `${protocol}://${host}`;
};

export const buildClientId = (clientId?: string): string =>
  clientId ? `${clientId}-cmr-stac` : "cmr-stac";

/**
 * Wrap express handler with async error handling.
 */
export const wrapErrorHandler = (fn: (rq: Request, rs: Response) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Returns second to last value in a relatedUrl
 * to be used as a key for thumbnail assets link.
 * Defaults to string 'key' in the case of an unexpected URL format.
 */
export const extractAssetMapKey = (relatedUrl: string) => {
  const urlArray = relatedUrl.split(".");
  return urlArray[urlArray.length - 2] ? urlArray[urlArray.length - 2] : "asset_key";
};

export const stacContext = (req: Request) => {
  const { headers, originalUrl } = req;
  const isCloudStac = headers["cloud-stac"] === "true";
  const root = buildRootUrl(req);
  const stac = isCloudStac ? "cloudstac" : "stac";
  // default to empty string so `undefined` isn't printed
  const path = originalUrl.split("?")[0] ?? "";

  return {
    id: isCloudStac ? "CLOUDSTAC" : "STAC",
    root,
    stacRoot: `${root}/${stac}`,
    path: `${root}${path}`.replace(/\/$/, ""),
    self: `${root}${originalUrl}`.replace(/\/$/, ""),
  };
};

/**
 * Merge non-trivial map entries.
 * Filters out
 * - null
 * - undefined
 * - NaN
 * - empty arrays
 * - empty strings
 */
export const mergeMaybe = (map: object, maybeMap?: unknown) => {
  const baseMap = map ?? {};
  if (!maybeMap || !isPlainObject(maybeMap)) return baseMap;

  const coerced: { [key: string]: unknown } = { ...maybeMap };

  return Object.keys(coerced).reduce(
    (nextMap, key) => {
      // JS safety
      if (!Object.prototype.hasOwnProperty.call(coerced, key)) return nextMap;

      // skip null or undefined, purposely not using ===
      if (coerced[key] == null) return nextMap;

      // skip empty strings
      if (typeof coerced[key] === "string" && (coerced[key] as string).trim() === "")
        return nextMap;

      // skip NaNs
      if (Number.isNaN(coerced[key])) return nextMap;

      // don't bother with empty arrays
      if (Array.isArray(coerced[key]) && (coerced[key] as Array<unknown>).length === 0)
        return nextMap;

      const keyPair: { [key: string]: unknown } = {};
      keyPair[key] = coerced[key];
      return { ...nextMap, ...keyPair };
    },
    { ...baseMap }
  );
};

/**
 * Scrub the `authorization` header when present and return updated.
 * This should only be used for logging purposes as it destroys the token.
 */
export const scrubTokens = (headers: IncomingHttpHeaders) => {
  if (!("authorization" in headers)) return headers;
  const { authorization } = headers;
  return {
    ...headers,
    authorization: `${(authorization as string).substring(0, 12)}... REDACTED`,
  };
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
  tree: { [key: string]: unknown },
  nodes: string[] = []
): { key: string[]; value: unknown }[] => {
  return Object.keys(tree).flatMap((key: string) => {
    if (isPlainObject(tree[key])) {
      return flattenTree(tree[key] as { [key: string]: unknown }, [...nodes, key]);
    } else {
      return { key: [...nodes, key], value: tree[key] };
    }
  });
};

/**
 * Return all versions of an ID where a separator could be substituted.
 *
 * In the case of a collection ID containing the legacy separator we may be
 * incorrectly guessing which separator to replace when converting to entry_id.
 * Therefore we need to search using all possible variations.
 *
 * @example
 * ambiguateCollectionId("abc.v1.v2.1999", ".v", "_") =>
 * ["abc_1.v2.1999", "abc.v1_2.1999", "abc.v1.v2.1999"]
 */
export const generatePossibleCollectionIds = (id: string, separator: string, replacement: string) =>
  id.split(separator).map((currentToken, idx, tokens) => {
    if (idx + 1 >= tokens.length) {
      return tokens.join(separator);
    }

    const mergedToken = currentToken + replacement + tokens[idx + 1];
    // splice mutates the original so use a copy
    const tokensCopy = [...tokens];
    // splice returns the replaced objects, not the resulting array
    tokensCopy.splice(idx, 2, mergedToken);

    return tokensCopy.join(separator);
  });
