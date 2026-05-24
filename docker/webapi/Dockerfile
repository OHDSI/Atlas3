# syntax=docker/dockerfile:1.7

# Atlas3 WebAPI image with an overridden trexsql plugin jar.
#
# The upstream ghcr.io/ohdsi/webapi:3.0-dev image bakes a trexsql jar into
# /opt/webapi/plugins/trexsql.jar. This Dockerfile replaces it with a
# specific release downloaded from the OHDSI/trex GitHub releases page.

ARG WEBAPI_DIGEST=sha256:a084547bf3ff36fcf7de87eb03e5efbe2403739ab2b39e8ea344b8dc0af996f6
FROM ghcr.io/ohdsi/webapi:3.0-dev@${WEBAPI_DIGEST}

ARG TREXSQL_VERSION=0.2.3
ARG TREXSQL_URL=https://github.com/OHDSI/trex/releases/download/v${TREXSQL_VERSION}/trexsql-${TREXSQL_VERSION}.jar

USER root
# Note: the upstream v0.2.3 release jar internally still reports version 0.1.23
# in its MANIFEST.MF / pom.properties (project.clj was not bumped before the
# release was tagged). Source of truth is the GitHub release URL, not the jar
# manifest. Verify only that the download is an uberjar with the expected
# main class, not the version string.
RUN set -eux; \
    curl -fsSL -o /opt/webapi/plugins/trexsql.jar "${TREXSQL_URL}"; \
    unzip -p /opt/webapi/plugins/trexsql.jar META-INF/MANIFEST.MF > /tmp/trexsql.manifest; \
    grep -E '^Main-Class:[[:space:]]*trexsql\.core[[:space:]]*$' /tmp/trexsql.manifest > /dev/null; \
    rm /tmp/trexsql.manifest

LABEL org.atlas3.trexsql.version="${TREXSQL_VERSION}"
LABEL org.atlas3.webapi.base="ghcr.io/ohdsi/webapi:3.0-dev@${WEBAPI_DIGEST}"
