# Cohort Editor Migration Notes

## Overview

This document describes the migration from the legacy `cohort-builder` component
layer to the `cohort-editor` components that work directly against the native
circe object model. The goal was to remove the mapping layer and the
event-driven synchronization path, and instead let Vue components mutate the
reactive circe cohort expression object in place.

The migration also made `StrataEditor` (Characterization subgroup analyses) and
`IncidenceRateStratifyRuleEditor` first-class consumers of the same criteria
editing infrastructure already used by `CohortExpressionEditor`. That shared
infrastructure is schema-backed: the TypeScript types in `circe.types.ts` mirror
the circe-be Java classes and are used directly by the editors.

---

## Background

### The Legacy Layer

The original cohort-builder folder contained a set of components that grew
alongside the early Atlas 3 prototype.  The primary ones involved in criteria
group editing were:

| Component | Role |
|---|---|
| `GroupCriteriaUI.vue` | Rendered a criteria group (logic type + events) |
| `CriteriaEventCard.vue` | Rendered a single criteria event within a group |
| `AttributesEditor.vue` | Attribute panel for an event card |
| `DateAdjustmentEditor.vue` | Date adjustment sub-panel |
| `CardinalityEditor.vue` | Occurrence count editor |
| `TemporalWindowEditor.vue` | Time-window constraint editor |
| `EventConceptSetField.vue` | Concept set picker field on a card |
| `useCriteriaGroupPicker.ts` | Composable managing concept set dialog state |

These components used a hand-written TypeScript interface from
`src/models/cohort.types.ts` with camelCase property names (`logicType`,
`events`, `nestedGroups`).  That shape did not match the PascalCase JSON
produced by circe-be / WebAPI (`Type`, `CriteriaList`, `Groups`), which meant
every consumer needed to translate between the two representations.

The legacy editors also relied on event-based mutation patterns: components
emitted updates, parent components copied the data back into the document, and
concept set selection used stored paths to find the field to assign. That model
made the UI more generic, but it also spread ownership of the underlying
criteria object across multiple layers.

### The Cohort Editor

The newer `cohort-editor` folder was built to serve `CohortExpressionEditor`
and defined:

- **`circe.types.ts`** — Zod schemas that faithfully represent the circe-be
  Java model. TypeScript types are inferred from the schemas so the type
  definition and runtime validation stay in sync with the WebAPI payload.
- **Domain-specific criteria editors** — Components such as
  `ConditionOccurrence.vue`, `DrugExposure.vue`, `Observation.vue`, and the
  other criteria editors own the fields for their specific domain directly.
  They mutate the underlying circe object graph in place rather than routing
  through a generic attribute-card abstraction.
- **`CriteriaGroup.vue`** — A recursive criteria group editor that accepts a
  `CriteriaGroup` object by reference and mutates it in-place using Vue
  reactivity. It is one piece of the system, not the center of the migration.
- **`CorelatedCriteria.vue` / `DemographicCriteria.vue`** — Individual criteria
  row editors that operate directly on the circe object model.
- **`criteria-editor.types.ts`** — Supporting types for concept set selection
  (`ConceptSetOption`, `ConceptSetSelectionTarget`).

---

## What Changed

### 1. Native Circe Model as the Type Authority

The legacy `cohort.types.ts` mapping layer was retired in favor of the
schema-backed circe model from `cohort-editor/circe.types.ts`.

Those Zod schemas mirror the circe-be Java classes directly, so the TypeScript
types are a faithful representation of the WebAPI payload rather than a local
editor-only abstraction. That change matters across the entire cohort editor,
not just for `CriteriaGroup`.

**Before:**
```typescript
// src/models/cohort.types.ts
interface CriteriaGroup {
  logicType: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  count?: number
  events: CriteriaEvent[]
  nestedGroups: CriteriaGroup[]
}
```

**After:**
```typescript
// src/components/cohort-editor/circe.types.ts  (Zod-inferred from circe-be)
interface CriteriaGroup {
  Type?: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  Count?: number
  CriteriaList?: CorelatedCriteria[]
  DemographicCriteriaList?: DemographicCriteria[]
  Groups?: CriteriaGroup[]
}
```

The PascalCase names match the Jackson serialization output of circe-be
directly. No translation layer is needed anywhere on the round-trip path.

### 2. Direct Object-Model Mutation

The old event/copy/update flow was replaced by direct mutation of the reactive
circe cohort expression document. A component owns a subset of the object graph
and updates that subset in place.

That means:

- no mapped intermediate model;
- no "copy to local state, emit update, reapply in parent" loop;
- no path-based lookup when the user selects a concept set;
- no extra translation step between the UI and the WebAPI payload.

Concept set selection now emits a reference to the target field so the dialog
can assign the selected codeset ID directly to the right property.

### 3. Domain-Specific Criteria Editors

Instead of a generic `CriteriaEventCard` that rendered arbitrary attributes from
an attribute spec, the migration moved logic into criteria-specific editors.
Each editor now declares the fields that belong to that domain explicitly.

That makes the UI easier to understand and the data model harder to misuse:

- `ConditionOccurrence.vue` owns condition-specific fields.
- `DrugExposure.vue` owns drug-specific fields.
- `Observation.vue` owns observation-specific fields.
- `VisitOccurrence.vue` owns visit-occurrence-specific fields.

`CriteriaGroup.vue` remains important, but it is the recursive container that
hosts those editors rather than the primary focus of the migration.

The model types in `characterization.types.ts` and `incidence-rate.types.ts`
were updated to reference `CriteriaGroupSchema` from `circe.types.ts`, giving
them Zod-backed runtime validation as a side effect.

### 4. Component Replacement

`GroupCriteriaUI` and its supporting mapping/event layer were replaced by the
`cohort-editor` components that operate directly on the circe object model.

The key behavioral difference is the ownership model:

**Legacy model (event-driven synchronization):**  
`GroupCriteriaUI` owned a copy of the criteria group and emitted `update`
events when it changed.  Callers had to listen for those events and apply the
changes back to the document.  This required a synchronization layer and
created extra mutation boundaries.

**Circe model (direct document mutation):**  
Components receive references into the actual circe cohort expression object
and mutate those properties directly using Vue computed setters, array
operations, and field-level refs. The reactive document is the single source of
truth. No intermediate mapping layer or field-translation step is needed for
field-level changes.

This aligns directly with principles 1, 2, and 17 from
[Document_Editor_HOWTO.md](Document_Editor_HOWTO.md):
> *The cohort definition is the single source of truth.*  
> *Components directly edit the portion of the document they own.*  
> *Prefer less synchronization over more synchronization.*

### 5. Concept Set Selection Redesign

The legacy `useCriteriaGroupPicker` composable used a tree-traversal approach:
when a concept set was chosen, it walked the criteria tree to find the target
field by a stored path.

The new `useCirceConceptSetPicker` composable uses a direct reference approach:

```typescript
// ConceptSetSelectionTarget — defined in criteria-editor.types.ts
interface ConceptSetSelectionTarget {
  targetRef: Ref<number | undefined>
}
```

When the user clicks a concept set picker inside any criteria card (at any
depth), `CriteriaGroup` emits the `select-concept-set` event carrying a
`ConceptSetSelectionTarget` — a direct `Ref` that points to the `CodesetId`
field on that specific criteria object.  When the user picks a concept set from
the dialog, the composable writes the selected ID into `targetRef.value`
directly.  No traversal, no path tracking.

One subtle implementation note: `activeTarget` is stored as a plain `let`
variable rather than a `ref<ConceptSetSelectionTarget>`.  Wrapping it in `ref`
would cause Vue to auto-unwrap the inner `targetRef: Ref<number|undefined>`,
making the nested ref inaccessible.  Keeping it as a plain mutable variable
avoids that interaction while still being correct for its lifecycle (it is only
meaningful during an active selection operation).

### 6. StrataEditor

`StrataEditor.vue` (Characterization subgroup analyses) was rewritten to use
`CriteriaGroup` for per-stratum criteria editing.  Because the criteria group
editor is too dense for the 280px rail panel, editing opens in a full-width
dialog.  The dialog pattern creates a reactive deep clone of the stratum's
criteria, which `CriteriaGroup` mutates in-place.  On dialog close the updated
object is emitted as part of the updated stratum.

The composable `useCirceConceptSetPicker` is instantiated once in
`StrataEditor`, with `getConceptSets`/`addConceptSet` callbacks targeting a
`strataConceptSets` array owned at the `CharacterizationDefinition` level.
This keeps concept sets at the expression level, separate from individual
stratum criteria, which is the same pattern used in `CohortExpressionEditor`.

The `hasCriteria()` helper was updated to check `CriteriaList.length +
DemographicCriteriaList.length` against the circe shape instead of the old
`events.length`.

### 7. IncidenceRateStratifyRuleEditor

`IncidenceRateStratifyRuleEditor.vue` follows a simpler pattern: it maintains a
local `reactive<CriteriaGroup>` copy of the rule's `expression` field and
passes it directly to `CriteriaGroup`.  Changes are detected by a `watchEffect`
and emitted upward as a partial `StratifyRule` update.  Concept sets flow down
as a prop from `IncidenceRateWorkbench` through `IncidenceRateStratifyInspector`
and are managed by a `useCirceConceptSetPicker` instance in the rule editor.

### 6. File Cleanup

The migration resulted in the following deletions once the replacement
components were stable and tests were passing:

**Source files removed:**

| File | Reason |
|---|---|
| `cohort-builder/GroupCriteriaUI.vue` | Replaced by `cohort-editor/criteria/CriteriaGroup.vue` |
| `cohort-builder/CriteriaEventCard.vue` | Rendered by `CorelatedCriteria.vue` / `DemographicCriteria.vue` |
| `cohort-builder/AttributesEditor.vue` | Embedded in the new criteria card components |
| `cohort-builder/DateAdjustmentEditor.vue` | Embedded in the new criteria card components |
| `cohort-builder/CardinalityEditor.vue` | Handled internally by `CorelatedCriteria.vue` |
| `cohort-builder/TemporalWindowEditor.vue` | Handled internally by `CorelatedCriteria.vue` |
| `cohort-builder/TemporalFilterChip.vue` | No longer needed |
| `cohort-builder/EventConceptSetField.vue` | Replaced by concept-set handling in `CorelatedCriteria.vue` |
| `cohort-builder/CachePreviewSelector.vue` | No active callers |
| `cohort-builder/PatientCountBar.vue` | No active callers |
| `composables/useCriteriaGroupPicker.ts` | Replaced by `useCirceConceptSetPicker.ts` |

`ConfigurationWarningBanner.vue` — the only remaining file in `cohort-builder/`
— was moved directly to `src/components/` since it is an app-level concern
unrelated to cohort building.  The `cohort-builder/` folder was then deleted.

All corresponding test files for the deleted source files were also removed.

---

## Structural Advantages

### Single Type Authority

Before the migration, the same conceptual object ("a criteria group") had two
separate TypeScript representations in the codebase.  Any component or store
that touched both the cohort editor and the characterization/incidence-rate
editors had to be aware of both shapes and manage the mapping.

After the migration, `circe.types.ts` is the single source of truth for the
native circe model used by the cohort editor. The schemas are Zod-backed, so
the same definitions are used for deserialization, runtime validation, and
TypeScript inference — not just for type checking.

### Faithful Round-Trip

Because the circe types use the same PascalCase field names as the WebAPI JSON
payload, the cohort expression round-trips directly without a translation
layer. The JSON received from the server has the same structure the editor uses
internally, and the same object model is written back to the server on save.

That is what makes the round-trip "faithful": when the user loads a cohort,
edits it, and saves it again, the editor should preserve the structure and
meaning of the circe object graph rather than converting it into a separate
intermediate model that could drop or rename fields.

### Recursive Editor Reuse

The cohort editor components are reusable because they share the same circe
object model. Any editor that works with a `CriteriaGroup` gets full support
for nested groups, `DemographicCriteria`, all OMOP domain criteria types,
time-window constraints, occurrence counts, and concept set selection — for
free. Adding a new OMOP domain criteria type to the shared circe schemas makes
it available in every feature that consumes them.

### Alignment with Document Editor Principles

The migration brought two additional feature editors into alignment with the
document editor principles established in `Document_Editor_HOWTO.md`:

- **Direct mutation** replaces event-chain synchronization for field-level
  changes (principles 2, 11).
- **Single source of truth** — the reactive store document — drives the UI
  rather than mirrored component state (principles 1, 9, 17).
- **UI state is local** — dialog open/close, active concept set target — while
  document state (criteria, concept sets) lives in the expression (principle 3).
- **Sparse model preserved** — new strata are initialized with only
  `{ Type: 'ALL', CriteriaList: [] }` and arrays are created lazily by
  `CriteriaGroup` only when the user adds an item (principle 4).

---

## File Map (Post-Migration)

```
src/
  components/
    ConfigurationWarningBanner.vue        ← moved from cohort-builder/
    cohort-builder/                       ← DELETED (folder empty after move)
    cohort-editor/
      circe.types.ts                      ← authoritative CriteriaGroup type
      CohortExpressionEditor.vue
      criteria/
        CriteriaGroup.vue                 ← shared recursive group editor
        CorelatedCriteria.vue
        DemographicCriteria.vue
        criteria-editor.types.ts          ← ConceptSetSelectionTarget
    characterization/
      StrataEditor.vue                    ← uses CriteriaGroup + useCirceConceptSetPicker
      CharacterizationDesignForm.vue      ← threads strataConceptSets
    incidence-rate/
      IncidenceRateStratifyRuleEditor.vue ← uses CriteriaGroup + useCirceConceptSetPicker
      IncidenceRateStratifyInspector.vue  ← threads conceptSets prop
      IncidenceRateWorkbench.vue          ← owns irConceptSets computed

  composables/
    useCirceConceptSetPicker.ts           ← replaces useCriteriaGroupPicker
    (useCriteriaGroupPicker.ts deleted)

  models/
    characterization.types.ts            ← Stratum.criteria: CriteriaGroup (circe)
    incidence-rate.types.ts              ← StratifyRule.expression: CriteriaGroup (circe)
```

---

## Key Composable: `useCirceConceptSetPicker`

This composable is key because it replaces the legacy path-based concept set
selection flow with direct field references into the circe object model. It is
the small piece that makes concept set selection work without a traversal layer:
the editor hands it a target ref, and the picker writes the selected codeset ID
straight into the live cohort expression document.

```typescript
export function useCirceConceptSetPicker(opts: {
  getConceptSets: () => ConceptSet[]
  addConceptSet: (cs: ConceptSet) => void
}) {
  const dialogOpen = ref(false)
  let activeTarget: ConceptSetSelectionTarget | null = null  // plain let, not ref

  const conceptSetOptions = computed<ConceptSetOption[]>(...)

  function onSelectConceptSet(target: ConceptSetSelectionTarget | undefined) {
    activeTarget = target ?? null
    dialogOpen.value = true
  }

  async function onConceptSetSelected(conceptSet: ...) {
    // adds to expression-level concept sets if not present
    // writes numericId directly into target.targetRef.value
  }

  return { dialogOpen, conceptSetOptions, onSelectConceptSet, onConceptSetSelected }
}
```

Callers provide two callbacks — one to read the current concept set list, one to
append a new entry — and receive the four values they need to wire up
`CriteriaGroup` and `ConceptSetSelectionDialog`.

---

## Lint Configuration

The cohort-editor's design patterns trigger several ESLint rules that are
intentional rather than erroneous.  Rather than scattering inline disable
comments across every component, a single `overrides` block was added to
`.eslintrc.cjs` scoped to `src/components/cohort-editor/**`:

```js
{
  files: ['src/components/cohort-editor/**/*.{vue,ts}'],
  rules: {
    'vue/no-side-effects-in-computed-properties': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'vue/multi-word-component-names': 'off',
    'vuejs-accessibility/no-autofocus': 'off',
  },
}
```

**`vue/no-side-effects-in-computed-properties`** — The document editor pattern
initializes sparse model arrays lazily inside computed getters (e.g.
`innerCriteria` in `CorelatedCriteria` ensures `props.criteria.Criteria`
exists).  This is the same rationale as the global `vue/no-mutating-props: 'off'`
already in the config.

**`@typescript-eslint/no-explicit-any`** — The generic plumbing layer
(`bindings.ts`, `criteria-editor-helper.ts`, `criteria-editor.types.ts`) uses
`Record<string, any>` to work across arbitrary Zod-inferred types.  Each
domain criteria Vue file also uses `Record<string, any>` to extract its specific
sub-object from the `Criteria` discriminated union.  The Zod schema at the
WebAPI boundary is the real safety layer; converting these to `unknown` would
require 30+ type assertions with no meaningful safety benefit.

**`vue/multi-word-component-names`** — `Death`, `Measurement`, `Observation`,
`Window`, and `Period` are OMOP/circe domain names that mirror their Java model
counterparts exactly.  Renaming them would misalign with the domain model.

**`vuejs-accessibility/no-autofocus`** — `autofocus` on a popover or
inline-edit text field that the user just opened is correct UX and matches the
WCAG dialog interaction pattern.  The rule targets page-load focus hijacking,
not triggered popovers.

One additional surgical fix was made outside the folder override:
`concept-set-usage.ts` uses a `while (true)` loop to unwrap Zod schema layers.
A single `// eslint-disable-next-line no-constant-condition` comment was added
at that line rather than suppressing the rule folder-wide.

The `vue/no-restricted-html-elements` warnings throughout the cohort-editor
(direct Vuetify component usage instead of Atlas wrappers) are already
configured as `warn` severity in the base config and do not block commits.
Migrating to Atlas wrappers is a separate follow-up task.

---

## Testing Notes

After the migration, test files for all deleted components were removed.
The surviving tests for the migrated components were updated to:

- Import `CriteriaGroup` from `cohort-editor/circe.types` instead of
  `models/cohort.types`.
- Use `CriteriaGroup: true` as a stub instead of `GroupCriteriaUI: true`.
- Use circe PascalCase field names in fixtures
  (`{ Type: 'ALL', CriteriaList: [] }` instead of `{ logicType: 'ALL', events: [] }`).
- Supply the new required `conceptSets` prop where components gained it.

Tests are run with `--no-isolate` for single-file or per-folder runs.  Running
too many folders together with `--no-isolate` can produce state pollution
artifacts; scope the run to the folders under test.
