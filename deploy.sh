#!/bin/bash

# Bail on unset variables, errors and trace execution
set -eux


# Set up Docker image
#####################

cat <<EOF > .dockerignore
.DS_Store
.git
.github
.serverless
.webpack
cypress
dist
node_modules
tmp
EOF

cat <<EOF > Dockerfile
FROM node:22
COPY . /build
WORKDIR /build
RUN npm ci
EOF

dockerTag=cmr-stac-$bamboo_STAGE_NAME
stageOpts="--stage $bamboo_STAGE_NAME "

docker build -t $dockerTag .

# Convenience function to invoke `docker run` with appropriate env vars instead of baking them into image
dockerRun() {
  docker run \
    --rm \
    -e "CMR_URL=$bamboo_CMR_URL" \
    -e "CMR_LB_URL=$bamboo_CMR_LB_URL" \
    -e "GRAPHQL_URL=$bamboo_GRAPHQL_URL" \
    -e "STAC_VERSION=$bamboo_STAC_VERSION" \
    -e "PAGE_SIZE=$bamboo_PAGE_SIZE" \
    -e "LOG_LEVEL=$bamboo_LOG_LEVEL" \
    -e "AWS_ACCESS_KEY_ID=$bamboo_AWS_ACCESS_KEY_ID_PASSWORD" \
    -e "AWS_SECRET_ACCESS_KEY=$bamboo_AWS_SECRET_ACCESS_KEY_PASSWORD" \
    -e "AWS_DEFAULT_REGION=$bamboo_AWS_DEFAULT_REGION" \
    -e "AWS_ACCOUNT=$bamboo_AWS_ACCOUNT" \
    -e "LISTENER_ARN=$bamboo_LISTENER_ARN" \
    -e "LOG_DESTINATION_ARN=$bamboo_LOG_DESTINATION_ARN" \
    -e "AWS_ORG_USER=$bamboo_AWS_ORG_USER" \
    -e "AWS_ORG_ID=$bamboo_AWS_ORG_ID" \
    -e "NODE_ENV=production" \
    -e "STAGE_NAME=$bamboo_STAGE_NAME" \
    -e "SUBNET_ID_A=$bamboo_SUBNET_ID_A" \
    -e "SUBNET_ID_B=$bamboo_SUBNET_ID_B" \
    -e "SUBNET_ID_C=$bamboo_SUBNET_ID_C" \
    -e "CMR_SERVICE_SECURITY_GROUP_ID=$bamboo_CMR_SERVICE_SECURITY_GROUP_ID" \
    -e "VPC_ID=$bamboo_VPC_ID" \
    $dockerTag "$@"
}

# Execute deployment commands in Docker
#######################################

# Deploy to AWS
echo 'Deploying to AWS Resources...'
dockerRun npm run deploy-application

