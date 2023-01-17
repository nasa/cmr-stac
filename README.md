# NASA CMR STAC

NASA's [Common Metadata Repository (CMR)](https://cmr.earthdata.nasa.gov/search) is a metadata
catalog of NASA Earth Science data. [STAC, or SpatioTemporal Asset Catalog](https://stacspec.org/), is a
[specification](https://github.com/radiantearth/stac-spec) for describing geospatial data with
[JSON](https://www.json.org/) and [GeoJSON](http://geojson.io/). The related
[STAC-API specification](https://github.com/radiantearth/stac-api-spec) defines an API
for searching and browsing STAC catalogs.

CMR-STAC acts as a proxy between the CMR repository and STAC API queries.
The goal is to expose CMR's vast collections of geospatial data as a STAC-compliant API.
Even though the core metadata remains the same, a benefit of the CMR-STAC proxy is the ability
to use the growing ecosystem of STAC software. Underneath, STAC API queries are translated into
CMR queries which are sent to CMR and the responses are translated into STAC Collections and Items.
This entire process happens dynamically at runtime, so responses will always be representative of
whatever data is currently stored in CMR. If there are any deletions of data in CMR by data providers,
those deletions are represented in CMR-STAC immediately.

CMR-STAC follows the STAC API 1.0.0-beta.1 specification, see the
[OpenAPI documentation](https://api.stacspec.org/v1.0.0-beta.1/index.html).

## Usage

Most users will be interested in the deployed versions of CMR_STAC:

- [CMR-STAC](https://cmr.earthdata.nasa.gov/stac): The entire catalog of NASA CMR data, organized by provider.
- [CMR-CLOUDSTAC](https://cmr.earthdata.nasa.gov/cloudstac): Also organized by provider, this API only contains
STAC Collections where the Item Assets are available "in the cloud" (i.e., on s3).

See the [Usage documentation](docs/usage.md) for how to use available STAC software to browse and use the API.

## Development

CMR-STAC is written in NodeJS using the [Express.js framework](https://expressjs.com/) and deployed as
an AWS serverless application using API Gateway + Lambda.

The remainder of this README is documentation for developing, testing, and deploying CMR-STAC. See the [Usage documentation](docs/usage.md) if you are interested in using the CMR-STAC API.

### Repository Structure

| Directory            | Description  |
| -------------------- | ------------ |
| [bin](./bin)         | Scripts used for installation and setup |
| [docs](./docs)       | Documentation on usage of the CMR-STAC endpoint(s) |
| [search](./search)   | The CMR-STAC application |
| [search/docs](./search/docs)  | is where the combined specification document made from the STAC and WFS3 specification documents is held. Paths and component schemas are defined here. The generated STAC documentation file is also located in this directory. |
| [search/lib](./search/lib)    | The `lib` directory contains the main logic of the application. It is broken down into modules pertaining to areas of responsibility. A summary of those modules can be found below. |
| [search/tests](./search/tests)   | The `tests` directory is where all of the unit tests for the application are held. There is a directory for every corresponding subdirectory in the `lib` directory. We have not provided examples of how any of our modules work inside of this documentation, however, our test are written in a manner where you can see an example of how a function or module works. |
| [scripts](./scripts) | Utility (Python) scripts for validating and crawling CMR-STAC |

### `lib` modules

- `api/`: The `api` directory houses the api routing logic for the application
- `application.js`: The main [Express](https://expressjs.com/) application.
- `cmr.js`: contains logic to query CMR, including searching for collections and granules, getting collections and granules, and building CMR search URLs.
- `convert/`: Functions that are used to convert CMR data fields into their corresponding STAC/WFS3 fields.
- `settings.js`: Contains settings and controls fetching of settings from environment variables
- `stac/`: Contains utility functions used in creating the STAC API endpoints and the links between endpoints.
This includes logic to dynamically create or display catalogs during a search.
- `util/`: houses utility functions used throughout the application, such as for building URLs

### Setup

Set the correct NodeJS version (specified in [.nvmrc](./.nvmrc) required
by CMR-STAC with [`nvm`](https://github.com/nvm-sh/nvm) (recommended for managing NodeJS versions):

```bash
nvm use
```

Then install dependencies with npm:

```bash
npm install
```

To run the CMR-STAC server locally:

```bash
npm start
```

This will run the process in the current terminal session, the local server will be available at:

```
http://localhost:2888/dev/stac
```

### Deploying

The deployment is handled via the [Serverless Framework](https://serverless.com). Each service has a
separate configuration file (`serverless.yml`).

You will need to setup a set of AWS credentials for the account where the application is being deployed.
This account requires the following permissions:

- manage cloud formation
- manage S3 buckets
- manage lambda function
- manage api gateway

There are some environment variables included in the `serverless.yml` file for the search function that gets deployed. Those variables have default values, but when deploying they should be evaluated based on the environment they are being deployed into. e.g. SIT, UAT, PROD

- LOG_LEVEL: info
- LOG_DISABLED: false
- STAC_BASE_URL: <http://localhost:3000>
- STAC_VERSION: 1.0.0
- STAGE: `${self:provider.stage}`

STAGE is the AWS API Gateway `stage` that the application is being deployed. That by default is a setting in the `serverless.yml` file that environment variable will reference.

Use the npm script deploy to deploy the CMR-STAC application to AWS:

```bash
cd search
npm run deploy
```

This will use the default AWS credentials on the system to deploy. If using profiles, use the `aws-profile` switch:

```bash
npm run deploy -- --aws-profile <profile-name>
```

To override the environment variables, they can be specified on the command line.

```bash
npm run deploy -- --stage <sit|uat|prod> --cmr-url <cmr-base-url>
```

## License

CMR-STAC is published under the [Apache License, Version 2.0](https://www.apache.org/licenses/LICENSE-2.0). See [LICENSE.txt](./LICENSE.txt)
