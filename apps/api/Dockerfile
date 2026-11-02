# syntax=docker/dockerfile:1
#
# Build context is the repository root:  docker build -f apps/api/Dockerfile .
#
# The API bundle (tsup) keeps Prisma, pg and two workspace packages external, so the runtime needs
# the monorepo's node_modules and the generated Prisma client beside it. The build stage installs and
# bundles; the runtime stage carries the result and nothing from the build host.

FROM node:24-slim AS build

RUN corepack enable

WORKDIR /app
COPY . .

# postinstall generates the Prisma client the bundle imports.
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @autonoma/api run build

FROM node:24-slim

# openssl: Prisma's migrate engine links against it. ca-certificates: outbound TLS (Google, GitHub, S3).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build --chown=node:node /app /app

ENV NODE_ENV=production
USER node
EXPOSE 4000

# Migrations run from the same image, before the API rolls out:
#   sh -c 'cd /app/packages/db && ./node_modules/.bin/prisma migrate deploy'
CMD ["node", "--enable-source-maps", "apps/api/dist/index.js"]
