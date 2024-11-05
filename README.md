# NASA CMR STAC
NASA's [Common Metadata Repository (CMR)](https://cmr.earthdata.nasa.gov/search) is a metadata
catalog of NASA Earth Science data. [STAC, or SpatioTemporal Asset Catalog](https://stacspec.org/), is a
[Specification](https://github.com/radiantearth/stac-spec) for describing geospatial data with
[JSON](https://www.json.org/) and [GeoJSON](http://geojson.io/). The related
[STAC-API Specification](https://github.com/radiantearth/stac-api-spec) defines an API
for searching and browsing STAC catalogs.

## CMR-STAC
CMR-STAC acts as a proxy between the CMR repository and STAC API queries.
The goal is to expose CMR's vast collections of geospatial data as a STAC-compliant API.
Even though the core metadata remains the same, a benefit of the CMR-STAC proxy is the ability
to use the growing ecosystem of STAC software. Underneath, STAC API queries are translated into
CMR queries which are sent to CMR and the responses are translated into STAC Collections and Items.
This entire process happens dynamically at runtime, so responses will always be representative of
whatever data is currently stored in CMR. If there are any deletions of data in CMR by data providers,
those deletions are represented in CMR-STAC immediately.

CMR-STAC follows the STAC API 1.0.0-beta.1 specification, see the
[OpenAPI Documentation](https://api.stacspec.org/v1.0.0-beta.1/index.html).

## Usage
### Endpoints
- [CMR-STAC](https://cmr.earthdata.nasa.gov/stac): The entire catalog of NASA CMR data, organized by provider.
- [CMR-CLOUDSTAC](https://cmr.earthdata.nasa.gov/cloudstac): Also organized by provider, this API only contains STAC Collections where the Item Assets are available "in the cloud" (i.e., on S3).

### Navigating
CMR-STAC can be navigated manually using the endpoints provided above, or you can utilize available STAC software to browse and use the API.  

A common STAC utility is Radiant Earth's `stac-browser` to use this tool against your development server navigate to
  ```radiantearth.github.io/stac-browser/#/external/http:/localhost:3000/stac?.language=en```

See the [Usage Documentation](docs/usage/usage.md) for examples of how to interact with the API and search for data.  

### Limitations
While CMR-STAC provides some advantages over the CMR, there are some limitations that you should be aware of:  
- Limited search functionality: CMR-STAC does not support all of the search capabilities that CMR provides. For example, with CMR, you can search for data based on temporal and spatial criteria, as well as specific parameters such as platform, instrument, and granule size. However, with CMR-STAC, you can only search based on the STAC standard.
- Limited metadata availability: CMR-STAC only provides metadata that follows the STAC specification. While this metadata is very rich and comprehensive, it may not provide all of the information that you need for your specific use case.

## For Developers
[Developer README](docs/README.md)

## License
NASA Open Source Agreement v1.3 (NASA-1.3)
See [LICENSE.txt](./LICENSE.txt)
