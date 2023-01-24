/**
 * Return request headers
 */
export const cmrRequestHeaders = (
  headers: any,
  opts?: { [key: string]: string }
) => {
  const defaultHeaders = {
    "Client-Id": headers["client-id"] ?? "cmr-stac",
    via: "cmr-stac",
  };

  return { ...defaultHeaders, ...opts };
};
