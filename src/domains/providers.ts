import axios from "axios";

import { Provider } from "../models/CmrModels";
import { mergeMaybe } from "../utils";

const CMR_LB_URL = process.env.CMR_LB_URL;
const CMR_LB_INGEST = `${CMR_LB_URL}/ingest`;
const CMR_LB_SEARCH = `${CMR_LB_URL}/search`;
const CMR_LB_SEARCH_COLLECTIONS = `${CMR_LB_SEARCH}/collections`;

export const conformance = [
  "https://api.stacspec.org/v1.0.0-rc.2/core",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search",
  "https://api.stacspec.org/v1.0.0-rc.2/ogcapi-features",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#fields",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#features",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#query",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#sort",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#context",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
  "https://api.stacspec.org/v1.0.0-rc.2/collection-search",
  "https://api.stacspec.org/v1.0.0-rc.2/collection-search#free-text",
  "https://api.stacspec.org/v1.0.0-rc.2/collection-search#sort",
  "http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/simple-query",
];

/**
 * Return an array of providers found in CMR.
 */
export const getProviders = async (): Promise<[string, null] | [null, Provider[]]> => {
  try {
    const { data: providers } = await axios.get(`${CMR_LB_INGEST}/providers`);
    return [null, providers];
  } catch (err) {
    console.error("A problem occurred fetching providers", err);
    return [(err as Error).message, null];
  }
};

/**
 * Return provider with `providerId`.
 */
export const getProvider = async (
  providerId: string
): Promise<[string, null] | [null, Provider | null]> => {
  const [errs, providers] = await getProviders();

  if (errs) {
    return [errs as string, null];
  }

  return [
    null,
    (providers ?? []).find((provider) => provider["provider-id"] === providerId) ?? null,
  ];
};

/**
 * Return providers with cloud_hosted collections.
 * If given an array of providers, it will return those with cloud_hosted collections.
 */
export const getCloudProviders = async (
  providerCandidates?: Provider[],
  opts: { [key: string]: unknown } = {}
): Promise<[null | string[], Provider[]]> => {
  const [err, candidates] = providerCandidates ? [null, providerCandidates] : await getProviders();

  if (err) {
    return [[err], []];
  }

  const { authorization } = opts;

  const searchErrs: string[] = [];
  const cloudProviders: Provider[] = [];

  await Promise.all(
    (candidates ?? []).map(async (provider) => {
      try {
        const { headers } = await axios.get(CMR_LB_SEARCH_COLLECTIONS, {
          headers: mergeMaybe({}, { authorization }),
          params: { provider: provider["short-name"], cloud_hosted: true },
        });

        if (headers["cmr-hits"] !== "0") {
          cloudProviders.push(provider);
        }
      } catch (e) {
        console.error(
          `A problem occurred checking provider [${provider["provider-id"]}] for cloud holdings.`,
          e
        );
        searchErrs.push((e as Error).message);
      }
    })
  );
  return [searchErrs.length ? searchErrs : null, cloudProviders];
};
