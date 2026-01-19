#!/bin/sh
set -e

# Substitute WebAPI host in nginx config
WEBAPI_HOST=${WEBAPI_HOST:-atlas3-webapi}
WEBAPI_PORT=${WEBAPI_PORT:-8080}

# Update nginx config with correct WebAPI host
sed -i "s|proxy_pass http://atlas3-webapi:8080;|proxy_pass http://${WEBAPI_HOST}:${WEBAPI_PORT};|g" /etc/nginx/conf.d/default.conf

echo "Configured nginx to proxy /WebAPI to http://${WEBAPI_HOST}:${WEBAPI_PORT}"

# Check if SSL certificates exist
if [ ! -f /etc/nginx/ssl/cert.pem ] || [ ! -f /etc/nginx/ssl/key.pem ]; then
    echo "SSL certificates not found, generating self-signed certificates..."
    mkdir -p /etc/nginx/ssl
    apk add --no-cache openssl > /dev/null 2>&1
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
    echo "SSL certificates generated"
fi

exec nginx -g "daemon off;"
