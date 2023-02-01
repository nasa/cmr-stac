import axios from "axios";
import { Provider } from "../models/CmrModels";

const CMR_LB_URL = process.env.CMR_LB_URL;
const CMR_LB_INGEST = `${CMR_LB_URL}/ingest`;
const CMR_LB_SEARCH = `${CMR_LB_URL}/search`;
const CMR_LB_SEARCH_COLLECTIONS = `${CMR_LB_SEARCH}/collections`;

export const conformance = [
  "https://api.stacspec.org/v1.0.0-rc.2/core",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search",
  "https://api.stacspec.org/v1.0.0-rc.2/ogcapi-features/",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#fields",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#features",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#query",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#sort",
  "https://api.stacspec.org/v1.0.0-rc.2/item-search#context",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
  "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
];

/**
 * Return an array of providers found in CMR.
 */
export const getProviders = async (): Promise<Provider[]> => {
  const { data: providers } = await axios.get(`${CMR_LB_INGEST}/providers`);
  return providers;
};

/**
 * Return provider with `providerId`.
 */
export const getProvider = async (
  providerId: string
): Promise<Provider | undefined> => {
  const providers = await getProviders();
  return providers.find((provider) => provider["provider-id"] === providerId);
};

/**
 * Return providers with cloud_hosted collections.
 * NOTE: This may be slow and is a candidate for caching
 */
export const getCloudProviders = async (): Promise<Provider[]> => {
  const providers = await getProviders();

  const cloudProviders = await providers.reduce(
    async (cloudProvs, provider) => {
      const resolvedProvs = await cloudProvs;
      const { headers } = await axios.get(CMR_LB_SEARCH_COLLECTIONS, {
        params: { provider: provider["short-name"], cloud_hosted: true },
      });

      if (headers["cmr-hits"] && headers["cmr-hits"] !== "0") {
        return [...resolvedProvs, provider];
      }

      return resolvedProvs;
    },
    Promise.resolve([] as Provider[])
  );

  return cloudProviders;
};
