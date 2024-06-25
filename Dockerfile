FROM node:21
WORKDIR /usr/src/swiftwordpress
COPY package.json yarn.lock ./
COPY . .