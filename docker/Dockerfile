FROM alpine:latest

WORKDIR /data

RUN apk add --update \
    nodejs \
    npm \
    openjdk8-jre \
    && rm -rf /var/lib/apt/lists/*
