# Development

## Overview

The technologies driving this application are NodeJS, AWS Lambda, and AWS API Gateway.
This application is written in JavaScript running on NodeJS as AWS Lambda functions using the Serverless framework. Routing and API functionality leverages the Express.js framework.

## Library dependecies

* Node version 10.x
* Axios
* Lodash
* Ajv
* Express
* Jest
* Winston
* AWS-Serverless-Express

## Docs

`docs` is where the combined specification document made from the STAC and WFS3 specification documents is held. Paths and component schemas are defined here. The generated STAC documentation file is also located in this directory.

## Lib

The `lib` directory contains the main logic of the application. It is broken down into modules pertaining to areas of responsibility. A summary of those modules can be found below.

### API

The `api` directory houses the api routing logic for the application. Also included in this directory are routes pertaining to STAC and WFS3 endpoints.

### CMR

Contains logic to query CMR, including searching for collections and granules, getting collections and granules, and building CMR search URLs.

### Convert

Inside `convert` is where the functions exist that are used to convert CMR data fields into their corresponding STAC/WFS3 fields. For instance, `bounding-box.js` contains function to translate a bounding box from CMR's format to STAC's format.

### STAC

Contains utility functions used in creating the STAC API endpoints. This includes logic to dynamically create or display catalogs during a search. `stac` also holds functionality to create links to root, parent, and child nodes.

### Util

`util` houses utility functions used throughout the application. This directory includes the models for WFS-Links and the URL-builder used throughout the application. The logger creation, for which we are using `Winston` is also found here.

### Validator

The `validator` directory holds logic to retrieve component schemas from the STAC and WFS3 specification document, and validate component objects against them.

## Scripts

The `scripts` directory currently contains only one file: `yamlUpdater.js`. This script is ran automatically during the build process, and is intended to update the STAC and WFS3 schema yaml to the current version made accessible by Radiant Earth.

When `yamlUpdater.js` is ran, it looks at the repositories listed below to get the latest version of STAC and WFS3 specification schemas. It then updates the current schema file `OAcore+STAC.yaml` located in the `docs` directory.

This process is used to ensure that this app is always using the most recent version of `STAC` it is highly recommended that after an update has happened that all of the test are ran to ensure nothing has broken. We also recommend that test are written for any new `STAC` specifications.

STAC: <https://github.com/radiantearth/stac-spec/blob/master/api-spec/STAC.yaml>

OA: <https://github.com/radiantearth/stac-spec/blob/master/api-spec/openapi/OAFeat.yaml>

## Tests

The `tests` directory is where all of the unit tests for the application are held. There is a directory for every corresponding subdirectory in the `lib` directory. We have not provided examples of how any of our modules work inside of this documentation, however, our test are written in a manner where you can see an example of how a function or module works.
