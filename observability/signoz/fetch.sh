#!/usr/bin/env bash
# Vendors SigNoz's own Docker Compose deployment into ./upstream.
#
# Why fetch instead of committing a hand-written stack here: SigNoz is not one
# container. It is ClickHouse, ZooKeeper, a ClickHouse initialiser, a telemetry
# store migrator that must run before the collector, the collector itself and
# the SigNoz server — plus the ClickHouse cluster/storage/users XML the
# migrator depends on. A copy transcribed into this repo would fail during
# ClickHouse schema creation, which is a miserable thing to debug.
#
# IMPORTANT — read before bumping SIGNOZ_VERSION:
# SigNoz deprecated these Compose manifests in v0.130.0 and no longer
# distributes them; installation moved to its `foundryctl` CLI, which generates
# the manifests instead. v0.129.0 is therefore the last release with a Compose
# file in the repository, and this script pins it deliberately. To move to a
# newer SigNoz, follow https://signoz.io/docs/install/docker/ and point
# SIGNOZ_OTLP_ENDPOINT at whatever collector Foundry creates — the Atlas side
# of this integration only emits OTLP and does not care which backend it is.
set -euo pipefail

SIGNOZ_VERSION="${SIGNOZ_VERSION:-v0.129.0}"
DEST="$(cd "$(dirname "$0")" && pwd)/upstream"

echo "Fetching SigNoz ${SIGNOZ_VERSION} deployment into ${DEST}"
rm -rf "$DEST"
mkdir -p "$DEST"

# The whole deploy/ tree, not just deploy/docker: the compose file mounts
# ../common/clickhouse/{config,users,cluster,custom-function}.xml, which lives
# in deploy/common as a sibling. Extracting only deploy/docker leaves those
# paths missing, and Docker then helpfully creates *directories* where
# ClickHouse expects files — which fails at container start with a confusing
# "not a directory" mount error rather than anything about missing config.
curl -fsSL "https://github.com/SigNoz/signoz/archive/refs/tags/${SIGNOZ_VERSION}.tar.gz" \
  | tar -xz -C "$DEST" --strip-components=2 "signoz-${SIGNOZ_VERSION#v}/deploy"

# The layout moves between releases, so assert it rather than trusting it: a
# fetch that silently extracts the wrong thing is worse than one that fails.
COMPOSE_DIR="$DEST/docker"
COMPOSE_FILE="$COMPOSE_DIR/docker-compose.yaml"
# Assert the sibling config too, since that is the failure this layout caused.
if [ ! -f "$DEST/common/clickhouse/users.xml" ]; then
  echo "ERROR: ${DEST}/common/clickhouse/users.xml is missing." >&2
  echo "The compose file bind-mounts it; without it ClickHouse will not start." >&2
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: expected ${COMPOSE_FILE} after extraction, but it is not there." >&2
  echo "SigNoz probably reorganised or removed deploy/docker in" >&2
  echo "${SIGNOZ_VERSION} (it was removed in v0.130.0). Found:" >&2
  find "$DEST" -maxdepth 3 -name '*compose*' 2>/dev/null >&2
  exit 1
fi

cat <<TXT

Done. Start it with:
  docker network create atlas3-observability   # if not already created
  cd ${COMPOSE_DIR}
  docker compose -f docker-compose.yaml -f ../../docker-compose.override.yml up -d

SigNoz UI: http://localhost:\${SIGNOZ_UI_PORT:-3301}

The override remaps the UI off 8080, which Atlas's WebAPI already publishes.
TXT
