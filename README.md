# Atlas3

[![Unit Tests](https://github.com/OHDSI/Atlas3/actions/workflows/unit-tests.yml/badge.svg?branch=develop)](https://github.com/OHDSI/Atlas3/actions/workflows/unit-tests.yml)
[![E2E Tests](https://github.com/OHDSI/Atlas3/actions/workflows/e2e-tests.yml/badge.svg?branch=develop)](https://github.com/OHDSI/Atlas3/actions/workflows/e2e-tests.yml)
[![Lint & Type Check](https://github.com/OHDSI/Atlas3/actions/workflows/lint-typecheck.yml/badge.svg?branch=develop)](https://github.com/OHDSI/Atlas3/actions/workflows/lint-typecheck.yml)
[![Coverage](https://codecov.io/gh/OHDSI/Atlas3/branch/develop/graph/badge.svg)](https://codecov.io/gh/OHDSI/Atlas3)

> **⚠️ Development Version**: This is Atlas 3.0, a new version of OHDSI ATLAS currently under active development.
>
> **For the stable production-ready version (2.15), please visit: [github.com/OHDSI/Atlas](https://github.com/OHDSI/Atlas)**

A complete reimplementation of OHDSI ATLAS for cohort definition and analysis, built with Vue 3 and TypeScript.

## Overview

Atlas is a reimplementation of OHDSI ATLAS with a focus on:
- Modern web technologies (Vue 3, TypeScript, Vuetify 3)
- Improved user experience and performance
- Comprehensive test coverage
- Modular plugin architecture
- Multi-language support

## Features

### Core Functionality
- **Cohort Builder**: Define and manage patient cohorts with complex criteria
- **Concept Search**: Search and browse OMOP CDM concepts
- **Concept Sets**: Create and manage reusable concept sets
- **Data Sources**: Visualize CDM data with interactive reports and charts
- **Authentication**: Secure login with JWT-based authentication
- **Internationalization**: Multi-language support with dynamic translation loading

### Plugin System
Extensible architecture allowing custom plugins to add new features and integrations.

## Technology Stack

- **Frontend Framework**: Vue 3.4+ (Composition API)
- **UI Components**: Vuetify 3.5+ (Material Design)
- **Language**: TypeScript 5.9+ (strict mode)
- **State Management**: Pinia 2.1+
- **Routing**: Vue Router 4.2+
- **Charting**: ECharts 6.0+ with vue-echarts
- **Validation**: Zod (runtime validation)
- **Build Tool**: Vite 5.4+
- **Backend**: WebAPI 3.0 (Java/Spring Boot 3.5, OpenJDK 17+)
- **Cache**: TrexSQL (DuckDB-backed query cache, loaded as a WebAPI plugin)

## Setup

A working ATLAS v3.0 deployment has three independent components:

- **A relational database** holding the WebAPI schema, the OMOP CDM schemas you want to analyse, and any results schemas. PostgreSQL is the simplest choice and the one the development `docker-compose.yml` ships with; Microsoft SQL Server, Oracle, Amazon Redshift, and Snowflake are all supported by WebAPI.
- **The WebAPI service** — a Java/Spring application that exposes the REST endpoints ATLAS talks to, executes cohort SQL against the configured CDM sources, and runs Flyway migrations against its own schema on first boot.
- **The ATLAS v3.0 frontend** — a Vue 3 single-page application, served either by the Vite development server or as a static bundle behind a reverse proxy.

> **ATLAS v3.0 requires WebAPI v3.0.** The 2.x line of WebAPI that the production ATLAS uses — and that ships with OHDSI Broadsea — is **not** compatible. When you clone WebAPI, check out the `webapi-3.0` branch explicitly. The development `docker-compose.yml` pulls the matching prebuilt image `ghcr.io/ohdsi/webapi:3.0-dev` for this reason.

### Prerequisites

- Docker and Docker Compose v2 (the fastest path), **or** for native installs: PostgreSQL 12+, JDK 17, Maven 3.9+, Node.js 18+ and `npm`.
- Git.
- Roughly 4 GB of free disk for container images and the WebAPI Flyway baseline.
- A WebAPI build from the v3.0 line — container image `ghcr.io/ohdsi/webapi:3.0-dev` or a local build of the `webapi-3.0` branch.

### Quick start (Docker Compose, recommended for evaluation)

The repository ships a `docker-compose.yml` that brings up Postgres, WebAPI, a database initialiser, and the frontend behind Caddy with a self-signed certificate:

```bash
git clone https://github.com/OHDSI/Atlas3.git
git clone --branch webapi-3.0 https://github.com/OHDSI/WebAPI.git
cd Atlas3
docker compose up
```

The compose file pulls the prebuilt `ghcr.io/ohdsi/webapi:3.0-dev` image; the sibling `WebAPI` checkout is needed only if you swap the image for a local build. The first boot takes a few minutes while WebAPI runs Flyway migrations and the `atlasdb/` scripts seed a default administrator.

When the stack is healthy:

- ATLAS v3.0 — https://localhost (accept the self-signed certificate)
- WebAPI — http://localhost:8080/WebAPI/info
- PostgreSQL — `localhost:5433` (in-container port 5432)

> The default `POSTGRES_PASSWORD` in the compose file is `mypass` — a placeholder for local development. Set `POSTGRES_PASSWORD` in a `.env` file (or your secrets manager) before running anywhere a hostile network can reach. The default user credentials are seeded by `atlasdb/`; change them before any non-local use.

The compose file already enables the TrexSQL query cache (`TREXSQL_ENABLED=true`, `TREXSQL_CACHE_PATH=/data/cache`, `HOME=/data`) and persists it on the `atlas3-webapi-data` named volume. Live patient counts in the cohort builder and the inclusion-rule rail only appear once TrexSQL is enabled **and** a per-source patient cache has been built — trigger the first build from **Configuration → Cache management** after login.

### Frontend-only development

If you already have a WebAPI running on `http://localhost:8080` (the compose stack works, as does a native install), you can run the Vue dev server directly:

```bash
npm install
npm run dev          # Vite on http://localhost:5173, proxies /WebAPI to :8080
npm run build        # Production bundle in dist/
npm run preview      # Serve the production bundle locally
```

The dev server's `/WebAPI` proxy target is hard-coded to `http://localhost:8080` in `vite.config.ts`; edit `proxy.target` to point at a different backend. `VITE_WEBAPI_URL` is read by the application bundle for production builds where the frontend is served from a different origin; it does not override the dev proxy target.

### Native install

If you want each component on the host without Docker, the steps below mirror the compose recipe.

#### 1. Database

1. Install PostgreSQL 12 or newer.
2. Create a database (`ohdsi` is a common choice) and a `webapi` schema.
3. Create a role with `CREATE` privileges on that schema — WebAPI needs to run Flyway migrations against it on startup.
4. Optionally, restore one or more OMOP CDM databases as additional schemas. These are the data sources the application will offer under **Data Sources**.

#### 2. WebAPI v3.0

1. Clone the v3.0 branch (the default branch tracks the production 2.x line, which ATLAS v3.0 cannot talk to):
   ```bash
   git clone --branch webapi-3.0 https://github.com/OHDSI/WebAPI.git
   ```
2. Create a Maven settings profile or `application.properties` override that maps the database connection details to the property keys WebAPI expects. The compose file lists the relevant variables verbatim — see `atlas3-webapi.environment` in `docker-compose.yml` for the canonical names (`DATASOURCE_URL`, `DATASOURCE_USERNAME`, `DATASOURCE_PASSWORD`, `DATASOURCE_OHDSI_SCHEMA`, the `SPRING_FLYWAY_*` keys, and the `SECURITY_AUTH_DB_DATASOURCE_*` keys for database-backed authentication). PostgreSQL is the default datasource dialect; no extra Maven profile is required. For Oracle, MSSQL, Redshift, Snowflake, BigQuery, etc., activate the matching `webapi-*` profile from `pom.xml` to pull in the JDBC driver.
3. Build the Spring Boot fat-jar (WebAPI v3.0 is designed to run as a fat-jar, not in an external servlet container):
   ```bash
   mvn package -Dpackaging.type=jar
   ```
   The result is `target/WebAPI.jar`.
4. Run it with `java -jar target/WebAPI.jar`, passing the `DATASOURCE_*` and `SPRING_FLYWAY_*` settings as environment variables or via `--spring.config.location`. WebAPI will run Flyway migrations against the configured schema on first boot.
5. Confirm http://localhost:8080/WebAPI/info returns the version JSON.

#### 2a. Enable the TrexSQL query cache (optional)

**This step is optional.** ATLAS v3.0 runs without TrexSQL — you only lose the live patient-count features. Skip this section if you don't need them and come back later when you do.

TrexSQL is a query-result cache that powers live patient counts in the cohort builder, the inclusion-rule rail, and several descriptive views. It **is not part of the WebAPI fat-jar** and must be wired in separately. The prebuilt `ghcr.io/ohdsi/webapi:3.0-dev` image (and the Docker Compose stack that pulls it) already has TrexSQL baked in — this section matters only for native installs that want the cache.

> **TrexSQL currently supports Linux x86_64 only.** macOS and Windows are not supported — the native library is published only for Linux amd64. Run WebAPI on Linux (host or container) if you need the cache.

Two artefacts are needed alongside `WebAPI.jar`:

1. **The Java side of the cache** — [`trexsql-0.2.0.jar`](https://github.com/OHDSI/trex/releases/download/v0.2.0/trexsql-0.2.0.jar).
2. **The matching native shared library** — [`libtrexsql-linux-amd64.zip`](https://github.com/p-hoffmann/trexsql-rs/releases/latest/download/libtrexsql-linux-amd64.zip) (contains `libtrexsql.so`).

Pick versions that match the WebAPI build you assembled — the `ARG TREXSQL_VERSION` and `ARG LIBTREXSQL_VERSION` lines in the WebAPI `Dockerfile` pin the combination used for the official image. Place the files in a single plugins directory using the JNA platform layout:

```
/opt/webapi/plugins/trexsql.jar
/opt/webapi/plugins/linux-x86-64/libtrexsql.so
```

Then set three environment variables and one JVM flag on the WebAPI process:

- **`TREXSQL_ENABLED=true`** — turns the cache on. With this unset or `false` the `/WebAPI/trexsql/*` endpoints respond `404`, the cohort builder hides the patient-count bar entirely, and the Cache management page omits the TrexSQL section.
- **`TREXSQL_CACHE_PATH`** — absolute filesystem path where the cache files live, e.g. `/var/lib/webapi/cache`. WebAPI creates it on first boot and writes per-source subdirectories underneath. Place it on a volume that survives restarts; losing the directory forces a full rebuild for every source.
- **`HOME`** — writable directory the cache uses for per-user working files. The compose stack sets `HOME=/data` alongside `TREXSQL_CACHE_PATH=/data/cache`; mirror that pattern by pointing `HOME` at a writable location owned by the WebAPI process user. Without a writable `HOME`, cache initialisation fails on startup.
- **`-Dloader.path=/opt/webapi/plugins`** — JVM flag that tells Spring Boot's properties launcher to scan the plugins directory for additional jars. Without it, the `trexsql.jar` on disk is never loaded and `TREXSQL_ENABLED` is a no-op.

The launch command becomes:

```bash
java \
  -Dloader.path=/opt/webapi/plugins \
  -jar target/WebAPI.jar
```

with `TREXSQL_ENABLED`, `TREXSQL_CACHE_PATH`, `HOME` and the usual `DATASOURCE_*` variables exported in the environment. After restart, confirm the cache endpoints are mounted by hitting one of them for a known source key:

```bash
curl -s http://localhost:8080/WebAPI/trexsql/<sourceKey>/cache/status
```

This should return a JSON status object (`not_built`, `building`, `ready`, `stale`, or `error`) rather than a `404`. Then sign in to ATLAS v3.0 and open **Configuration → Cache management**; each registered source appears with a **Build** button. Only after the first build finishes does the cohort builder start showing live patient counts for that source.

> Per-user access to TrexSQL is gated by the `trexsql:*` permission group. The built-in `admin` role has the full set; for non-admin users, add the relevant flags to their role before they can use live patient counts or trigger a rebuild.

#### 3. Add data sources to WebAPI

WebAPI reads its source list from a database table populated by the `atlasdb/` initialisation scripts (or by [Broadsea](https://github.com/OHDSI/Broadsea)). Each row points WebAPI at one CDM database with a JDBC URL, schema names for CDM and results, and a friendly source key. Until at least one source exists, the ATLAS v3.0 **Data Sources** page is empty.

#### 4. ATLAS v3.0 frontend

1. Clone and install:
   ```bash
   git clone https://github.com/OHDSI/Atlas3.git
   cd Atlas3
   npm install
   ```
2. Configure the WebAPI URL and authentication providers via Vite environment variables — `VITE_WEBAPI_URL`, `VITE_AUTH_ENABLED`, `VITE_AUTH_SKIP_LOGIN`, and `VITE_AUTH_PROVIDERS`. Put them in a `.env.local` file or pass them at build time.
3. For development, run `npm run dev`; the dev server listens on `http://localhost:5173` and proxies `/WebAPI` requests to `http://localhost:8080` (hard-coded in `vite.config.ts`).
4. For production, run `npm run build` and serve the contents of `dist/` from a static host. A reverse proxy must forward `/WebAPI` to the Java service so the same origin serves both. The repository's `Caddyfile` shows a working configuration.

### First-time login and creating users

The default DB-auth path expects a row in the `webapi.auth_user` table whose password column is a bcrypt hash of the chosen plaintext. The compose seed scripts in `atlasdb/` create an initial administrator. To add more users, either insert rows into `webapi.auth_user` directly or, if your deployment exposes LDAP/OAuth/SAML/OIDC, configure the corresponding `SECURITY_AUTH_*` properties on the WebAPI side.

After signing in, an administrator should:

- Visit **Configuration → Permissions** and set up the role bundles your organisation needs.
- Confirm the **Data Sources** page lists each connected CDM and that its dashboard renders without errors.
- Run a small smoke-test cohort against each source to validate end-to-end execution.

## Testing

Atlas has comprehensive test coverage across multiple test types:

### Running Tests

```bash
# Run unit tests (Vitest, watch mode by default)
npm run test:unit

# Unit tests with coverage report
npm run test:coverage

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with visible browser
npm run test:e2e:headed

# Run E2E tests in interactive UI mode
npm run test:e2e:ui

# View last E2E test report
npm run test:e2e:report

# Run the visual-comparison subset only
npm run test:visual

# Type-check, lint, unit tests, and production build
npm run check-all
```

### Test Structure

- **E2E Tests** (`tests/e2e/`): End-to-end tests using Playwright
  - Auth flow tests
  - Concept search and management
  - Data source reports
  - Visual comparison tests
  
- **Unit Tests** (`tests/unit/`): Unit tests using Vitest
  - Store tests (Pinia)
  - Service tests
  - Utility function tests
  - Composable tests
  
- **Component Tests** (`tests/component/`): Component tests using Vitest + Vue Test Utils
  - Chart components
  - UI components
  - Form components

## Plugin Development

Atlas 3.0 supports a plugin architecture based on single-spa and SystemJS. Reference plugins live in `plugins-dev/`.

## Related Projects

- [OHDSI ATLAS](https://github.com/OHDSI/Atlas) — Stable ATLAS 2.15 release (production-ready)
- [WebAPI](https://github.com/OHDSI/WebAPI) — Backend API service; ATLAS 3.0 requires the `webapi-3.0` branch
- [trex](https://github.com/OHDSI/trex) — TrexSQL query cache; loaded into WebAPI as a runtime plugin

## Support

For issues and questions, please use the GitHub issue tracker.
