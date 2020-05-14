# Deployment

## Architecture Overview

NASA's Common Metadata Repository is missing the capability to return STAC responses and does not have an interface for STAC API requests. This proxy service is a supplement to allow CMR to support STAC.

The application is a single cloud function that proxies calls using the STAC API and trasnlates the request to a CMR call. The response is then translated from the CMR JSON format into the respective STAC representation.

## How to Deploy

The deployment is handled via the [Serverless Framework](https://serverless.com). Each service has a separate configuration file (`serverless.yml`).

### Preparations

You will need to setup a set of AWS credentials for the account where the application is being deployed. This account requires the following permissions:

- manage cloud formation
- manage S3 buckets
- manage labmda function
- manage api gateway

There are some environment variables included in the `serverless.yml` file for the search function that gets deployed. Those variables have default values, but when deploying they should be evaluated based on the environment they are being deployed into. e.g. SIT, UAT, PROD

- LOG_LEVEL: info
- LOG_DISABLED: false
- STAC_BASE_URL: <http://localhost:3000>
- STAC_VERSION: 1.0.0-beta.1
- STAGE: `${self:provider.stage}`

STAGE is the AWS API Gateway `stage` that the application is being deployed. That by default is a setting in the `serverless.yml` file that environment variable will reference.

The application uses node modules to execute build, test, and deploy scripts that are included with the project.

### Steps

- `cd` to root directory
- `npm install`
- `cd` to `search` directory.
- `npm run deploy` if AWS credential account is `[default]`
- `npm run deploy -- --aws-profile <profile-name>` if AWS credential account is not default

This will run through the serverless deployment and provide console output for the status. If successful, the script will provide you with configuration and deployment information.
