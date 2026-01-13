FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_BASE_PATH=/atlas
ARG VITE_AUTH_ENABLED=true
ARG VITE_AUTH_SKIP_LOGIN=false
ARG VITE_AUTH_PROVIDERS='[{"name":"Database","url":"user/login/db","ajax":true,"icon":"mdi-database","isUseCredentialsForm":true}]'
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_AUTH_ENABLED=${VITE_AUTH_ENABLED}
ENV VITE_AUTH_SKIP_LOGIN=${VITE_AUTH_SKIP_LOGIN}
ENV VITE_AUTH_PROVIDERS=${VITE_AUTH_PROVIDERS}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html/atlas
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
