FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM caddy:2-alpine
RUN apk add --no-cache gettext
COPY --from=build /app/dist /srv/atlas
# Kept as a template and rendered at container start — see the entrypoint.
COPY docker/config-local.json /srv/atlas/config-local.template.json
COPY docker/frontend-entrypoint.sh /usr/local/bin/atlas-entrypoint.sh
COPY Caddyfile /etc/caddy/Caddyfile
ENTRYPOINT ["/usr/local/bin/atlas-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
EXPOSE 80 443
