# CMR-STAC Development

CMR-STAC is a Node.js application built on the [Express.js framework](https://expressjs.com/) and deployed as an AWS serverless application using API Gateway + Lambda. This README is intended for developers who want to contribute to CMR-STAC, or set up a development environment for it.

The remainder of this README is documentation for developing, testing, and deploying CMR-STAC. See the [Usage documentation](../docs/usage/usage.md) if you are interested in using the CMR-STAC API.

## Repository Structure

| Directory            | Description  |
| -------------------- | ------------ |
| docs  | The `docs` directory is where the combined specification document made from the STAC and WFS3 specification documents is held. Paths and component schemas are defined here. The generated STAC documentation file is also located in this directory. |
| [src](../src)    | The `src` directory contains the main logic of the application. It is broken down into modules pertaining to areas of responsibility.
| [scripts](../scripts) | Utility (Python) scripts for validating and crawling CMR-STAC |
| [usage](../docs/usage/usage.md)       | Documentation on usage of the CMR-STAC endpoint(s) |

## Getting Started

### Setup

- Set the correct NodeJS version (specified in [.nvmrc](../.nvmrc) required
by CMR-STAC with [`nvm`](https://github.com/nvm-sh/nvm) (recommended for managing NodeJS versions)):

- install aws-sam-cli (`brew install aws-sam-cli`)

```bash
nvm use
```

Then install dependencies with npm:

```bash
npm install
```

To run the unit test suite associated with CMR-STAC:

```bash
npm test
```

To lint your developed code:

```bash
npm run prettier:fix
```

To run the CMR-STAC server locally:

```bash
npm run start
```

This will run the process in the current terminal session start up the necessary docker container where the the local server will be available from:

```bash
http://localhost:3000/stac
http://localhost:3000/cloudstac
```

To configure environment variables for this application such as point to `uat` or `prod` update the values in `sam_local_envs.json`

### Creating index.html from Swagger.json

To Create the index.html located in docs/index we can use the `redocly` service
the most straightforward way to do this is to use the cli tool against our `swagger.json` file

```bash
  npx @redocly/cli build-docs swagger.json
```

### Testing STAC validation

We can test our API both locally and on deployed instance against the on a stac-validation service using the <https://github.com/stac-utils/stac-api-validator> tool

The tool can be installed using pip and requires a Python runtime

```bash
  pip install stac-api-validator
```

```bash
   stac-api-validator\
    --root-url http://localhost:3000/stac/CMR_ONLY \
    --conformance core
```

this can be extended to validate against additional conformance APIs

### Deploying

The deployment is handled via the [AWS CDK Framework](https://aws.amazon.com/cdk/)

To deploy the CMR-STAC application to AWS, you will need to set up a set of AWS credentials for the account where the application is being deployed, with the following permissions:

- manage cloud formation
- manage S3 buckets
- manage lambda function
- manage api gateway

Running the `deploy.sh` script with teh accompanying environment variables will run the `cdk synth` command on `cdk/crm-stac` to build the application and start the deployment

## License

NASA Open Source Agreement v1.3 (NASA-1.3)
See [LICENSE.txt](../LICENSE.txt)
