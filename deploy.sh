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

dockerTag=cmr-stac-$STAGE_NAME
stageOpts="--stage $STAGE_NAME "

docker build -t $dockerTag .

# Convenience function to invoke `docker run` with appropriate env vars instead of baking them into image
dockerRun() {
  docker run \
    --rm \
    -e "CMR_URL=$CMR_URL" \
    -e "CMR_LB_URL=$CMR_LB_URL" \
    -e "GRAPHQL_URL=$GRAPHQL_URL" \
    -e "STAC_VERSION=$STAC_VERSION" \
    -e "PAGE_SIZE=$PAGE_SIZE" \
    -e "LOG_LEVEL=$LOG_LEVEL" \
    -e "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID" \
    -e "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY" \
    -e "AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION" \
    -e "AWS_ACCOUNT=$AWS_ACCOUNT" \
    -e "LISTENER_ARN=$LISTENER_ARN" \
    -e "LOG_DESTINATION_ARN=$LOG_DESTINATION_ARN" \
    -e "AWS_ORG_USER=$AWS_ORG_USER" \
    -e "AWS_ORG_ID=$AWS_ORG_ID" \
    -e "NODE_ENV=production" \
    -e "STAGE_NAME=$STAGE_NAME" \
    -e "SUBNET_ID_A=$SUBNET_ID_A" \
    -e "SUBNET_ID_B=$SUBNET_ID_B" \
    -e "SUBNET_ID_C=$SUBNET_ID_C" \
    -e "CMR_SERVICE_SECURITY_GROUP_ID=$CMR_SERVICE_SECURITY_GROUP_ID" \
    -e "VPC_ID=$VPC_ID" \
    $dockerTag "$@"
}

# Execute deployment commands in Docker
#######################################

# Deploy to AWS
echo 'Deploying to AWS Resources...'
dockerRun npm run deploy-application

