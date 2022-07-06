FROM debian:buster-slim

WORKDIR /data

# install java and npm build dependencies
RUN apt update && \
    apt install -y \
    apt-utils \
    awk \
    curl \
    gcc \
    grep \
    g++ \
    make \
    openjdk-11-jre \
    ps \
    && rm -rf /var/lib/apt/lists/*

# install Node LTS
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - && \
    apt -y install nodejs
