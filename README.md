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

Atlas 3.0 uses hash-based client routing. Deep links and callback UI URLs should use the `#/...` form (for example `https://localhost/atlas/#/cohorts` or `https://localhost/atlas/#/oauth/callback`).
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
