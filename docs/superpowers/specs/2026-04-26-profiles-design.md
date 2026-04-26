# Profiles Feature — Design

**Date:** 2026-04-26
**Status:** Approved for implementation
**Source of truth for porting from:** OHDSI ATLAS 2.15 (`../Atlas`)

## Summary

Reimplement the Atlas 2.15 person-profile viewer in Atlas3 with full feature parity (timeline chart, faceted event table, event highlighting, cohort context, observation-period rendering). Use Atlas3-native patterns: Vue 3 + Composition API, Pinia store, Zod-validated WebAPI service, ECharts for the timeline, Vuetify components for the rest. Where Atlas3 conventions allow a cleaner UX, deviate from 2.15 (highlight panel as a side drawer instead of a modal, Vuetify filter chips instead of a faceted sidebar, observation periods as a thin band instead of background shading, two tabs inside the highlights panel separating concepts from cohort concept-sets).

## Goals

- View a single person's clinical timeline by source key + person id, optionally with a cohort definition as the index-date context.
- Co-visible chart + events table that filter together (domain chips, text search, brush date range).
- Event highlighting workflow: pick concepts (or whole concept sets when in cohort context), apply one of six palette colors, see colored points on the chart.
- Reachable from: the global nav, direct URL, the cohort samples person list, and characterization/inclusion person rows.
- Permission-gated per source (`isPermittedViewProfiles`), permission-gated for absolute dates on the chart (`isPermittedViewProfileDates`).

## Non-goals (v1)

- No persistence of filters, highlights, or layout state across reloads.
- No URL-encoded filter or highlight state.
- No print/PDF export of the profile (export menu is in the toolbar but only triggers CSV of the events table; PDF is a follow-up).
- No new "person search" UI inside profiles — only `personId` input and the cohort/characterization links into the page.
- No infinite scroll on the events table; client-side pagination at 25 rows.
- No plugin-widget surface beneath the profile (Atlas 2.15 has one; defer until the plugin system needs it).

## User-facing layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Profiles ▸ <SourceName> ▸ Person 1234567        [⟳] [📋 export] [⚙]    │
├──────────────────────────────────────────────────────────────────────────┤
│  Source [postgres_ohdsi ▾]  Person [1234567]  Cohort [Hypertension #42]  │
│  ♀ 1972 (52y at index)      4,829 events   Index 2018‑03‑14              │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌── Timeline (ECharts) ───────────────────────┐  ┌── Highlights ──────┐ │
│  │  ▒▒░░░░░░░░░░ observation period band       │  │ Tabs:              │ │
│  │  Drug      ●●●● ●●● ●●  ●                   │  │  • Concepts        │ │
│  │  Condition  ●●  ●     ●●●●                  │  │  • Concept sets    │ │
│  │  Visit     ▬▬   ▬   ▬▬                      │  │ [search]           │ │
│  │  Procedure  ●  ●● ●                         │  │ ◻ Lisinopril   42  │ │
│  │  ─────|══════════════════|─────►  brush     │  │ ◻ HCTZ          7  │ │
│  │   ‑365            0           +180 days     │  │ [colour: 🟦🟧🟩🟪]  │ │
│  └─────────────────────────────────────────────┘  │ [Clear all]        │ │
│  ┌── Events (v-data-table) ────────────────────┐  │ ◀ collapse         │ │
│  │ Filters: [Drug ✕] [Condition ✕]   🔍search  │  └────────────────────┘ │
│  │ Concept | Domain | Start | End  ↑           │                         │
│  └─────────────────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────────┘
```

Highlights drawer is open by default and collapsible to a thin rail with a `▶` re-expand button. Below the rail, on small viewports (`< md`), the highlights panel becomes a bottom sheet rather than a side drawer.

## Routes

```
/profiles                                       → empty state, source dropdown enabled
/profiles/:sourceKey                            → empty profile, person input enabled
/profiles/:sourceKey/:personId                  → loaded profile, no cohort context
/profiles/:sourceKey/:personId/:cohortId        → loaded profile, with cohort context
```

`meta.requiresAuth: true`. Source-key permission is enforced at render time; if the URL hard-codes a source the user cannot view, render an inline access-denied state inside the page rather than redirecting.

A new `coreNavigationItems` entry is added to `src/components/shared/NavBar.vue` pointing to `/profiles` with title key `navigation.profiles` (already present in `src/locales/en.json`).

## File layout

```
src/
├─ views/
│   └─ ProfileView.vue
├─ components/profile/
│   ├─ ProfileToolbar.vue
│   ├─ ProfileInputBar.vue
│   ├─ ProfileDemographics.vue
│   ├─ ProfileTimeline.vue
│   ├─ ProfileObservationBand.vue
│   ├─ ProfileEventsTable.vue
│   ├─ ProfileFilterChips.vue
│   ├─ HighlightsPanel.vue
│   ├─ HighlightsConceptList.vue
│   ├─ HighlightsConceptSetList.vue
│   └─ HighlightColorPicker.vue
├─ stores/
│   └─ profile.ts
├─ composables/
│   ├─ usePersonProfile.ts
│   └─ useTimelineFilters.ts
├─ services/
│   └─ profile.service.ts
├─ models/
│   └─ profile.types.ts
├─ router/index.ts                       (add 4 route entries)
└─ components/shared/NavBar.vue          (add nav entry)

tests/
├─ unit/
│   ├─ stores/profile.spec.ts
│   ├─ composables/useTimelineFilters.spec.ts
│   └─ services/profile.service.spec.ts
├─ component/profile/
│   ├─ ProfileInputBar.spec.ts
│   ├─ ProfileDemographics.spec.ts
│   ├─ ProfileEventsTable.spec.ts
│   ├─ ProfileTimeline.spec.ts
│   └─ HighlightsPanel.spec.ts
└─ e2e/
    ├─ profile-direct-url.spec.ts
    ├─ profile-search.spec.ts
    ├─ profile-filtering.spec.ts
    ├─ profile-highlights.spec.ts
    └─ profile-from-cohort-sample.spec.ts

tests/fixtures/person-profile.json
```

## Components (purpose, props, emits)

- **`ProfileView.vue`** — top-level page; reads route params, drives the store, renders all sub-components in the layout above. No business logic of its own.
- **`ProfileToolbar.vue`** — title breadcrumb, refresh button, export menu (CSV today, hooks for PDF later), highlights drawer toggle.
- **`ProfileInputBar.vue`** — source `v-select` (filtered by `isPermittedViewProfiles` and `hasCDM`), person `v-text-field` with submit-on-enter, cohort badge linking to the cohort definition. Emits route navigations rather than mutating store directly.
- **`ProfileDemographics.vue`** — gender icon (`mdi-gender-male/female/transgender`), birth-year string, age@index, total record count, observation-period span. Uses i18n keys `profiles.ageAt`, `profiles.atIndex`, `profiles.atStartOfObservation`, `profiles.recordCounts`.
- **`ProfileTimeline.vue`** — `<v-chart>` (vue-echarts) wrapper. Props: `series`, `dateRange`, `disabled`. Emits `brush` with `[fromDay, toDay]`. Uses ECharts category y-axis (12 OMOP domains), value x-axis (days from index), brush component for date selection, dataset-level color encoding from highlights map. If user has `isPermittedViewProfileDates` and `config.viewProfileDates`, renders a top axis with absolute dates derived from `indexDate + day`.
- **`ProfileObservationBand.vue`** — thin SVG band (a couple of `<rect>`s) above the chart, sized by ECharts grid coords from a layout signal; falls back to ASCII placeholder if the chart is hidden.
- **`ProfileEventsTable.vue`** — `v-data-table` over `filteredRecords`. Columns: conceptId, conceptName, domain, startDay, endDay. Default sort by `startDay` ascending. Client-side pagination 25/page. Renders `ProfileFilterChips` and a `v-text-field` search above the header.
- **`ProfileFilterChips.vue`** — closeable Vuetify chips, one per active domain in `domainFilter`; click on a chip removes that domain from the filter. A `[+ domain]` `v-menu` adds new domains using counts from `domainCounts`.
- **`HighlightsPanel.vue`** — `v-navigation-drawer` (right, persistent on `md+`, temporary on smaller). Two tabs: Concepts, Concept sets. Tab Concept sets is disabled when no `cohortDefinitionId`. Holds the `HighlightColorPicker` and "Clear all" at the bottom.
- **`HighlightsConceptList.vue`** — searchable list of unique `conceptId`/`conceptName`/`domain` extracted from the current `filteredRecords` (driven by `useTimelineFilters`). Multi-select via checkbox. Selection lives in panel-local state until the user clicks a color.
- **`HighlightsConceptSetList.vue`** — renders the cohort's concept sets (from `store.cohortDefinition`); selecting a set is equivalent to selecting all `conceptId`s it expands to.
- **`HighlightColorPicker.vue`** — six palette swatches (the same palette as Atlas 2.15: `#a6cee3 #1f78b4 #b2df8a #33a02c #fb9a99 #e31a1c`). Click applies the chosen color to the selected concepts via `store.applyHighlight()`.

## Store: `src/stores/profile.ts`

```ts
state:
  person: PersonProfile | null
  sourceKey: string | null
  personId: number | null
  cohortDefinitionId: number | null
  cohortDefinition: CohortDefinition | null
  loading: boolean
  error: string | null
  domainFilter: Set<string>
  textFilter: string
  dateRange: [number, number] | null
  highlights: Map<number, HighlightColor>   // conceptId -> color

getters:
  indexDate            // cohort.startDate | min(record.startDate)
  filteredRecords      // person.records ∩ domainFilter ∩ textFilter ∩ dateRange
  domainCounts         // record count per domain across full records
  chartSeries          // ECharts datasets shaped by domain + highlights
  observationBands     // [{ x1, x2 }] for the band component
  hasCohortContext     // !!cohortDefinitionId

actions:
  setRouteParams({ sourceKey, personId, cohortDefinitionId })
  loadPerson()         // service.getPerson + (optional) service.getCohortConceptSets
  setDomainFilter(domain, on)
  setTextFilter(s)
  setDateRange(range)
  applyHighlight(conceptIds[], color)
  clearHighlights()
  reset()              // clears everything except sourceKey
```

The store mirrors route params; navigation is the single source of truth, the store reacts to it. Filters and highlights are session-only and reset whenever `(sourceKey, personId)` changes.

## Composables

- **`usePersonProfile()`** — wraps the store load lifecycle: watches `route.params`, calls `setRouteParams` + `loadPerson`, returns `{ person, loading, error, isReady }`. Used by `ProfileView`.
- **`useTimelineFilters()`** — pure-derived helpers operating off `store.filteredRecords` + `store.highlights`: `chartSeries`, `uniqueConcepts` (for the highlights tab), `domainCounts`, `observationBands`. Keeps store thin and composables testable in isolation.

## Service: `src/services/profile.service.ts`

```
getPerson(sourceKey: string, personId: number, cohortId?: number): Promise<ApiResult<PersonProfile>>
  GET /{sourceKey}/person/{personId}?cohort={cohortId ?? 0}
  Validates response with PersonProfileSchema (Zod).
  Returns failure('profiles.cantFind') on 404.

getCohortConceptSets(cohortDefId: number): Promise<ApiResult<ConceptSet[]>>
  Reuses existing cohort-definition fetch; extracts ConceptSets[] from the
  expression. No new endpoint.
```

Both functions follow the existing `webapi.ts` shape: `httpClient` for the request, `Schema.safeParse` for validation, `success` / `failure` `ApiResult` return type, errors logged via `logger.error('ProfileService', ..., err)`.

## Schemas: `src/models/profile.types.ts`

```ts
PersonRecordSchema = {
  conceptId: number, conceptName: string, domain: string,
  startDate: number,                    // epoch ms
  endDate: number | null,
  startDay: number, endDay: number | null,
}

PersonCohortSchema = { cohortDefinitionId: number, startDate: number, endDate: number | null }
ObservationPeriodSchema = { startDate: number, endDate: number, startDays: number, endDays: number }

PersonProfileSchema = {
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN' | string,  // lenient; normalized client-side
  yearOfBirth: number, monthOfBirth: number | null, dayOfBirth: number | null,
  ageAtIndex: number, recordCount: number,
  records: PersonRecord[],
  cohorts: PersonCohort[],
  observationPeriods: ObservationPeriod[],
}

HighlightColor = 'none' | one of 6 palette colors
```

## Data flow

```
Route /profiles/:sourceKey?/:personId?/:cohortId?
  ↓
ProfileView mounted → usePersonProfile() → store.setRouteParams() → if all present, store.loadPerson()
  ↓
service.getPerson() → Zod validate → store.person
  ↓ (if cohortId)
service.getCohortConceptSets() → store.cohortDefinition
  ↓
useTimelineFilters() exposes derived data:
  • filteredRecords  → ProfileEventsTable
  • chartSeries      → ProfileTimeline
  • uniqueConcepts   → HighlightsConceptList
  • domainCounts     → ProfileFilterChips, HighlightsPanel
  ↓
Brush on ECharts → store.setDateRange()
Filter chip click → store.setDomainFilter()
Highlight applied → store.applyHighlight()
```

## Permissions

- Source list shown in `ProfileInputBar` is filtered to sources where `permissions.canViewProfiles(sourceKey)` is true and `source.hasCDM` is true.
- `ProfileTimeline` reads `permissions.canViewProfileDates()` to decide whether to render the absolute-date top axis. Default off.
- If the URL specifies a source the user lacks permission for, `ProfileView` renders an inline access-denied panel inside the page chrome (no redirect).

## Errors and edge cases

- Missing personId in URL → empty state with input bar, no error toast.
- API 404 → `error = 'profiles.cantFind'`; inline message "Can't find person {personId} in {source}" with retry input.
- API 5xx → existing `httpClient` retry (3×, exponential backoff); on final failure, snackbar via `useUIStore().showSnackbar(error)`.
- Zod validation failure → `logger.error`; user sees a generic "this person's data could not be displayed" message; details available in the dev console.
- Cohort context with deleted cohort → load profile, show small warning banner; index date falls back to `min(record.startDate)`.
- Records with `endDate = null` → render single dot on chart, em-dash in End Day column.
- Records spanning the full observation period → clamp to chart x-extent visually; raw values still appear in tooltip.
- Source switch mid-session → clear current person, filters, highlights; do not auto-fetch unless the new URL has a personId.
- Person switch keeping source → keep source, clear filters and highlights, fetch new person.
- `recordCount > 20000` → banner offering to disable the timeline (`ProfileTimeline disabled` prop). Table paginates regardless.
- Person with zero records → demographics still render; chart shows empty state; table shows "no events".

## Testing

**Unit (`tests/unit/`)**

- `stores/profile.spec.ts` — load flow with cohort and without; route-param reactions; filter actions; highlight map; reset clears state but preserves `sourceKey`.
- `composables/useTimelineFilters.spec.ts` — domain∩text∩dateRange intersection; observation band derivation; chart-series shape; highlights merged into series.
- `services/profile.service.spec.ts` — Zod parse pass/fail with fixture; `cohort` query param defaults to 0; 404 maps to `failure('profiles.cantFind')`; retry/error path delegated to `httpClient` (mocked).

**Component (`tests/component/profile/`)**

- `ProfileInputBar.spec.ts` — dropdown filtered by permission and `hasCDM`; change pushes route; person enter pushes route.
- `ProfileDemographics.spec.ts` — gender → icon mapping; "at index" vs "at start of observation" depending on cohort context.
- `ProfileEventsTable.spec.ts` — chip add/remove updates store; search filters table; empty state visible.
- `ProfileTimeline.spec.ts` — receives `chartSeries` prop; emits `brush` event with day range.
- `HighlightsPanel.spec.ts` — tab switching; "Concept sets" disabled without cohort; color application updates store; clear-all resets.

**E2E (`tests/e2e/`)**

- `profile-direct-url.spec.ts` — visit fully-qualified URL, header + chart + table render against fixture mock.
- `profile-search.spec.ts` — visit `/profiles`, choose source, type personId, see profile.
- `profile-filtering.spec.ts` — apply domain chip, table + chart shrink in lockstep; brush narrows date range.
- `profile-highlights.spec.ts` — open panel, pick concepts, apply color, verify chart points colored.
- `profile-from-cohort-sample.spec.ts` — from samples view, click a person row → land on profile with cohort context preloaded.

API mocks reuse `tests/e2e/helpers/api-mocks.ts`. Add fixture `tests/fixtures/person-profile.json` with synthetic records across all 12 OMOP domains, two observation periods, and one cohort-membership record.

## i18n

All required keys already exist in `src/locales/en.json` (mirrored from WebAPI's `messages_en.json`):

- `navigation.profiles` — "Profiles"
- `profiles.title`, `profiles.personId`, `profiles.selectADataSource`
- `profiles.ageAt`, `profiles.atIndex`, `profiles.atStartOfObservation`, `profiles.recordCounts`
- `profiles.eventHighlighting`, `profiles.setSelectedEventsColor`, `profiles.clearAllHighlightColors`
- `profiles.highlightEventsTooltip`, `profiles.toggleChartTooltip`, `profiles.toggleTableTooltip`
- `profiles.loadingProfile`, `profiles.processingProfile`, `profiles.clickHereToSelectACohort`
- `profiles.сantFind` (note: Cyrillic 'с' — preserved verbatim from WebAPI)
- `profiles.chart.event`, `profiles.chart.startDay`, `profiles.chart.startDate`
- `columns.conceptId`, `columns.conceptName`, `columns.domain`, `columns.startDay`, `columns.endDay`
- `facets.caption.domain`

No new i18n keys required. Per `CLAUDE.md`, `src/locales/en.json` is read-only in Atlas3.

## Linking from existing features

- **Cohort sample person row** — wherever the existing samples view renders a person row in Atlas3, add an `<router-link :to="profileRouteFor(person, sourceKey, cohortId)">` wrapper. New helper `src/utils/profile-routes.ts` exports `profileRouteFor()` to keep the URL shape DRY.
- **Characterization / inclusion person rows** — same helper, same pattern, applied wherever per-person rows already render.

These two integrations are scoped tightly: only adding navigation links, not refactoring the surrounding views.

## Build sequence

1. Schemas + service + store skeleton + tests for those (no UI).
2. View + InputBar + Demographics + route entry + nav entry, hitting the store. Manual smoke against demo WebAPI.
3. Timeline + ObservationBand (ECharts integration is the riskiest piece).
4. EventsTable + FilterChips.
5. HighlightsPanel + ConceptList + ConceptSetList + ColorPicker.
6. Linking from samples and characterization rows.
7. E2E suite.

Steps 1–5 are mostly independent inside the new `profile/` namespace and can be parallelized across subagents using the existing service+store as the contract. Steps 6 and 7 run last because they depend on the page being usable.
