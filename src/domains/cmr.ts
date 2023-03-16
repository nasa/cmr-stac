import { IncomingHttpHeaders } from "http";

/**
 * Return request headers.
 * Can be used for GraphQL or CMR requests.
 */
export const cmrRequestHeaders = (headers: IncomingHttpHeaders) => {
  const defaultHeaders = {
    "client-id": headers["client-id"] ?? "cmr-stac",
    via: "cmr-stac",
  };

  return { ...headers, ...defaultHeaders };
};
