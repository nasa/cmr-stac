# NASA CMR-STAC Usage

This file documents how to use the CMR-STAC endpoints:

- [CMR-STAC](https://cmr.earthdata.nasa.gov/stac): The entire catalog of NASA CMR data, organized by provider.
- [CMR-CLOUDSTAC](https://cmr.earthdata.nasa.gov/cloudstac): Also organized by provider, this API only contains STAC Collections where the Item Assets are available "in the cloud" (i.e., on s3).
- [UAT CMR-STAC](https://cmr.uat.earthdata.nasa.gov/stac): As CMR-STAC, except this is a testing environment before changes get
deployed to production. UAT CMR-STAC uses the UAT CMR environment which has a much smaller, and different set of data than production.

**Table of Contents**
1. [CMR Providers](#cmrproviders)
2. [Browsing](#browsing)
3. [Searching via CLI](#searching)

## CMR Providers

Due to the vast number of collections contained within CMR, a user cannot query across all granules at once.
[Attempting to do so returns an error message](https://cmr.earthdata.nasa.gov/search/granules.json)
indicating that at least one of a set of fields must be provided. 
Because a STAC API allows for searching across all Items (i.e., granules), instead of a single API, 
CMR-STAC provides multiple APIs, one for each provider. Upon hitting the root endpoint (https://cmr.earthdata.nasa.gov/stac)
the response will include a list of CMR providers as a series of links
with a "rel" field equal to "child".

**Provider Examples**

| Provider | Provider URL (each is a STAC API) |
| -------- | --------------------------------- |
| LARC_ASDC | https://cmr.earthdata.nasa.gov/stac/LARC_ASDC |
| USGS_EROS | https://cmr.earthdata.nasa.gov/stac/USGS_EROS |
| ESA | https://cmr.earthdata.nasa.gov/stac/ESA |
| LPCLOUD | https://cmr.earthdata.nasa.gov/cmr-stac/LPCLOUD |

Navigating to a provider yields a STAC Catalog, but one that has some additional links and a
`conformsTo` field, indicating that it is a STAC API. These links include:

| rel | path | Decription |
| --- | ---- | ---------- |
| self | /{providerId} | this provider catalog |
| root | / | the root CMR-STAC catalog |
| collections | /{provider-id}/collections | response includes an array of all collections for this provider |
| search | /{provider-id}/search | There are 2 search links, one indicating it accepts GET requests, the other POST requests |
| conformance | /{provider-id}/conformance | returns a list of conformance classes, identical to the list of classes in the `conformsTo` field |
| service-desc | [STAC API desc](https://api.stacspec.org/v1.0.0-beta.1/openapi.yaml) | CMR-STAC currently doesn't provide its own OpenAPI doc, it complies to the STAC API Spec published OpenAPI |
| service-docs | [STAC API doc](https://api.stacspec.org/v1.0.0-beta.1/openapi.html) | Same as `service-desc` except this is an html render of the OpenAPI doc |
| child | /{providerId}/{collectionId} | A single STAC Collection | 
| prev, next | /{providerId}?page=X | Pagination links if there are more than 10 collections within this provider |

## Catalog Structure

CMR-STAC is essentially a static STAC catalog that links to multiple dynamic STAC APIs. A summary of the various linkages
is given here. The table shows the different endpoints available from the root catalog:

| path | Description |
| ---- | ----------- |
| /    | Root endpoint. Returns a list of provider Catalogs |
| /{provider-id} | Returns singular provider Catalog |
| /{provider-id}/collections | Returns a Catalog of all Collections that belong to the indicated provider | 
| /{provider-id}/collections/{collection-id} | Returns the individual Collection indicated in the path | 
| /{provider-id}/collections/{collection-id}/items | Returns an ItemCollection of all Items contained in the indicated Collection | 
| /{provider-id}/collections/{collection-id}/items/{item-id} | Returns the individual Item indicated in the path | 

For example, if a user wanted to get all the collections under the ASF provider, the user would hit:

https://cmr.earthdata.nasa.gov/stac/ASF/collections

If the user wanted to query all items in the C1758588261-LARC_ASDC collection under the LARC_ASDC provider, the user would hit:

https://cmr.earthdata.nasa.gov/stac/LARC_ASDC/collections/C1758588261-LARC_ASDC/items

Each Collection returned from CMR-STAC includes a series of links for navigation within the catalog ("hierarchical link")
as well as other related links, summarized here:

| rel | Description |
| --- | ----------- |
| self, root, parent, child | hierarchical links allowing crawling/browsing down to STAC Items |
| items | search endpoint for all Items in the Collection |
| about | The NASA HTML landing page for the Collection |
| via | The original CMR metadata used to generate the STAC metadata returned |

Each Item returned from CMR-STAC includes a series of links as well:

| rel | Description |
| --- | ----------- |
| self, root, parent | hierarchical links allowing crawling/browsing down to STAC Items |
| collection | The STAC Collection this Item belongs to |
| provider | The CMR Provider root catalog (a STAC API) |
| via | The original CMR metadata used to generate the STAC metadata returned |

## Browsing
The first thing to do when getting familiar with CMR-STAC is to browse through the catalog and get a sense for its structure, and what types of data (Collections and Items) are available. 
The easiest way to browse is to install a JSON extension for your browser of choice (e.g., [JSON Formatter](https://chrome.google.com/webstore/detail/json-formatter/bcjindcccaagfpapjjmafapmmgkkhgoa/related) for Chrome).

![](https://s3.gifyu.com/images/cmr-stac-browse-opt.gif)

[STAC Browser](https://github.com/radiantearth/stac-browser) is a web interface to browse through
a STAC Catalog. STAC Browser is what is used in [STAC Index](https://stacindex.org/catalogs/cmr-stac#/) to be able to browse through any STAC API that has been added to the index.

Another way to browse the API is with [SnapPlanet](https://rocket.snapplanet.io/) - a more graphical interface that allows users with some basic search options. Specify the CMR-STAC Provider catalog
to SnapPlanet by specifying the `u` parameter to https://rocket.snapplanet.io/, e.g.,

https://rocket.snapplanet.io/map?u=https://cmr.earthdata.nasa.gov/stac/LPCLOUD

This displays a map interface and some filtering options including geographic and temporal.

![](https://s3.gifyu.com/images/snapplanet-search-opt.gif)

## Searching Items

As stated above, provider search endpoints can be used to query CMR with GET and POST requests. GET requests accept string parameters (arrays should be comma-delimited strings), while the POST request should have a JSON body containing the parameters. Search endpoints can be targeted by anything from curl and postman to STAC specific tools.

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| collections | [string] | Array of collection IDs to include in the search for items |
| limit     | integer    | Maximum number of results to return per page. Defaults to 10 |
| bbox      | [number] | Requested bounding box. Represented using either 2D or 3D geometries. The length of the array must be 2*n where n is the number of dimensions. The array contains all axes of the southwesterly most extent followed by all axes of the northeasterly most extent specified in Longitude/Latitude or Longitude/Latitude/Elevation based on WGS 84. When using 3D geometries, the elevation of the southwesterly most extent is the minimum elevation in meters and the elevation of the northeasterly most extent is the maximum. |
| datetime | string | Single date+time, or a range ('/' separator), formatted to RFC 3339, section 5.6. Use double dots .. for open date ranges. |
| intersects | GeoJSON Geometry | Searches items by performing intersection between their geometry and provided GeoJSON geometry. All GeoJSON geometry types must be supported. |
| ids | [string] | Array of Item ids to return. All other filter parameters that further restrict the number of search results (except "next" and "limit") are ignored. |

**Examples**

If a user is trying to get all granules from the year 2001 in the collection C1000000701-LARC_ASDC under the LARC_ASDC provider, the request would be:

GET:

http://localhost:3000/cmr-stac/LARC_ASDC/search?collections=C1000000701-LARC_ASDC&datetime=2001-01-01T00:00:00.000Z,2001-12-01T00:00:00.000Z

POST:

https://cmr.earthdata.nasa.gov/cmr-stac/LARC_ASDC/search

JSON Body:
```json
{
    "datetime": "2001-01-01T00:00:00.000Z,2001-12-01T00:00:00.000Z",
    "collections": "C1000000701-LARC_ASDC"
}
```

## Searching via CLI

The Python library [pystac-client] provides a Command Line Interface (CLI) to search any STAC API.

Install pystac-client, and stacterm which will be used to summarize the results in the terminal.

```bash
pip install pystac-client stacterm
```

pystac-client requires a URL to a STAC API, and since CMR-STAC implements a STAC API for each provider, the provider STAC URL will need to be provided. Set the environment variable STAC_URL to the desired provider URL.

```bash
export STAC_URL=https://cmr.earthdata.nasa.gov/stac/LPCLOUD
```

An AOI containing a GeoJSON Feature of interest is created, using GIS Software or 
[geojson.io](http://geojson.io/)

```
$ stac-client search --intersects aoi.json --datetime 2021-01/2021-05 --matched
36 items matched
```

The `--matched` switch performs a search with limit=0 so does not get any Items, but gets the total number of 
matches which will be output to the screen.


Without the `--matched` switch, all items will be fetched, paginating if necessary. If `max_items` is provided 
it will stop paging once that many items has been retrieved. It then prints all items to stdout as an ItemCollection.
This can be useful to pipe output to another process such as [stac-terminal](https://github.com/stac-utils/stac-terminal),
[geojsonio-cli](https://github.com/mapbox/geojsonio-cli), or [jq](https://stedolan.github.io/jq/).

Here, the output is piped to `stacterm` to print a calendar of Items based on the Collection.

```
$ stac-client search --intersects aoi.json --datetime 2021-01/2021-05 | stacterm cal
```

![](./images/cmr-stac-cal.png)

Search by a specific collection with the `-c` switch, or make queries against Item properties such as `eo:cloud_cover`

```
$ stac-client search -c HLSS30.v1.5 --intersects aoi.json --datetime 2021-01/2021-05 | stacterm cal
```

![](./images/cmr-stac-cal2.png)

The `table` command of `stacterm` can be used to generate Markdown tables of specified fields:

```
$ stac-client search -c HLSS30.v1.5 --intersects aoi.json --datetime 2021-01/2021-05 | stacterm table --fields collection date eo:cloud_cover
```

![](./images/cmr-stac-table.png)

The results of a search can also be saved as a GeoJSON FeatureCollection file, allowing it to be used in other GIS software
to visualize where the found Items are located.

```
$ stac-client search -c HLSS30.v1.5 --intersects aoi.json --datetime 2021-01/2021-05 --save myresults.json
```
