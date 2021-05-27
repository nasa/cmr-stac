# NASA CMR-STAC Usage

This file documents how to use the CMR-STAC endpoints:

- [CMR-STAC](https://cmr.earthdata.nasa.gov/stac): The entire catalog of NASA CMR data, organized by provider.
- [CMR-CLOUDSTAC](https://cmr.earthdata.nasa.gov/cloudstac): Also organized by provider, this API only contains
STAC Collections where the Item Assets are available "in the cloud" (i.e., on s3).

## CMR Providers

CMR-STAC is not a single STAC API, because CMR does not allow querying across all granules (the CMR equivalent of a STAC Item) in all collections. Instead, CMR-STAC includes a static root catalog that links to CMR Providers. Each CMR Provider is it's own STAC API.

For example, https://cmr.earthdata.nasa.gov/stac contains a links object with 'child' links. One of the child links, e.g., https://cmr.earthdata.nasa.gov/stac/LPCLOUD, is a STAC API that can be used in API Clients.

## Browsing

The first thing to do when getting familiar with CMR-STAC is to browse through the catalog and get a sense for what Collections and Items are. The easiest way to browse is to install a JSON extension for your browser of choice (e.g., [JSON Formatter](https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa/related) for Chrome).


![](https://gifyu.com/image/DDPc)



## Searching





