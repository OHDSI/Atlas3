# atlas3 Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-03

## Active Technologies
- TypeScript 5.9.3 with strict mode enabled + Vue 3.4+, Vuetify 3.5+ (Material Design components), Vue Router 4.2+, Pinia (state management), Zod (runtime validation) (003-concept-search)
- None (stateless client, all data from WebAPI) (003-concept-search)
- TypeScript 5.9.3 (strict mode) + Vue 3.4+, Vuetify 3.5+, Vue Router 4.2+, Pinia, ECharts 6.0+, vue-echarts 8.0+, Zod (006-datasources)
- TypeScript 5.9.3 (strict mode), Vue 3.4+ + Vue 3.4+, Vuetify 3.5+ (UI components/modal), Pinia 2.1+ (state management), Vue Router 4.2+, JWT decode library (jwt-decode or jose) (007-authentication-login)
- Browser localStorage for tokens and permissions, sessionStorage for temporary state (007-authentication-login)
- Browser localStorage (language preference), Pinia store (translation bundles, locale state), in-memory cache (fetched translations) (008-translation-support)

- TypeScript 5.x (strict mode), Vue 3.4+ (Composition API with `<script setup>`) (001-atlas-cohort-builder)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

```bash
# Run E2E tests (headless mode - no browser windows, no auto-open report)
npm run test:e2e

# Run E2E tests with visible browser (for debugging)
npm run test:e2e:headed

# Run E2E tests in UI mode (for interactive debugging)
npm run test:e2e:ui

# View HTML report from last E2E test run
npm run test:e2e:report

# Run unit tests
npm run test:unit

# Run all quality checks
npm run check-all
```

## Code Style

TypeScript 5.x (strict mode), Vue 3.4+ (Composition API with `<script setup>`): Follow standard conventions

## Recent Changes
- 008-translation-support: Added TypeScript 5.9.3 with strict mode enabled
- 007-authentication-login: Added TypeScript 5.9.3 (strict mode), Vue 3.4+ + Vue 3.4+, Vuetify 3.5+ (UI components/modal), Pinia 2.1+ (state management), Vue Router 4.2+, JWT decode library (jwt-decode or jose)
- 006-datasources: Added TypeScript 5.9.3 (strict mode) + Vue 3.4+, Vuetify 3.5+, Vue Router 4.2+, Pinia, ECharts 6.0+, vue-echarts 8.0+, Zod


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
