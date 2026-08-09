# Task 7 report: merge duplicated spec pairs

## Step 1: pair verification

Command run for each basename:

```
grep -h "^import .* from '@/components" <unit-file> <component-file>
```

| Basename | `tests/unit/components` path | `tests/component` path | Import (unit) | Import (component) | Verdict |
|---|---|---|---|---|---|
| BarChart.spec.ts | reports/charts/BarChart.spec.ts | reports/charts/BarChart.spec.ts | `@/components/ui/charts/AtlasBarChart.vue` | `@/components/ui/charts/AtlasBarChart.vue` | true duplicate |
| ConceptTable.spec.ts | concepts/ConceptTable.spec.ts | concept-sets/ConceptTable.spec.ts | `@/components/concepts/ConceptTable.vue` | `@/components/concepts/ConceptTable.vue` | true duplicate (directory name differs, import target is identical) |
| CriteriaEventCard.spec.ts | cohort-builder/CriteriaEventCard.spec.ts | cohort-builder/CriteriaEventCard.spec.ts | `@/components/cohort-builder/CriteriaEventCard.vue` | same | true duplicate |
| DataSourceRunTable.spec.ts | generation/DataSourceRunTable.spec.ts | generation/DataSourceRunTable.spec.ts | `@/components/generation/DataSourceRunTable.vue` | same | true duplicate |
| ErrorBoundary.spec.ts | shared/ErrorBoundary.spec.ts | shared/ErrorBoundary.spec.ts | `@/components/shared/ErrorBoundary.vue` | same | true duplicate |
| InclusionCriteriaPanel.spec.ts | cohort-builder/InclusionCriteriaPanel.spec.ts | cohort-builder/InclusionCriteriaPanel.spec.ts | `@/components/cohort-builder/InclusionCriteriaPanel.vue` | same | true duplicate |
| NestedCriteriaRenderer.spec.ts | cohort-builder/NestedCriteriaRenderer.spec.ts | cohort-builder/NestedCriteriaRenderer.spec.ts | `@/components/cohort-builder/NestedCriteriaRenderer.vue` | same | true duplicate |
| PieChart.spec.ts | reports/charts/PieChart.spec.ts | reports/charts/PieChart.spec.ts | `@/components/ui/charts/AtlasPieChart.vue` | same | true duplicate |
| TreemapChart.spec.ts | reports/charts/TreemapChart.spec.ts | reports/charts/TreemapChart.spec.ts | `@/components/ui/charts/AtlasTreemapChart.vue` | same | true duplicate |
| GroupCriteriaUI.spec.ts | cohort-builder/GroupCriteriaUI.spec.ts | *(absent)* | n/a | n/a | not a pair — already merged in Task 4, confirmed by `find` (only one copy exists) |

All nine pairs targeted the same component. No false pair like the `ConceptSearch.spec.ts` precedent turned up this round. `ConceptTable.spec.ts` was checked most carefully per the brief's warning (this repo has had same-named components under `concepts/` and `concept-sets/`) — both specs import `@/components/concepts/ConceptTable.vue`; the `tests/component/concept-sets/` directory name is just where that spec file happened to live, not a different target component.

## Step 2: merges

For each pair, the larger file was kept (component-side preferred on a close call, per brief); `it(` titles were diffed; anything unique and non-vacuous was folded in; the smaller file was `git rm`'d.

### BarChart.spec.ts — kept `tests/component/reports/charts/BarChart.spec.ts` (605→634 lines), deleted `tests/unit/components/.../BarChart.spec.ts` (291 lines)
Folded in (both unique, non-vacuous edge/prop assertions not covered by the kept file):
- `should handle data with mismatched array lengths` → added to `Edge Cases`
- `should handle data with negative values` → added to `Edge Cases`
- `should use image type for skeleton loader` (`skeleton.props('type')).toBe('image')`) → added to `Loading State`

Dropped as duplicate/subsumed by an equivalent kept-file assertion (same behavior, different title): render/skeleton/export existence checks, prop pass-through checks, default-value checks, zero-value handling, resize handling. None were vacuous, just redundant with existing kept-file coverage.

### PieChart.spec.ts — kept `tests/component/.../PieChart.spec.ts` (746→752 lines), deleted unit (239 lines)
Folded in:
- `should use image type for skeleton loader` → added to `Loading State` (only unique assertion in the file; everything else was a duplicate check under a different title, e.g. empty-data / zero-value / title / height / export-event coverage all already present).

### TreemapChart.spec.ts — kept `tests/component/.../TreemapChart.spec.ts` (1058 lines, unchanged), deleted unit (302 lines)
Nothing folded in. All unit tests were either exact-duplicate prop-echo assertions (`expect(wrapper.props('enableZoom')).toBe(false)` etc., already covered by the component file's far larger `Props Validation`/`Zoom Interaction`/`Edge Cases` sections) or subsumed by name (`should handle data with custom colors` vs. kept `should handle data with custom item styles`; `should handle title changes` vs. kept `should handle title changes dynamically`). Two `it.skip` tests in the unit file (`should handle data prop changes`, `should handle empty data after having data`) were already disabled and contributed no coverage; dropped.

### ErrorBoundary.spec.ts — kept `tests/component/shared/ErrorBoundary.spec.ts` (487 lines, unchanged), deleted unit (118 lines)
Nothing folded in and nothing dropped for coverage reasons:
- `should render slot content when no error` — duplicate of kept `should render child components when no error occurs` (same `.error-boundary` absence + content-present checks).
- `should not show error UI initially` — duplicate of the same `.error-boundary` absence check already asserted in the above kept test.
- `should capture and display errors` — **dropped as effectively vacuous**: it mounts with an *empty* slot (no error is ever thrown) and asserts only `expect(wrapper.exists()).toBe(true)`, which is true of any successful mount and tests nothing about error capturing despite its title. The kept file's `should capture and display errors from child components` test is the real, non-vacuous version (it actually throws and asserts the fallback UI renders).

### DataSourceRunTable.spec.ts — kept `tests/component/generation/DataSourceRunTable.spec.ts` (159→~245 lines), deleted unit (87 lines)
The two files were near-disjoint (component file covered baseline rendering/run/cancel/history; unit file covered a completely separate `showPatientCount` / `extraActions` / `hideCancel` feature set with zero title overlap). All 5 unit tests were folded in verbatim as a new `DataSourceRunTable extensions` describe block, **using the deleted file's own fixtures** (`sourceName === sourceKey`, e.g. `CCAE`/`CCAE`) rather than the kept file's fixtures (`sourceName` always differs, e.g. `CCAE`/`Truven CCAE`) — see coverage section below for why that mattered.

### InclusionCriteriaPanel.spec.ts — kept `tests/unit/components/.../InclusionCriteriaPanel.spec.ts` (666 lines, unchanged), deleted component (70 lines)
Nothing folded in. All 4 component tests were exact-duplicate assertions of existing unit tests under different titles: `should expose addNewRule for the parent section header to call` = unit's `should expose addNewRule for the parent section header`; `should emit update when addNewRule is invoked` = unit's `should add new rule when button is clicked` (both call `vm.addNewRule()` directly and assert `update:modelValue` fires); `should display the empty-state container when no rules` = unit's `should show empty state message` (identical `.inclusion-criteria-panel__empty` check); `should display existing rules` = subsumed by unit's `should display rule names`.

### NestedCriteriaRenderer.spec.ts — kept `tests/unit/components/.../NestedCriteriaRenderer.spec.ts` (594 lines, unchanged), deleted component (62 lines)
Nothing folded in. `should render nested criteria` was vacuous (`expect(wrapper.exists()).toBe(true)`). `should track nesting depth` was an exact duplicate of unit's `should accept depth prop` (`depth: 3` → `props('depth')).toBe(3)`). `should warn if depth exceeds 10 levels` was subsumed by unit's `should show warning at depth > 10`.

### CriteriaEventCard.spec.ts — kept `tests/unit/components/.../CriteriaEventCard.spec.ts` (403→~478 lines), deleted component (113 lines)
The component file's whole `CriteriaEventCard — concept-set selection` describe block (4 tests exercising the `CriteriaSelectionKey`/`CriteriaSelectionService` provide/inject path and its legacy-emit fallback) had no unit-file equivalent at all. Folded in verbatim as a new describe block (renamed to `CriteriaEventCard, concept-set selection` to avoid an em dash — see Constraints below). All 4 tests pass unchanged.

## Step 3: coverage verification

Per the brief's guidance (v8 coverage resets across separate `vitest run --coverage` invocations because `coverage.clean: false` doesn't merge them), coverage was compared with one invocation before and one after, `rm -rf coverage` in between:

```
rm -rf coverage && npx vitest run tests/component tests/unit/components --coverage
jq '.total' coverage/coverage-summary.json
```

**Before** (re-verified twice, via `git stash`/`git stash pop` around the merge, for reproducibility):
```
lines:      63.02%  (40023 / 63506)
statements: 63.02%  (40023 / 63506)
functions:  52.40%  (1526 / 2912)
branches:   81.60%  (6521 / 7991)
```

**After** (first pass, before investigating the delta):
```
lines:      62.93%  (39969 / 63506)   -54 covered
functions:  52.35%  (1523 / 2909)     -3 covered, -3 total
branches:   81.56%  (6496 / 7964)     -25 covered, -27 total
```

This was a real, non-rounding drop, so per the brief ("find out what and restore it") I diffed per-file `coverage-summary.json` entries between the true before/after runs (captured via `git stash`) instead of assuming it was fine. Two distinct causes turned up:

**1. Genuine gap (fixed).** `src/components/generation/DataSourceRunTable.vue` template has `showKey: !!(s.sourceName && s.sourceName !== s.sourceKey)`. The deleted unit spec's fixtures always had `sourceName === sourceKey` (`CCAE`/`CCAE`), exercising the `showKey === false` branch; the kept component spec's fixtures always differ (`CCAE`/`Truven CCAE`), exercising only `showKey === true`. My first fold-in pass reused the kept file's fixtures for the newly-added tests, silently losing the `false` branch entirely (nothing in the merged file exercised it any more). Fixed by rewriting the `DataSourceRunTable extensions` block to use the deleted file's original fixtures (`EXT_SOURCES`/`EXT_EXECUTIONS`, `sourceName === sourceKey`) instead of the kept file's `SOURCES` constant. Re-verified: `DataSourceRunTable.vue` and `DataSourceRunRow.vue` now show zero diff (in fact `DataSourceRunRow.vue` branches improved slightly) versus the true before-state.

**2. Scope artifact, not a real regression (left as-is, documented here for the record).** The remaining delta is entirely `useInclusionStats.ts` (-48 covered lines, -3 functions), `useTrexSQLCache.ts` (-3 covered lines), and `InclusionRuleRail.vue` (-1 covered line, -4 covered branches), all traceable to one thing: the deleted `tests/component/cohort-builder/InclusionCriteriaPanel.spec.ts` mounted `InclusionCriteriaPanel` **without** mocking `useInclusionStats`/`useTrexSQLCache`, so it incidentally exercised those composables' real implementations as a side effect. The kept `tests/unit/components/.../InclusionCriteriaPanel.spec.ts` mocks both explicitly (`vi.mock('@/composables/useInclusionStats', …)`, `vi.mock('@/composables/useTrexSQLCache', …)`) — correct isolation for a component-level unit test. I verified this incidental coverage is not actually lost from the project: running only the composables' own dedicated spec files —
```
npx vitest run tests/unit/composables/useInclusionStats.spec.ts tests/unit/composables/useTrexSQLCache.spec.ts --coverage
```
— gives `useInclusionStats.ts` 97.84% lines / 100% functions and `useTrexSQLCache.ts` 98.78% lines / 100% functions, both far higher than what the deleted file incidentally provided (59.13% / 38.1%). Likewise `InclusionRuleRail.vue`'s coverage in the merged after-state (159/202 lines, 45/53 branches) is byte-for-byte identical to running its own dedicated `tests/unit/components/cohort-builder/InclusionRuleRail.spec.ts` alone — proving the 4 "lost" branches were never InclusionRuleRail's own test responsibility, just an incidental side effect of the deleted file's looser mocking. Restoring them would mean reintroducing that anti-pattern into the kept unit spec purely to pad a metric scoped to two directories, not a real coverage loss against the full suite (which is what the 92/92/86/78 thresholds actually gate).

**After** (final, post-fix):
```
lines:      62.94%  (39971 / 63506)
statements: 62.94%  (39971 / 63506)
functions:  52.35%  (1523 / 2909)
branches:   81.61%  (6502 / 7967)
```

Net residual vs. true before: -52 covered lines / -3 total+covered functions / -19 covered branches / -24 total branches, all attributable to the documented, non-regressive artifact above (sums verified to match exactly, file by file).

## Full test run

```
npx vitest run tests/component tests/unit/components
```
```
Test Files  265 passed (265)
     Tests  3150 passed | 27 skipped (3177)
```
27 skips are pre-existing (`it.skip` calls untouched by this task, e.g. in `CohortBuilder.spec.ts`), not introduced here. No stray warnings beyond pre-existing `[ConfigLoader] Configuration not loaded` / `[AuthConfig]` debug noise that was already present before this task.

## Files changed

Deleted:
- `tests/component/cohort-builder/CriteriaEventCard.spec.ts`
- `tests/component/cohort-builder/InclusionCriteriaPanel.spec.ts`
- `tests/component/cohort-builder/NestedCriteriaRenderer.spec.ts`
- `tests/component/concept-sets/ConceptTable.spec.ts`
- `tests/unit/components/generation/DataSourceRunTable.spec.ts`
- `tests/unit/components/reports/charts/BarChart.spec.ts`
- `tests/unit/components/reports/charts/PieChart.spec.ts`
- `tests/unit/components/reports/charts/TreemapChart.spec.ts`
- `tests/unit/components/shared/ErrorBoundary.spec.ts`

Modified (fold-ins):
- `tests/component/generation/DataSourceRunTable.spec.ts`
- `tests/component/reports/charts/BarChart.spec.ts`
- `tests/component/reports/charts/PieChart.spec.ts`
- `tests/unit/components/cohort-builder/CriteriaEventCard.spec.ts`
- `tests/unit/components/concepts/ConceptTable.spec.ts`

## Constraints checklist

- `vitest.config.ts` untouched — `git diff -- vitest.config.ts` empty, thresholds still 92/92/86/78.
- No em dashes in anything added — `git diff --cached | grep "^+.*—"` returns nothing. (Two em dashes existed in the *deleted* component file's comment and describe title; since that content is only in removed lines it doesn't apply, but the fold-in copied one describe title and one comment verbatim into the kept file initially — both were caught and rephrased: `CriteriaEventCard — concept-set selection` → `CriteriaEventCard, concept-set selection`; the "ordinary update emit — this is what makes…" comment → "…emit, which is what makes…".)
- `node scripts/find-conditional-assertions.mjs tests` → `3 conditional-assertion guards in 541 spec files`, all still in `tests/component/cohort/CohortBuilder.spec.ts` (lines 1488/1501/1514) — unchanged from baseline, not touched by this task. (Not wired into package.json/CI, per instructions.) A pre-existing `if (typeof vm.addNewRule === 'function') { … } else { expect(wrapper.exists()).toBe(true) }` guard already lived in the kept `InclusionCriteriaPanel.spec.ts` before this task and isn't flagged by the detector; it wasn't introduced or touched by any fold-in, so left as-is.
- `scripts/find-conditional-assertions.mjs` not wired into package.json/CI — confirmed untouched.
- `stryker` not run.
- No em-dash, no co-author/attribution trailers, nothing pushed.

## Self-review

- **Completeness**: all nine true duplicates merged and deleted; the tenth basename from the brief (`GroupCriteriaUI.spec.ts`) reconfirmed absent from `tests/component` (Task 4 already handled it) via `find`.
- **Honesty**: the first coverage pass showed a real drop; rather than accept it, I re-ran the true before-state via `git stash`/`git stash pop` (careful not to lose the merge work), diffed every per-file `coverage-summary.json` entry, found one genuine regression (`showKey` branch in `DataSourceRunTable.vue`) and fixed it, and one non-regression (composables covered better elsewhere) which I verified quantitatively rather than assumed.
- **Quality**: no vacuous test was folded in. One vacuous test was dropped (`ErrorBoundary`'s `should capture and display errors`, which never actually triggers an error). All other drops were genuine duplicates/subsumed assertions, each explicitly justified above by comparing test bodies, not just titles.
- **Testing**: `tests/component` + `tests/unit/components` run together, 265 files / 3150 tests passed, 0 failures, pristine (pre-existing debug logging only).
- **Constraints**: verified above, all satisfied.

Remaining risk/judgment call worth flagging to the requester: the `useInclusionStats.ts`/`useTrexSQLCache.ts`/`InclusionRuleRail.vue` coverage residual (Step 3, cause 2) is left unrestored by design, on the grounds that it's better covered elsewhere and that restoring it would require reintroducing weak test isolation into `InclusionCriteriaPanel.spec.ts`. If the reviewer disagrees with that judgment call, the fix would be to mock `useInclusionStats`/`useTrexSQLCache` less aggressively (or add one deliberately-unmocked integration test) in the kept file.
