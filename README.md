# CMR STAC API Proxy

An implementation of the [SpatioTemporal Asset Catalog API](https://github.com/radiantearth/stac-spec) on top of NASA's [Common Metadata Repository](https://cmr.earthdata.nasa.gov/search/).

Deployed at [https://cmr-stac-api.dev.element84.com/](https://cmr-stac-api.dev.element84.com/)

There is more detailed documentation in the [docs](docs/readme.md) folder of this repository.

## Development Quick Start

### Prerequisites

* node.js 8.10 (nvm is the best way)
* AWS CLI

### Setup

This application is a monorepo around a set of microservices that support the STAC proxy. It is organized as a NPM module and will install all dependencies if you run the following command:

`npm install`

### Running locally

- cd `search`
- `npm start`

### Deploying

- cd `search`
- `npm run deploy -- --stage <stage>`

## License

Copyright 2018 - 2019 Element 84

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
