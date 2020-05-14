# CMR STAC API Proxy

An implementation of the [SpatioTemporal Asset Catalog API](https://github.com/radiantearth/stac-spec) on top of NASA's [Common Metadata Repository](https://cmr.earthdata.nasa.gov/search/).

Deployed at [https://cmr.earthdata.nasa.gov/cmr-stac/](https://cmr.earthdata.nasa.gov/cmr-stac/)

There is more detailed documentation in the [docs](docs/readme.md) folder of this repository.

## Development Quick Start

### Prerequisites

* node.js 10.15 (nvm is the best way)
* AWS CLI

### Setup

This application is a monorepo around a set of microservices that support the STAC proxy. It is organized as a NPM module and will install all dependencies if you run the following command:

`npm install`

### Running locally

- cd `search`
- `npm start`

### Deploying

- cd `search`
- `npm run deploy -- --stage <sit|uat|prod> --cmr-search-host <cmr-search-host> --cmr-search-protocol <http|https>`

## License

The full license can be found [here](./LICENSE.txt)
