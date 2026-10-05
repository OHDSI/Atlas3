# syntax=docker/dockerfile:1.7

# Atlas3 WebAPI image with an overridden trexsql plugin jar.
#
# The upstream ghcr.io/ohdsi/webapi:dev image bakes a trexsql jar into
# /opt/webapi/plugins/trexsql.jar. This Dockerfile replaces it with a
# specific release downloaded from the OHDSI/trex GitHub releases page.

ARG WEBAPI_DIGEST=sha256:6e58552b3b656921700e6e62982e5b9aaf9ac2f2cfbd43326d6a873c39678716
FROM ghcr.io/ohdsi/webapi:dev@${WEBAPI_DIGEST}

ARG TREXSQL_VERSION=0.3.3
ARG TREXSQL_URL=https://github.com/OHDSI/trex/releases/download/v${TREXSQL_VERSION}/trexsql-${TREXSQL_VERSION}.jar

USER root
RUN set -eux; \
    curl -fsSL -o /opt/webapi/plugins/trexsql.jar "${TREXSQL_URL}"; \
    unzip -p /opt/webapi/plugins/trexsql.jar META-INF/MANIFEST.MF > /tmp/trexsql.manifest; \
    grep -E '^Main-Class:[[:space:]]*trexsql\.core[[:space:]]*$' /tmp/trexsql.manifest > /dev/null; \
    rm /tmp/trexsql.manifest

LABEL org.atlas3.trexsql.version="${TREXSQL_VERSION}"
LABEL org.atlas3.webapi.base="ghcr.io/ohdsi/webapi:dev@${WEBAPI_DIGEST}"

# ---------------------------------------------------------------------------
# OpenTelemetry Java agent.
#
# Placed in the image but NOT activated here: the agent only attaches when
# JAVA_TOOL_OPTIONS names it (see docker-compose.observability.yml). An image
# built with this layer and run without those env vars behaves exactly as
# before, so the observability overlay is opt-in per environment.
#
# No WebAPI source or config is touched — Spring Boot, Logback, HikariCP and
# the JDBC driver are all instrumented by bytecode injection at JVM startup.
ARG OTEL_AGENT_VERSION=2.11.0
ARG OTEL_AGENT_URL=https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar
# Optional supply-chain pin. Leave empty to skip, or pass the sha256 published
# on the release page to fail the build on any mismatch.
ARG OTEL_AGENT_SHA256=

RUN set -eux; \
    mkdir -p /opt/otel; \
    curl -fsSL -o /opt/otel/opentelemetry-javaagent.jar "${OTEL_AGENT_URL}"; \
    if [ -n "${OTEL_AGENT_SHA256}" ]; then \
      echo "${OTEL_AGENT_SHA256}  /opt/otel/opentelemetry-javaagent.jar" | sha256sum -c -; \
    fi; \
    unzip -p /opt/otel/opentelemetry-javaagent.jar META-INF/MANIFEST.MF > /tmp/otel.manifest; \
    grep -E '^Premain-Class:[[:space:]]*io\.opentelemetry\.javaagent\.OpenTelemetryAgent[[:space:]]*$' /tmp/otel.manifest > /dev/null; \
    rm /tmp/otel.manifest; \
    chmod 0644 /opt/otel/opentelemetry-javaagent.jar

LABEL org.atlas3.otel.agent.version="${OTEL_AGENT_VERSION}"
