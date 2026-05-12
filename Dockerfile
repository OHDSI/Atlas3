FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_BASE_PATH=/atlas
ARG VITE_AUTH_ENABLED=true
ARG VITE_AUTH_SKIP_LOGIN=false
ARG VITE_AUTH_PROVIDERS='[{"name":"Database","url":"user/login/db","ajax":true,"icon":"mdi-database","isUseCredentialsForm":true}]'
ARG VITE_BAO_AGENT_ENABLED=false
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_AUTH_ENABLED=${VITE_AUTH_ENABLED}
ENV VITE_AUTH_SKIP_LOGIN=${VITE_AUTH_SKIP_LOGIN}
ENV VITE_AUTH_PROVIDERS=${VITE_AUTH_PROVIDERS}
ENV VITE_BAO_AGENT_ENABLED=${VITE_BAO_AGENT_ENABLED}
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv/atlas
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
