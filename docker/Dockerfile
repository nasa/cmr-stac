FROM debian:buster-slim

# install java and npm build dependencies
RUN apt-get update && \
    apt-get install -y \
    apt-utils \
    curl \
    gawk \
    gcc \
    grep \
    g++ \
    make \
    openjdk-11-jre \
    procps \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# install Node LTS
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest npm-force-resolutions serverless && \
    npm cache clean --force

RUN useradd -ms /bin/bash builder
USER builder

WORKDIR /home/builder
