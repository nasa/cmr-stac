## CMR-STAC Development

CMR-STAC is a Node.js application built on the [Express.js framework](https://expressjs.com/) and deployed as an AWS serverless application using API Gateway + Lambda. This README is intended for developers who want to contribute to CMR-STAC, or set up a development environment for it.

The remainder of this README is documentation for developing, testing, and deploying CMR-STAC. See the [Usage documentation](../docs/usage/usage.md) if you are interested in using the CMR-STAC API.

### Repository Structure

| Directory            | Description  |
| -------------------- | ------------ |
| docs  | The `docs` directory is where the combined specification document made from the STAC and WFS3 specification documents is held. Paths and component schemas are defined here. The generated STAC documentation file is also located in this directory. |
| [src](../src)    | The `src` directory contains the main logic of the application. It is broken down into modules pertaining to areas of responsibility.
| [scripts](../scripts) | Utility (Python) scripts for validating and crawling CMR-STAC |
| [usage](../docs/usage/usage.md)       | Documentation on usage of the CMR-STAC endpoint(s) |

## Getting Started
### Setup

Set the correct NodeJS version (specified in [.nvmrc](../.nvmrc) required
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
npm run dev
```

This will run the process in the current terminal session, the local server will be available at:

```
http://localhost:3000/stac
http://localhost:3000/cloudstac
```

### Deploying

The deployment is handled via the [Serverless Framework](https://serverless.com). Each service has a
separate configuration file (`serverless.yml`).

To deploy the CMR-STAC application to AWS, you will need to set up a set of AWS credentials for the account where the application is being deployed, with the following permissions:

- manage cloud formation
- manage S3 buckets
- manage lambda function
- manage api gateway

The `serverless.yml` file includes environment variables for the search function that gets deployed. These variables have default values, but when deploying they should be evaluated based on the environment they are being deployed into (e.g., SIT, UAT, PROD).

- LOG_LEVEL: info
- LOG_DISABLED: false
- STAGE: `${self:provider.stage}`

STAGE is the AWS API Gateway `stage` that the application is being deployed. That by default is a setting in the `serverless.yml` file that environment variable will reference.

Use the npm script deploy to deploy the CMR-STAC application to AWS:

```bash
export AWS_PROFILE=xxxxxx
npm run deploy -- --stage <sit|uat|prod>
npm run deploy:docs -- --stage <sit|uat|prod>
```

## License

NASA Open Source Agreement v1.3 (NASA-1.3)
See [LICENSE.txt](../LICENSE.txt)