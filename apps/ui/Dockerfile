# syntax=docker/dockerfile:1
#
# Build context is the repository root:  docker build -f apps/ui/Dockerfile .
#
# Vite inlines VITE_* at build time, so the API origin and the cookie parent domain are build
# arguments; API_UPSTREAM (the host:port nginx proxies /v1/ and the discovery paths to) is runtime.

FROM node:24-slim AS build

ARG VITE_API_URL=http://localhost:4000
ARG VITE_INTERNAL_DOMAIN=autonoma.app
ENV VITE_API_URL=$VITE_API_URL \
    VITE_INTERNAL_DOMAIN=$VITE_INTERNAL_DOMAIN

RUN corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @autonoma/ui run build

FROM nginx:alpine

COPY apps/ui/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/apps/ui/dist/ /usr/share/nginx/html/

EXPOSE 3000
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
