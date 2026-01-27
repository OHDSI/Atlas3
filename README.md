# Atlas3

![Unit Tests](https://github.com/OHDSI/Atlas3/actions/workflows/unit-tests.yml/badge.svg?branch=develop)
![E2E Tests](https://github.com/OHDSI/Atlas3/actions/workflows/e2e-tests.yml/badge.svg?branch=develop)
![Lint & Type Check](https://github.com/OHDSI/Atlas3/actions/workflows/lint-typecheck.yml/badge.svg?branch=develop)

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
- **Language**: TypeScript 5.9.3 (strict mode)
- **State Management**: Pinia 2.1+
- **Routing**: Vue Router 4.2+
- **Charting**: ECharts 6.0+ with vue-echarts 8.0+
- **Validation**: Zod (runtime validation)
- **Build Tool**: Vite 5.4+

## Project Structure

```
Atlas/
├── src/                    # Application source code
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables
│   ├── models/             # TypeScript types and interfaces
│   ├── services/           # Business logic and API services
│   ├── stores/             # Pinia state stores
│   ├── utils/              # Utility functions
│   └── App.vue            # Root component
├── tests/                  # Test suite
│   ├── e2e/               # End-to-end tests (Playwright)
│   ├── unit/              # Unit tests (Vitest)
│   └── component/         # Component tests (Vitest + Vue Test Utils)
├── plugins/                # Plugin directory
├── auth-proxy/            # Authentication proxy service
└── docs/                  # Documentation

```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Testing

Atlas has comprehensive test coverage across multiple test types:

### Running Tests

```bash
# Run all tests
npm test

# Run E2E tests (headless)
npm run test:e2e

# Run E2E tests with visible browser
npm run test:e2e:headed

# Run E2E tests in interactive UI mode
npm run test:e2e:ui

# View E2E test report
npm run test:e2e:report

# Run unit tests
npm run test:unit

# Run unit tests in watch mode
npm run test:unit:watch

# Run all quality checks (lint, type-check, tests)
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

## Plugin Development

Atlas supports a plugin architecture based on single-spa. Plugins can:
- Add new routes and views
- Extend existing functionality
- Integrate with external services

## Related Projects

- [OHDSI ATLAS](https://github.com/OHDSI/Atlas) - Stable ATLAS 2.15 release (production-ready)
- [WebAPI](https://github.com/OHDSI/WebAPI) - Backend API service

## Support

For issues and questions, please use the GitHub issue tracker.
