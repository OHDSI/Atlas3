#!/bin/sh
# Adds the browser-telemetry block to /srv/atlas/config-local.json from
# container env vars, so one image serves deployments with and without
# telemetry.
#
# It never touches an operator's own config. AppConfig_HOWTO.md tells operators
# to mount their config-local.json at this path, so anything other than the
# file baked into the image (or this script's own earlier output) is left
# exactly as it is. Every failure path below only logs and keeps the existing
# file: a bad telemetry setting may cost analytics, never the login config.
#
# Nothing happens unless ANALYTICS_PROVIDER is set, so the plain
# `docker compose up` serves the baked config byte for byte.
set -u

CONFIG=/srv/atlas/config-local.json
BAKED=/usr/share/atlas/config-local.default.json
# Our last output. Lets a plain container restart re-render, while still
# telling a mounted operator file apart from one this script wrote.
RENDERED=/tmp/atlas-config-local.rendered.json

log() { echo "atlas-entrypoint: $*" >&2; }

render_analytics() {
  provider="${ANALYTICS_PROVIDER:-}"
  [ -n "$provider" ] || return 0

  case "$provider" in
    otlp|none) ;;
    *)
      log "ANALYTICS_PROVIDER='$provider' is not 'otlp' or 'none'; leaving config untouched."
      return 0
      ;;
  esac

  if ! cmp -s "$CONFIG" "$BAKED" && ! cmp -s "$CONFIG" "$RENDERED"; then
    log "$CONFIG is not the image default (mounted?); leaving it untouched." \
        "Add an \"analytics\" block to it yourself to enable telemetry."
    return 0
  fi
  if [ ! -w "$CONFIG" ]; then
    log "$CONFIG is read-only; leaving it untouched."
    return 0
  fi

  endpoint="${OTLP_ENDPOINT:-/otlp}"
  case "$endpoint" in
    /*|http://*|https://*) ;;
    *)
      log "OTLP_ENDPOINT='$endpoint' is not a path or http(s) URL; leaving config untouched."
      return 0
      ;;
  esac

  # A number in [0, 1], written the way JSON accepts it. Rejects `10%`, `0,1`,
  # `2`, `.5` and anything else that would make the config invalid as a whole.
  ratio="${OTEL_SAMPLE_RATIO:-1}"
  if ! printf '%s' "$ratio" | grep -Eq '^(0(\.[0-9]+)?|1(\.0+)?)$'; then
    log "OTEL_SAMPLE_RATIO='$ratio' is not a number between 0 and 1; leaving config untouched."
    return 0
  fi

  # jq, not text substitution: values are encoded as JSON strings/numbers, so
  # a quote or backslash in the endpoint cannot break the file.
  if ! jq --arg provider "$provider" --arg endpoint "$endpoint" --argjson ratio "$ratio" \
      '.analytics = ((.analytics // {}) + {provider: $provider, endpoint: $endpoint, sampleRatio: $ratio})' \
      "$BAKED" > "$RENDERED.tmp"; then
    log "could not render telemetry settings; leaving config untouched."
    rm -f "$RENDERED.tmp"
    return 0
  fi

  # `cat >` rather than `mv`: rewrites in place, which also works when the
  # path is a (writable) bind mount.
  cat "$RENDERED.tmp" > "$CONFIG" && mv "$RENDERED.tmp" "$RENDERED"
  log "telemetry provider=$provider endpoint=$endpoint sampleRatio=$ratio"
}

render_analytics
exec "$@"
