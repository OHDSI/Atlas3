FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine
RUN apk add --no-cache jq
COPY --from=build /app/dist /srv/atlas
COPY docker/config-local.json /srv/atlas/config-local.json
# Pristine copy outside the web root. The entrypoint only adds telemetry
# settings to a config-local.json that still matches it, so a config the
# operator mounts over /srv/atlas/config-local.json is never rewritten.
COPY docker/config-local.json /usr/share/atlas/config-local.default.json
COPY docker/frontend-entrypoint.sh /usr/local/bin/atlas-entrypoint.sh
COPY Caddyfile /etc/caddy/Caddyfile
ENTRYPOINT ["/usr/local/bin/atlas-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
EXPOSE 80 443
