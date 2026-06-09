# Atlas Cohort Builder - Framework Overview

A comprehensive guide to the technologies, tools, and frameworks that make up the Atlas Cohort Builder development environment.

## Core Technologies

### Frontend Framework: Vue.js 3.4+
**Purpose**: Progressive reactive UI framework  
**Key Features**:
- Composition API with `<script setup>` syntax (recommended pattern)
- Reactive data binding and computed properties
- Components are single-file (`.vue`) with template, script, and styles co-located
- See [ComposableUsage.md](ComposableUsage.md) for composable patterns

**Docs**: https://vuetify.io/en/

### TypeScript 5.9.3
**Purpose**: Type-safe JavaScript with compile-time checking  
**Configuration**: **STRICT MODE ENABLED**
- `strict: true` enforces all strict type-checking options
- `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes` all enabled
- `noUnusedLocals` and `noUnusedParameters` prevent dead code
- **Path alias**: `@/*` maps to `./src/*` for cleaner imports

**Guidelines**:
- Always add type annotations to function parameters and return types
- Avoid `any` types — use proper union types or generics
- Use `const` for immutable values, avoid mutable globals

## Build & Deployment

### Vite 5.4+
**Purpose**: Modern, fast build tool and dev server  
**Key Commands**:
```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build (outputs to dist/)
npm run preview      # Preview production build locally
```

**Configuration Highlights**:
- **Base path**: Set to `./` for relative asset paths (works in any deployment location)
- **Code splitting**: Separate vendor chunks for vue, vuetify, and utilities
- **Dev server**: Proxies `/WebAPI` requests to local WebAPI instance (http://localhost:8080)
- **Port**: 5173 (strict port — fails if unavailable)

**See**: [vite.config.ts](../vite.config.ts)

### Build Process
The `npm run build` command:
1. Runs `vue-tsc` for TypeScript type checking
2. Builds with Vite (outputs to `dist/`)
3. Pre-build hook: Generates design tokens and route manifest

## UI & Components

### Vuetify 3.5+
**Purpose**: Material Design component library for Vue  
**Features**:
- Pre-built components (buttons, cards, modals, data tables, etc.)
- Theme customization via tokens
- Global auto-import via `vite-plugin-vuetify`
- Responsive grid system

**Important**: Atlas is migrating to custom wrapper components (`AtlasButton`, `AtlasCard`, etc.) to standardize and reduce direct Vuetify dependency. See [.eslintrc.cjs](../.eslintrc.cjs) for restricted HTML elements.

**Docs**: https://vuetifyjs.com/

### Design Tokens
**Purpose**: Centralized styling system (colors, spacing, typography)
- Defined in `src/ui/tokens.css`
- Generated from source via `npm run tokens:build`
- Use `tokens:check` in CI to ensure tokens are up-to-date

### Sass/SCSS
**Purpose**: CSS preprocessor for styling  
- Component styles use `<style scoped lang="scss">` in `.vue` files
- Automatic scoping prevents global style conflicts
- Sass installed as dependency for compilation

## State Management & Routing

### Pinia 2.1+
**Purpose**: Vue state management store  
**Patterns**:
- Define stores in `src/stores/` as composables
- Use `defineStore()` with composition API style
- Stores handle shared state, getters, and actions
- Persist state to localStorage when needed

**Example**: Auth store manages user session state across routes

**Docs**: https://pinia.vuejs.org/

### Vue Router 4.2+
**Purpose**: Client-side routing  
**Key Points**:
- Routes defined in `src/router/`
- Lazy loading of route components for performance
- Route manifest auto-generated at build time
- Hash-based routing (URLs use `#`)

**See**: [ApplciationStucture.md](ApplciationStucture.md) for route organization

## Plugin System & Module Federation

### single-spa 6.0+ + SystemJS 6.15+
**Purpose**: Micro-frontend framework for loading independent plugins at runtime  
**Architecture**:
- Main app bootstraps as single-spa application
- Plugins (e.g., cohort editor, data sources) are separate `<script>` tags or lazy-loaded modules
- SystemJS module registry allows plugins to import Vue, Vue Router, Pinia
- Public vendor libraries exposed globally: `vue.global.js`, `vue-router.global.js`, `react.production.min.js`

**How Plugins Work**:
1. Plugin code imports `vue`, `vue-router` from SystemJS registry
2. Main app provides these as global dependencies
3. Plugin mounts into designated container in main app
4. Plugins can share store state via Pinia

**Files**:
- [index.html](../index.html) — Registers vue, vue-router, etc. with SystemJS
- [Caddyfile](../Caddyfile) — Routes `/atlas/*` to app, `/WebAPI/*` to backend
- [plugins-dev/](../plugins-dev/) — Example plugin development

**See**: Feature plan 009-plugin-framework for detailed plugin architecture

## Code Quality & Standards

### ESLint 8.55+
**Purpose**: Static code analysis and linting  
**Configuration**:
- Vue 3 recommended rules via `eslint-plugin-vue`
- TypeScript support via `@typescript-eslint`
- Accessibility rules via `eslint-plugin-vuejs-accessibility`
- Unused imports detection via `eslint-plugin-unused-imports`

**Run Linting**:
```bash
npm run lint     # Lint and auto-fix issues
```

**Git Hook**: Linting runs automatically before every commit via Husky (blocks commits with lint errors)

**See**: [.eslintrc.cjs](../.eslintrc.cjs)

### Prettier 3.1+
**Purpose**: Code formatter (enforces consistent style)  
**Config**:
- 2-space indentation
- Single quotes
- Line width: 100 characters
- Trailing commas (ES5 compatible)
- Unix line endings (`lf`)

**Run Formatting**:
```bash
npm run format    # Format src/ directory
```

**See**: [.prettierrc](../.prettierrc)

### Husky 9.1+
**Purpose**: Git hooks for code quality gates  
**Current Hook**:
- **pre-commit**: Runs `npm run lint` before each commit (blocks if linting fails)

**Bypass** (only for emergencies):
```bash
git commit --no-verify
```

**See**: [.husky/pre-commit](../.husky/pre-commit)

## Testing

### Vitest 1.6+
**Purpose**: Unit testing framework (Vite-native, fast)  
**Features**:
- Global test APIs (`describe`, `it`, `expect`)
- jsdom environment for DOM testing
- Vue Test Utils for component testing
- Code coverage reporting (v8 provider)

**Commands**:
```bash
npm run test:unit              # Run unit tests (watch mode)
npm run test:unit -- --run     # Run once and exit
npm run test:coverage          # Run with coverage report (coverage/ directory)
npm run type-check             # Verify TypeScript (no runtime)
```

**Configuration**:
- Environment: jsdom (in-memory browser simulation)
- Setup file: [tests/setup.ts](../tests/setup.ts) — Global test configuration
- Pool: forks (separate process per file for isolation)
- Timeout: 30 seconds per test

**See**: [vitest.config.ts](../vitest.config.ts) and [TestVueComponents_HOWTO.md](TestVueComponents_HOWTO.md)

### Playwright 1.40+
**Purpose**: End-to-end (E2E) browser testing  
**Features**:
- Automated browser testing across Chrome (Chromium)
- Headless by default, headed mode available for debugging
- Screenshots/traces on first failure for debugging
- Parallel test execution (configurable)

**Commands**:
```bash
npm run test:e2e              # Run E2E tests (headless)
npm run test:e2e:headed       # Run with visible browser
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:report       # View HTML report from last run
```

**Configuration**:
- Base URL: http://localhost:5173
- Timeout: 60 seconds per test
- Expects: 10 seconds
- WebServer: Auto-starts dev server (`npm run dev -- --mode test`)
- Retries: 2 times in CI, 0 locally
- Workers: 1 in CI (serial), parallel locally

**See**: [playwright.config.ts](../playwright.config.ts)

### Code Coverage
- Provider: v8
- Reporters: HTML report, LCOV format, text summary
- Output: `coverage/` directory
- Excludes: type files, tests, story files

**View Coverage**: Open `coverage/index.html` in browser

## Validation & Data

### Zod 3.22+
**Purpose**: Runtime schema validation and type inference  
**Use Cases**:
- Validate API responses before using in app
- Define strongly-typed forms and input schemas
- Generate TypeScript types from schemas automatically

**Pattern**:
```typescript
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()),
})
type User = z.infer<typeof userSchema>
```

**Docs**: https://zod.dev/

### JWT Token Handling
**Library**: `jose` (JSON Web Token encoding/decoding)  
**Use**: Parsing and validating JWT tokens for authentication  
**See**: `src/services/auth/` for authentication service

## Utilities & Libraries

### Date Handling: date-fns 3.0+
- Modern, immutable date library
- Tree-shakeable (only import what you use)
- Timezone and locale support

### Data Visualization: ECharts 6.0+ with vue-echarts 8.0+
- Reactive charting library
- Vue component wrapper for easy integration
- Pie, bar, line, scatter plot support

### UUID Generation: uuid 13.0+
- Generate unique identifiers for records, requests, etc.
- Multiple algorithms (v4 for random, etc.)

### CSV Parsing: papaparse 5.5+
- Parse CSV files for import/export workflows

### VueUse: @vueuse/core 14.0+
- Collection of Vue Composition API utilities
- Hooks for common patterns (localStorage, fetch, etc.)

### Utilities: @vueuse/core, d3 7.9+
- D3: Data-driven visualization helpers
- VueUse: Reactive utilities for common patterns

## Development & Documentation

### Histoire 0.17+
**Purpose**: Storybook-like component documentation  
**Commands**:
```bash
npm run ui:dev     # Start component showcase (http://localhost:6006)
npm run ui:build   # Build static story files
```

**Files**: Create `.story.vue` alongside components  
**Benefits**: Document components, test in isolation, share UI reference with team

**See**: [histoire.config.ts](../histoire.config.ts)

## Web Server Configuration

### Caddy Web Server
**Purpose**: Lightweight HTTP server for local and Docker development  
**Configuration**:
- Hostname: configurable via `$CADDY_HOSTNAME` (default: localhost)
- Redirects `/` and `/atlas` → `/atlas/` (permanent)
- Routes:
  - `/WebAPI/*` → Reverse proxy to WebAPI backend (default: localhost:8080)
  - `/atlas/*` → Serves app from `/srv` directory (dist/), fallback to index.html for SPA
  - TLS: configurable via `$CADDY_TLS_DIRECTIVE`

**Environment Variables**:
- `$CADDY_HOSTNAME` — Server hostname (default: localhost)
- `$CADDY_TLS_DIRECTIVE` — TLS mode (default: internal, i.e., self-signed)
- `$WEBAPI_HOST` — Backend server hostname (default: atlas3-webapi)
- `$WEBAPI_PORT` — Backend server port (default: 8080)

**See**: [Caddyfile](../Caddyfile) and [docker-compose.yml](../docker-compose.yml)

### Docker Compose
**Services**:
- `atlas3-app` — Caddy web server
- `atlas3-webapi` — OHDSI WebAPI backend
- `atlas3-db` — PostgreSQL database

**Commands**:
```bash
docker-compose up -d      # Start services in background
docker-compose logs -f    # Tail logs
docker-compose down       # Stop services
```

## Application Structure

**Directory Map**:
```
src/
├── components/        # Reusable Vue components
├── composables/       # Shared Composition API logic
├── router/            # Route definitions
├── services/          # API clients, auth, etc.
├── stores/            # Pinia stores
├── ui/                # UI utilities (tokens, design system)
├── views/             # Page-level components
├── utils/             # Utility functions
├── App.vue            # Root component
└── main.ts            # Application entry point

tests/
├── unit/              # Unit tests (.spec.ts files)
├── e2e/               # End-to-end tests (.spec.ts files)
├── setup.ts           # Test configuration
└── mocks/             # Mock data and utilities

public/
├── config/            # Runtime configuration
├── vendor/            # Third-party libraries (SystemJS, Vue globals)
└── docs/              # Static documentation

scripts/
├── build-tokens.ts    # Design token generator
└── emit-route-manifest.mjs  # Route manifest generator
```

**See**: [ApplciationStucture.md](ApplciationStucture.md) for detailed component organization

## Quick Reference: Common Commands

```bash
# Development
npm run dev                    # Start dev server

# Building
npm run build                  # Build production bundle
npm run preview               # Preview production build

# Code Quality
npm run lint                  # Lint and auto-fix
npm run format                # Format code with Prettier
npm run type-check            # Check TypeScript (no runtime)

# Testing
npm run test:unit             # Unit tests (watch)
npm run test:unit -- --run    # Unit tests (once)
npm run test:coverage         # With coverage report
npm run test:e2e              # E2E tests
npm run test:e2e:headed       # E2E with visible browser
npm run test:e2e:report       # View E2E report

# All Checks
npm run check-all             # Type check + lint + unit tests + build

# UI Documentation
npm run ui:dev                # Start component showcase
npm run ui:build              # Build stories

# Tokens & Routes
npm run tokens:build          # Generate design tokens
npm run generate:routes       # Generate route manifest

# Preparation
npm run prepare               # Install git hooks (runs on npm install)
```

## Environment Configuration

**Configuration Files**:
- `.env.example` — Template for environment variables
- `.env.test` — Test environment (auth disabled)
- `public/config-local.example.json` — Runtime app configuration template
- `public/config-local.json` — Runtime app configuration (local overrides)

**See**: [AppConfig_HOWTO.md](AppConfig_HOWTO.md) for configuration details

## Important Files

| File | Purpose |
|------|---------|
| [vite.config.ts](../vite.config.ts) | Vite build configuration |
| [tsconfig.json](../tsconfig.json) | TypeScript compiler settings |
| [vitest.config.ts](../vitest.config.ts) | Unit test configuration |
| [playwright.config.ts](../playwright.config.ts) | E2E test configuration |
| [.eslintrc.cjs](../.eslintrc.cjs) | ESLint rules |
| [.prettierrc](../.prettierrc) | Prettier formatter config |
| [.husky/](../.husky/) | Git hook definitions |
| [Caddyfile](../Caddyfile) | Web server config |
| [docker-compose.yml](../docker-compose.yml) | Docker services |
| [package.json](../package.json) | Dependencies and scripts |

## Getting Started Checklist

1. **Install dependencies**: `npm install` (installs git hooks via Husky)
2. **Configure local environment**: Copy `.env.example` → `.env.local` and adjust
3. **Start dev server**: `npm run dev`
4. **Build tokens**: `npm run tokens:build` (auto-runs on dev and build)
5. **Run tests**: `npm run test:unit` to verify setup
6. **Familiarize**: Read [ApplciationStucture.md](ApplciationStucture.md) and [ComposableUsage.md](ComposableUsage.md)

## Key Architectural Decisions

- **Strict TypeScript**: All code is type-safe; invalid code won't compile
- **Relative asset paths**: App works in any deployment location (root, `/atlas3`, etc.)
- **Micro-frontend ready**: Plugin system via single-spa allows independent module loading
- **Composition API**: Modern, tree-shakeable Vue pattern (not Options API)
- **Component isolation**: Stories (Histoire) document and test components without full app
- **Git quality gates**: Pre-commit hooks prevent committing broken code
- **Design tokens**: Centralized design system for consistency and maintenance

## Next Steps

- Read [ApplciationStucture.md](ApplciationStucture.md) for component organization
- Read [ComposableUsage.md](ComposableUsage.md) for state management patterns
- Read [TestVueComponents_HOWTO.md](TestVueComponents_HOWTO.md) for testing patterns
- Read [AppConfig_HOWTO.md](AppConfig_HOWTO.md) for runtime configuration
