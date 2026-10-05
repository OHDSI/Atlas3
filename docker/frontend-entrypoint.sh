#!/bin/sh
# Renders /srv/atlas/config-local.json from the baked template so that
# deployment-specific telemetry settings arrive as container env vars instead
# of being committed into the image.
#
# Defaults below make the unconfigured image silent: ANALYTICS_PROVIDER=none
# disables the client entirely, so `docker compose up` without the
# observability overlay behaves exactly as it did before.
set -eu

: "${ANALYTICS_PROVIDER:=none}"
: "${OTLP_ENDPOINT:=/otlp}"
: "${OTEL_SAMPLE_RATIO:=1}"

# Clamp the provider to a value the config schema accepts. This matters more
# than it looks: the frontend validates config-local.json as a whole, so one
# unrecognised enum value makes it fall back to *all* defaults — which would
# silently drop authProviders and userAuthenticationEnabled and leave the
# deployment unable to log in. A typo here should cost analytics, nothing else.
case "$ANALYTICS_PROVIDER" in
  otlp|none) ;;
  *)
    echo "atlas-entrypoint: ANALYTICS_PROVIDER='${ANALYTICS_PROVIDER}' is not" \
         "'otlp' or 'none'; disabling telemetry." >&2
    ANALYTICS_PROVIDER=none
    ;;
esac

export ANALYTICS_PROVIDER OTLP_ENDPOINT OTEL_SAMPLE_RATIO

# The explicit variable list keeps envsubst from touching anything else in the
# file, so unrelated `$`-looking content survives untouched.
envsubst '$ANALYTICS_PROVIDER $OTLP_ENDPOINT $OTEL_SAMPLE_RATIO' \
  < /srv/atlas/config-local.template.json \
  > /srv/atlas/config-local.json

exec "$@"
