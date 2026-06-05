# Atlas-UI Component Library Overhaul — Design

**Date:** 2026-06-05
**Status:** Approved (brainstorming) — pending implementation plan

## Goal

Make the `atlas-ui` component library easier for developers to **use and understand**, improve how it **looks**, and add **dark-mode support**. The primary consumers are the internal team and, critically, **developers building Atlas3 application extensions / plugins**. The library is the bridge that lets a plugin look native to Atlas3.

## Context

- **App:** Vue 3 + Vuetify 3 SPA (`atlas-cohort-builder`, OHDSI Atlas v3.0).
- **Component library:** ~40 `Atlas*` wrappers over Vuetify in `src/components/ui/`, split into **Tier A — Semantic** (rich wrappers, each with a `.story.vue`) and **Tier B — Canonical** (thin wrappers, all in one combined `_TierB.story.vue` smoke test).
- **Tokens:** `src/ui/tokens.ts` (source) → generated `src/ui/tokens.css` via `scripts/build-tokens.ts` → consumed by `src/ui/theme.ts` (`buildVuetifyOptions`) to build Vuetify theme + component defaults.
- **Docs:** Histoire (`histoire.config.ts`, 17 story files), deployed to GitHub Pages (`.github/workflows/deploy-storybook.yml`). No intro page, no per-component docs, no dark toggle.
- **Distribution:** published as `@ohdsi/atlas-ui` (`packages/atlas-ui`), built via `vite.lib.config.ts`; `vue` + `vuetify` are peers.
- **Plugin system:** Host loads plugins as `single-spa` parcels. Each plugin is an independent Vite/Vue build receiving props `{ name, authContext, messageBus }`. The example `plugins-dev/hello-world-plugin` uses **raw HTML with hardcoded colors (`#1976d2`)** and does **not** use `atlas-ui` — there is no native-looking path today.

### Current state findings

- Only a `light` Vuetify theme exists (`defaultTheme: 'light'`). **No dark mode anywhere.** The app has no theme toggle.
- Components are dark-ready by construction: only 3 components use hardcoded color, and nearly all of it is `rgb(var(--v-theme-*))` (Vuetify semantic vars that adapt automatically when the theme changes). The only genuinely fixed values are two shadow `rgba(15,23,42,…)` declarations in `AtlasCard.vue`.

## Decisions (from brainstorming)

- **Audience:** internal team + Atlas3 plugin/extension developers.
- **Dark mode reach:** supported **at the component-library / atlas-ui level (and in Histoire) only** — **not** wired into the Atlas3 host app shell yet.
- **Palette:** **True Dark** (near-black, high contrast, accent-forward), keeping OHDSI navy + orange.
- **Visual direction:** **refine within the current brand** — no identity change.
- **In scope:** per-component Histoire docs; Histoire intro + dark toggle; plugin authoring guide + upgraded starter.
- **Out of scope:** a dedicated `atlas-ui` setup-helper API (e.g. `installAtlasUI(app)`). The plugin guide documents manual Vuetify + atlas-ui setup instead. Wiring a dark toggle into the Atlas3 host shell.

## Architecture

### Dark-mode mechanism — Approach C (chosen)

Single source of truth driving both Vuetify components and raw-CSS/plugin consumers.

- `tokens.ts` becomes the single source for **light and dark** color values.
- `build-tokens.ts` emits CSS-variable blocks scoped to Vuetify's theme classes: `.v-theme--light { --atlas-… }` and `.v-theme--dark { --atlas-… }` (plus `:root` defaults for light).
- `theme.ts` adds a `dark` theme to `buildVuetifyOptions`.
- **Result:** Vuetify components theme through Vuetify's own system; any plugin or raw CSS that uses `--atlas-*` variables follows the active theme automatically.

Rejected: **A (Vuetify-theme only)** — plugins/raw CSS using `--atlas-*` wouldn't follow dark. **B (CSS-vars only)** — Vuetify components don't read `--atlas-*`, so they wouldn't theme.

### Token restructure + True Dark palette

`tokens.ts` `color` splits into `light` / `dark` sub-objects; `radius`, `spacing`, `density`, `elevation`, `motion`, `z` remain theme-independent (shared). Indicative True Dark values (final values tuned for WCAG AA during implementation):

| Token | Light (current) | Dark (True Dark) |
|---|---|---|
| surface | `#ffffff` | `#161618` |
| surface-variant | `#f6f7f9` | `#0a0a0b` |
| on-surface | `rgba(0,0,0,.87)` | `#f4f4f5` |
| on-surface-variant | `rgba(0,0,0,.62)` | `#a1a1aa` |
| outline | `rgba(0,0,0,.12)` | `rgba(255,255,255,.14)` |
| outline-variant | `rgba(0,0,0,.06)` | `rgba(255,255,255,.07)` |
| primary | `#1f425a` | `~#6aa3cb` (lightened for contrast) |
| accent (orange) | `#eb6622` | `#eb6622` (kept) |
| info/success/warning/danger | as today | adjusted for dark contrast |

`AtlasCard`'s two hardcoded shadow `rgba()` values are tokenized (elevation tokens) so they read correctly on dark surfaces.

## Workstreams

### 1. Tokens & theme
- Restructure `tokens.ts` (light/dark color sets).
- Update `build-tokens.ts` to emit `.v-theme--light` / `.v-theme--dark` blocks; keep `tokens:check` green.
- Add `dark` theme to `buildVuetifyOptions` in `theme.ts`.

### 2. Component dark-readiness
- Tokenize `AtlasCard` shadows.
- Verify all ~40 components render correctly in dark (most require no change).
- Extend the Playwright visual-comparison suite (`tests/e2e/visual-comparison.spec.ts`) with dark-mode snapshots.

### 3. Histoire docs overhaul
- **Brand the Histoire site chrome itself** (not just the story canvas): Atlas logo, title, and accent colors applied to Histoire's own UI (sidebar/header) via Histoire `theme` config + injected CSS, so the docs site reads as part of the Atlas product and reinforces the design system. The chrome follows the same light/dark toggle.
- **Global light/dark toggle** in the Histoire toolbar, synced to the Vuetify theme on the story canvas (via `histoire.setup.ts` / a global decorator).
- **Intro / getting-started** landing page and a **design-tokens reference** page (swatches generated from `tokens.ts`).
- **Per-component docs:** every component gets a props/events/slots table, a usage example, and a short do/don't. The **16 Tier B components graduate from `_TierB.story.vue` to individual stories.**
- Consistent story layout via a shared decorator providing a themed surface background.

### 4. Plugin developer experience
- Upgrade `plugins-dev/hello-world-plugin` to use `@ohdsi/atlas-ui` (real components + `buildVuetifyOptions` theme) so it looks native and is dark-capable — it becomes the reference starter.
- **"Build an Atlas3 plugin with atlas-ui" guide** as a Histoire guide page (and/or `docs/`), documenting manual Vuetify + atlas-ui + token setup, theme inheritance, and the `{ name, authContext, messageBus }` plugin contract.

### 5. Visual refinement (within brand)
- Modest light-mode polish performed alongside dark work: consistent focus rings, elevation, and density tokens. No brand/identity change.

## Sequencing

Tokens & theme → component dark-readiness → Histoire docs overhaul → plugin starter & guide. Visual refinement happens opportunistically alongside the token/theme work. One spec, phased implementation.

## Testing strategy

- `npm run tokens:check` stays green (generated CSS matches source).
- `npm run type-check`, `npm run lint`, `npm run test:unit` pass.
- Playwright visual-comparison snapshots extended to cover dark mode.
- `npm run ui:build` (Histoire) and `npm run lib:build` (`@ohdsi/atlas-ui`) succeed.
- The upgraded `hello-world-plugin` builds and renders with native Atlas styling in both light and dark.

## Out of scope

- A dedicated `atlas-ui` setup-helper / one-call install API.
- Wiring a dark-mode toggle into the Atlas3 host application shell.
- Any change to the OHDSI brand identity.
