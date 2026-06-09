# Vue Composables — Concepts & Codebase Analysis

## What is a Composable?

A **composable** is a plain TypeScript/JavaScript function that encapsulates
reusable logic using Vue 3's Composition API (`ref`, `reactive`, `computed`,
`watch`, lifecycle hooks, etc.). The function is called from inside a component
or another composable, and it returns reactive state and/or behavior.

Think of it as the Vue equivalent of a Knockout ViewModel — but extracted into
a standalone, reusable function rather than tied to a specific component.

```ts
export function useEventPersistence(initialCriteria?: ExitCriteria) {
  const state = reactive<EventPersistenceState>(initializeState(initialCriteria))
  // ... functions and computed values ...
  return { state, switchStrategy, toExitCriteria, hasErrors, getError }
}
```

Each call to `useEventPersistence()` creates a **new, isolated** reactive state
instance. Two components calling it get completely independent state — unlike a
Pinia store, which is a singleton shared across all callers.

---

## The `use` Naming Convention

All composables are prefixed with `use` (e.g., `useAuth`, `useI18n`,
`usePagination`). This is an **official Vue convention**, not a runtime
requirement. It exists for three reasons:

1. **Signals reactivity involvement** — the prefix marks functions that use
   Vue's reactivity system and may tie into the component lifecycle.
2. **Borrowed from React Hooks** — React established `useState`, `useEffect`,
   etc. for the same reason; Vue adopted the convention when the Composition
   API launched in Vue 3.
3. **Enables lint tooling** — ESLint plugins can enforce that `use*` functions
   are only called in valid contexts (inside `setup()` or another composable).

A plain utility function (`formatDate`, `parseToken`) does not get the prefix.
A function that returns reactive state or registers lifecycle hooks does.

---

## Composables vs. Pinia Stores

| | Composable (local `ref`/`reactive`) | Pinia Store |
|---|---|---|
| State scope | Per-caller instance | Global singleton |
| Sharing | Each caller gets its own copy | All callers share the same state |
| Use case | Per-component logic, reusable patterns | Cross-cutting app state |
| Example | `useEventPersistence()`, `usePagination()` | `useAuthStore()`, `useLocaleStore()` |

A composable that *wraps* a Pinia store (like `useAuth()`) is shared because
the store underneath is a singleton — not because of the composable itself.

**Decision rule:** start with local `ref`/`reactive` in the component. Extract
to a composable if the pattern recurs. Move to Pinia only if two unrelated
parts of the app need to observe the same state simultaneously.

---

## Vue Composable Rules (vs. React Hooks)

Vue's rules are significantly lighter than React's:

- **React** requires hooks to be called at the top level always — no `if`,
  `for`, or nested functions. This is because React tracks hooks by call order.
- **Vue** has no call-order dependency. The only restriction is that composables
  using lifecycle hooks (`onMounted`, `onUnmounted`, etc.) must be called inside
  `setup()` or `<script setup>`. Composables that only use `ref`/`computed` can
  be called anywhere.

In practice, Vue composables feel like regular functions that happen to return
reactive values.

---

## Codebase Analysis — Atlas3

A sweep of `src/composables/` against all `src/**/*.vue` and `src/**/*.ts`
import sites reveals three categories:

### Genuinely Shared (multiple consumers — justified as composables)

| Composable | # Consumers | Notes |
|---|---|---|
| `useRoles` | 8 components | Entire permissions section depends on it |
| `useFilterConfig` | 6 components | All cohort-builder filter components |
| `useEntityAccess` / `useEntityAccessFor` | 5+ | Views and table components |
| `usePermissions` | 4+ | Multiple feature views |
| `useAttributeConfig` | 3 | Cohort-builder attribute editors |
| `useTemporalWindows` | 3 | Cohort-builder time window editors |
| `useIncidenceRateGeneration` | 2 | Workbench + generate popover |
| `useTimelineFilters` | 2 | Profile timeline + highlights list |
| `useTrexSQLCache` | 2 | Config section + patient count bar |
| `usePathwayResults` | 2 | Results view + workbench |

### Single-Use (only one consumer — could be local component state)

| Composable | Only consumer |
|---|---|
| `useEventPersistence` | `EventPersistenceSelector.vue` |
| `useConfigUndo` | `VocabularySchemaSection.vue` |
| `useAtlasConverter` | `CohortBuilder.vue` |
| `usePersonProfile` | `ProfileView.vue` |
| `usePathwayBuilder` | `PathwayBuilder.vue` |
| `usePathwayGeneration` | `PathwayGeneratePopover.vue` |
| `useLicenseAgreement` | `App.vue` |
| `useVersions` | `VersionsTabContent.vue` |
| `useIncidenceRateBuilder` | `IncidenceRateBuilder.vue` |
| `useIncidenceRates` | `IncidenceRatesView.vue` |
| `useCharacterizationResults` | `CharacterizationWorkbench.vue` |
| `useJobs` | `JobsSection.vue` |

These are not *wrong* — extracting complex logic from a large component into a
composable is a valid organizational pattern even with a single consumer. But
they are not reused, and the logic could live directly in the component if
simplicity were preferred.

### Partial-Use / Mixed Concerns

`useExecutionPolling` exports two things used in different ways:
- The **composable function** is only called inside a Pinia store
  (`stores/characterization.ts`) — unusual, but valid.
- `isTerminalStatus` is a **pure utility function** imported by two components
  (`CharacterizationWorkbench.vue`, `ExecutionRow.vue`) that have no interest in
  the polling behavior itself.

This is a sign that `isTerminalStatus` belongs in a `utils/` file rather than
a composable — it has no reactive state, no lifecycle dependency, and is being
used as a plain helper.

---

## Summary

Composables are the primary unit of logic reuse in Vue 3. The `use` prefix is
a convention that signals reactive involvement. Vue's rules are lighter than
React's. Pinia stores are the right tool when state must be shared globally;
composables are the right tool for per-instance reactive patterns.

In Atlas3, roughly one-third of composables are single-use organizational
extractions rather than shared behavior. This is a known and accepted pattern,
but it is worth distinguishing from composables that are genuinely reused.
