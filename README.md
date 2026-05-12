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

## Getting Started

The fastest path is the Docker Compose stack: it brings up PostgreSQL, WebAPI v3.0, and the built frontend behind Caddy, with TrexSQL and a seeded admin user wired up out of the box.

### Quick start (Docker Compose)

```bash
# Clone the matching WebAPI branch alongside Atlas3 (the compose file
# pulls the prebuilt image but the sibling checkout is handy if you
# want to swap in a local build).
git clone https://github.com/OHDSI/Atlas3.git
git clone --branch webapi-3.0 https://github.com/OHDSI/WebAPI.git

cd Atlas3
docker compose up
```

When the stack is healthy:

- ATLAS 3.0 — https://localhost (accept the self-signed certificate)
- WebAPI — http://localhost:8080/WebAPI/info
- Postgres — localhost:5433 (in-container port 5432)

Default credentials are seeded by `atlasdb/`; change them before exposing the stack on any reachable network.

### Frontend-only development

If you already have a WebAPI running on `http://localhost:8080` (the compose stack works, as does a native install), you can run the Vue dev server directly:

```bash
npm install
npm run dev          # Vite on http://localhost:5173, proxies /WebAPI to :8080
npm run build        # Production bundle in dist/
npm run preview      # Serve the production bundle locally
```

The dev server's `/WebAPI` proxy target is hard-coded to `http://localhost:8080` in `vite.config.ts`; edit it to point at a different backend.

### Native install / standalone WebAPI

For a full native install — building WebAPI from source, configuring TrexSQL as a runtime plugin, seeding sources, running Achilles — see the **Setup guide** appendix in the [user manual](public/docs/atlas-manual.pdf). It walks through:

- PostgreSQL schema and role setup
- WebAPI v3.0 build (`mvn package -Dpackaging.type=jar`) and launch
- TrexSQL plugin staging (`trexsql.jar` + native `libtrexsql` lib, `-Dloader.path=...`)
- Adding CDM sources to the WebAPI source table
- Running Achilles against each CDM
- Common installation issues

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

## Authentication

Atlas supports authentication through:
- JWT-based authentication
- Session management with automatic token refresh
- Cross-tab session synchronization

## Documentation

The full user manual is published as a PDF at [`public/docs/atlas-manual.pdf`](public/docs/atlas-manual.pdf). It covers every page of the application (Data Sources, Vocabulary Search, Concept Sets, Cohort Definitions, Characterizations, Pathways, Incidence Rates, Profiles, Feature Analyses, Versions, Administration), a tutorial that builds a first phenotype end-to-end, a troubleshooting chapter, and the full WebAPI + ATLAS setup appendix referenced above.

To rebuild the PDF from source (requires [Tectonic](https://tectonic-typesetting.github.io/)):

```bash
cd docs/manual
make pdf            # writes build/main.pdf
```

## Plugin Development

Atlas 3.0 supports a plugin architecture based on single-spa and SystemJS. Reference plugins live in `plugins-dev/`.

## Related Projects

- [OHDSI ATLAS](https://github.com/OHDSI/Atlas) — Stable ATLAS 2.15 release (production-ready)
- [WebAPI](https://github.com/OHDSI/WebAPI) — Backend API service; ATLAS 3.0 requires the `webapi-3.0` branch
- [trex](https://github.com/OHDSI/trex) — TrexSQL query cache; loaded into WebAPI as a runtime plugin

## Support

For issues and questions, please use the GitHub issue tracker.
