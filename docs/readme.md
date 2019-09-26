# STAC API Proxy for Common Metadata Repository

## Overview

## Sections

### [Development Overview](development.md)

This application is built using JavaScript running on NodeJS using Express as a request/response handler. The application logic is hosted in AWS using Lambdas.

### [Deployment Overview](deployment.md)

The application is hosted in AWS. The application uses AWS Lambda functions to execute and API Gateways to handle the HTTP requests and direct them to the appropriate function. Serverless Framework is being used to package and upload the functions and setup infrastructure for the services in use.
