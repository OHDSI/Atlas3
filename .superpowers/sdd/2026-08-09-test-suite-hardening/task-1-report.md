# Task 1 report: Add the mutation gate and record the baseline

## What was implemented

All steps from the brief except Step 6 (full baseline run, deliberately skipped per the
controller's instructions since it runs separately in the background):

1. Installed `@stryker-mutator/core@9.6.1` and `@stryker-mutator/vitest-runner@9.6.1` as
   pinned devDependencies.
2. Created `stryker.conf.json` with the exact config from the brief: perTest coverage
   analysis, html/clear-text/progress/json reporters, incremental mode, 60s timeout,
   concurrency 4, the mutate globs mirroring `vitest.config.ts`'s coverage exclusions
   (plus explicit inclusion of the general `src/**/*.ts` and `src/**/*.vue` globs, which
   covers `atlas-converter.ts` since it is not in the exclusion list), and
   `thresholds.break: null`.
3. Added three npm scripts (`test:mutation`, `test:mutation:changed`,
   `test:mutation:file`) to `package.json`, inserted after `test:e2e:report` as specified.
4. Verified Stryker runs on a known-good file (`src/utils/list-filters.ts`).
5. Verified Stryker mutates a `.vue` SFC (`PrevalenceTable.vue`).
6. Skipped (full baseline run, per deviation instructions).
7. Added `reports/` and `.stryker-tmp/` to `.gitignore`.
8. Created `.github/workflows/mutation-tests.yml` exactly as shown in the brief (with the
   amended advisory `pull_request` job using `|| true` and posting a score to the step
   summary; the nightly/`workflow_dispatch` job runs the full unthresholded suite).
9. Created `docs/testing-guide.md` with the exact content from the brief.
10. Verified no regressions: targeted Vitest run and `type-check` both pass.
11. Committed.

## What was verified and measured results

**Step 4** - `npm run test:mutation:file -- src/utils/list-filters.ts`
Completed in 1m29s (brief: "roughly 90 seconds").
Result: **90.24%** mutation score, 41 mutants (37 killed, 0 timeout, 3 survived, 1 no
coverage), 3 survivors. Matches the brief's expected 90.24% / ~41 mutants / 3 survivors
exactly.

**Step 5** - `npm run test:mutation:file -- src/components/characterization-results/PrevalenceTable.vue`
Completed in 49s (brief: "roughly 60 seconds").
Result: **14.44%** mutation score, 90 total generated mutants of which 74 are covered
(13 killed, 0 timeout, 61 survived, 16 no-coverage). The brief's "74 mutants" figure is
the *covered* mutant count (Stryker's "covered" percentage denominator: killed + timeout
+ survived = 13 + 0 + 61 = 74), and "61 survivors" matches exactly. Score matches the
brief's expected 14.44% exactly.

Because `incremental: true` is set, the second run's report table also displays the
first run's `list-filters.ts` numbers (reused from `reports/mutation/stryker-incremental.json`);
this is expected Stryker behavior for incremental mode, not a re-execution of that file.

**Step 10** - Regression check
`npx vitest run tests/unit/utils tests/unit/services/auth`: **PASS**, 40 test files,
837 passed / 1 skipped (838 total).
`npm run type-check`: **PASS**, no errors.

## Files changed

- `package.json` (modified): added two pinned devDependencies and three npm scripts.
- `package-lock.json` (modified): lockfile update for the new dependency tree.
- `stryker.conf.json` (created): Stryker configuration, verbatim from the brief.
- `.gitignore` (modified): appended `reports/` and `.stryker-tmp/`.
- `.github/workflows/mutation-tests.yml` (created): nightly full run plus advisory
  per-PR scoring, verbatim from the brief's amended Step 8.
- `docs/testing-guide.md` (created): verbatim from the brief's Step 9.

Commit: `d42e9c1` "test: add Stryker mutation-score gate alongside coverage"

## Self-review findings

- Coverage thresholds in `vitest.config.ts`: confirmed untouched (`git diff HEAD --
  vitest.config.ts` is empty).
- Em-dash check: grepped all new/modified files for the em-dash character. None found in
  any file this task wrote. `.gitignore` contains one pre-existing em-dash character on
  an unrelated line (line 33, the "Site-specific runtime configuration" comment), which
  predates this task and was not touched.
- `docs/testing-guide.md` is caught by the repo's broad `*md` `.gitignore` rule (same
  rule that would catch any new top-level or `docs/` markdown file). The brief's Step 11
  commit command lists this file for a plain `git add`, which fails against an ignored
  path. Other tracked docs (`docs/plugin-development-with-atlas-ui.md`,
  `docs/webmcp.md`) show this repo's established pattern of force-adding docs despite the
  blanket ignore rule, so I used `git add -f docs/testing-guide.md` for just that one
  file, consistent with existing practice. Flagging this as a minor discrepancy between
  the brief's literal commit command and the repo's actual gitignore state, not a
  deviation I invented.
- Workflow file diffed byte-for-byte against the brief's Step 8 block (after removing an
  extraneous blank line I initially added by habit, to match the brief exactly): clean.
- `stryker.conf.json` diffed byte-for-byte against the brief's Step 2 block: clean.
- No scope creep: only the four files named in the brief's "Files" section were
  created/modified, plus `package-lock.json` as an unavoidable side effect of `npm
  install`.
- Reports directory (`reports/mutation/`) generated by the two spot-check runs is
  present on disk but correctly ignored by git (`git check-ignore` confirms) and does not
  appear in `git status`.

## Issues or concerns

- None blocking. The one item worth a human's attention is the `git add -f` needed for
  `docs/testing-guide.md` noted above, in case the intent was instead to add a
  `!docs/testing-guide.md` (or similar) exception to `.gitignore`. I chose the
  lower-footprint fix (force-add, matching existing repo precedent) rather than editing
  the gitignore rule set, since the brief's Step 7 only specified adding the two
  mutation-report lines to `.gitignore` and nothing else.

---

## Fix report: review findings addressed

Commit: `5546040` "test: fix mutation gate pinning, advisory scoring and unparseable SFC"

### Finding 1: Stryker packages not exactly pinned

**Change.** Stripped the carets in `package.json`'s devDependencies:
`"@stryker-mutator/core": "^9.6.1"` -> `"9.6.1"`, same for
`@stryker-mutator/vitest-runner`. Ran `npm install` (no args) so `package-lock.json`'s
root `packages[""].devDependencies` entries update to match (previously they still said
`^9.6.1` even though the resolved/installed packages were already exactly `9.6.1`).

**Verified with:**

    grep -n '"@stryker-mutator/core"\|"@stryker-mutator/vitest-runner"' package-lock.json

Output: the root manifest entry (line 35-36) now reads `"9.6.1"` with no caret; the
resolved `node_modules/@stryker-mutator/core` entry (line 3515 area) already read
`"9.6.1"`.

    node -e "console.log(require('./node_modules/@stryker-mutator/core/package.json').version)"
    node -e "console.log(require('./node_modules/@stryker-mutator/vitest-runner/package.json').version)"

Output: `9.6.1` and `9.6.1`.

### Finding 2: advisory score formula did not match Stryker's own

**Change.** In `.github/workflows/mutation-tests.yml`, replaced the denominator
predicate `status!="Ignored" and status!="CompileError"` with an explicit allowlist of
the four statuses Stryker's own `calculateMetrics.js` sums for `totalValid`: `Killed`,
`Timeout`, `Survived`, `NoCoverage`.

**Verified with**, run against the `reports/mutation/mutation.json` already on disk from
the earlier combined `list-filters.ts` + `PrevalenceTable.vue` incremental run
(All-files score Stryker itself printed for that run was `38.17`):

    jq -r '[.files[].mutants[]] | (map(select(.status=="Killed" or .status=="Timeout")) | length) as $k | (map(select(.status=="Killed" or .status=="Timeout" or .status=="Survived" or .status=="NoCoverage")) | length) as $t | "killed+timeout=\($k) totalValid=\($t) score=\($k / $t * 100)"' reports/mutation/mutation.json

Output: `killed+timeout=50 totalValid=131 score=38.16793893129771`, which rounds to
`38.17`, matching Stryker's own clear-text-reporter output for that run exactly. The old
formula would have used a denominator of every non-Ignored/non-CompileError mutant,
silently including any `RuntimeError` mutants and understating the score whenever one
occurred (none occurred in this particular sample run, so the two formulas happened to
agree on this data, but the new one is now provably correct by construction, matching
Stryker's own metric definition rather than by coincidence).

### Finding 3: advisory step could turn the job red

**Change.** Added a guard line before the `jq` call in the "Post the advisory score"
step:

    [ -f reports/mutation/mutation.json ] || { echo "Mutation run did not complete; no report to score." >> $GITHUB_STEP_SUMMARY; exit 0; }

**Verified.** This is a CI-only workflow step; there is no local harness to execute a
GitHub Actions job in this environment. Verified by inspection: the guard uses the exact
snippet the coordinator specified, placed as the first line of the `run:` block, before
any reference to `mutation.json`. `set -e` is GitHub Actions' default for `run:` blocks
using `bash`, so a missing file now short-circuits the step with `exit 0` (success)
instead of failing on `jq: error: could not open reports/mutation/mutation.json`.

### Finding 4: whole-repo run aborts on an unparseable SFC

**Change 1 (the reported cause).** In
`src/components/analysis/AnalysisDataTable.vue`, moved the inline TypeScript generic
cast out of the template. Added a `userField(item: T, key: string): unknown` helper next
to the existing `dateField`/`strField` accessor helpers, and changed the template line
from:

    {{ formatUser((item as Record<string, unknown>).createdBy) }}

to:

    {{ formatUser(userField(item, 'createdBy')) }}

This follows the same accessor-helper pattern already used by `dateField` in the same
file. Rendered output is unchanged: `userField` returns the same raw value the inline
cast exposed, and `formatUser` is untouched.

**Change 2 (a second, previously-masked blocker found during verification).** Fixing
the parse error above let Stryker proceed past parsing into its dry run, which then hit
a second, unrelated failure:

    Error: [@vue/compiler-sfc] `defineProps()` in <script setup> cannot reference locally
    declared variables because it will be hoisted outside of the setup() function.

This is a known Stryker-JS/Vue interaction: Stryker's mutation-switch instrumentation
wraps every mutated literal (e.g. `loading: false`) in a call to its injected
`stryMutAct_9fa48(...)` function. When that happens inside the object literal passed to
`withDefaults(defineProps<Props>(), {...})`, Vue's `<script setup>` compiler rejects the
reference because `defineProps()`'s arguments are hoisted out of the setup scope. This
is unrelated to the closing-tag issue and was previously invisible because the parse
error aborted the run before Stryker ever got this far.

Fixed by adding Stryker ignore comments around just the `withDefaults(...)` block, with
a one-line WHY comment as permitted by the no-comments constraint:

    // Stryker disable all: mutating these defaults makes defineProps() reference Stryker's
    // injected switch functions, which Vue's <script setup> compiler rejects at compile time.
    const props = withDefaults(defineProps<Props>(), { ... })
    // Stryker restore all

**This is scoped to this one file only** and does not touch `stryker.conf.json`. I did
not audit or fix the other 58 files in `src` that use the same
`withDefaults(defineProps<Props>(), {...})` pattern (found via
`grep -rln "withDefaults(defineProps" src | wc -l` -> 58). Any of those files that reach
Stryker's dry run with a mutated literal default will likely hit the identical compiler
error. This was not in scope for Finding 4 (which named only the one file and the one
parse error), but the controller should know the nightly full-repo run may still abort
on a different file in this same class the first time it reaches one, until this pattern
is fixed or ignored repo-wide. Flagging rather than fixing broadly, since a repo-wide
fix is an architectural decision (fix every file vs. a global Stryker ignore rule vs.
some other convention) that is beyond a single-file bug fix.

**Verified with, in order:**

1.

       node .superpowers/sdd/2026-08-09-test-suite-hardening/vue-parse-probe.mjs

   Output: `checked 336 .vue files, 0 fail to parse`

2.

       npx stryker run --mutate 'src/components/analysis/AnalysisDataTable.vue' --concurrency 2

   Completed successfully in 2 minutes 51 seconds (previously aborted immediately with
   `ParseError`). Final table (incremental run also carries prior `PrevalenceTable.vue`
   and `list-filters.ts` numbers from earlier spot-checks):

       ---------------------------|------------------|----------|-----------|------------|----------|----------|
                                  | % Mutation score |          |           |            |          |          |
       File                       |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
       ---------------------------|--------|---------|----------|-----------|------------|----------|----------|
       All files                  |  28.99 |   34.09 |       60 |         0 |        116 |       31 |        0 |
        components                |  13.86 |   16.91 |       23 |         0 |        113 |       30 |        0 |
         analysis                 |  13.16 |   16.13 |       10 |         0 |         52 |       14 |        0 |
          AnalysisDataTable.vue   |  13.16 |   16.13 |       10 |         0 |         52 |       14 |        0 |
         characterization-results |  14.44 |   17.57 |       13 |         0 |         61 |       16 |        0 |
          PrevalenceTable.vue     |  14.44 |   17.57 |       13 |         0 |         61 |       16 |        0 |
        utils                     |  90.24 |   92.50 |       37 |         0 |          3 |        1 |        0 |
         list-filters.ts          |  90.24 |   92.50 |       37 |         0 |          3 |        1 |        0 |

   `AnalysisDataTable.vue`: 13.16% mutation score, 76 generated mutants (10 killed, 0
   timeout, 52 survived, 14 no-coverage, 0 errors), 62 covered mutants. No ParseError, no
   compile error.

3.

       npx vitest run tests/unit/views/IncidenceRatesView.spec.ts tests/unit/views/PathwaysView.spec.ts tests/component/characterization/CharacterizationsView.spec.ts tests/component/feature-analyses/FeatureAnalysesView.spec.ts

   There is no dedicated spec file for `AnalysisDataTable.vue` itself (confirmed with
   `find tests -iname "*AnalysisDataTable*"`, no results). It is exercised indirectly
   through the four views that mount it, all four of which supply `createdBy` fixture
   data (both string and `{ name, login }` object forms) that flows through the changed
   template line. Result: `4 passed (4 files), 64 passed (64 tests)`.

### Additional checks run after all four fixes

    npm run type-check

Output: passed, no errors (`vue-tsc -p tsconfig.app.json --noEmit`, no output).

    npx eslint src/components/analysis/AnalysisDataTable.vue --max-warnings 0

Output: passed, no output, no warnings.

Em-dash check on all files touched by this fix round (`package.json`,
`.github/workflows/mutation-tests.yml`, `src/components/analysis/AnalysisDataTable.vue`):
no em-dash character appears in any line added or changed by this fix round. One
em-dash character remains in `AnalysisDataTable.vue`, inside the placeholder string
literal returned by `truncate` and `formatUser`; that is pre-existing, untouched code.

`vitest.config.ts` was not touched in this fix round (confirmed with
`git diff HEAD -- vitest.config.ts` showing no output before this round began, and this
round made no edits to that file).

### Concern carried forward

The systemic Stryker/`withDefaults(defineProps())` incompatibility (58 files use this
pattern) is not fixed repo-wide. `AnalysisDataTable.vue` is fixed and verified; any other
file using the same pattern will hit the same `defineProps()` hoisting error the first
time Stryker mutates one of its literal prop defaults. This will surface as a new abort
in a future full nightly run unless addressed. Recommend a follow-up task to decide
between: fixing all 58 files' defaults blocks with the same ignore-comment pattern, a
global Stryker mutator-level exclusion, or restructuring props defaults away from
`withDefaults()`.

---

## Fix report round 2: compute the mutate scope at config load time

Commits: `24ebc69` "test: compute Stryker mutate scope at config load, drop dead-weight
directives" (this round's final state; an earlier intermediate state in this round was
folded into this single commit since nothing was pushed or shared in between).

### What changed

1. Replaced `stryker.conf.json` with `stryker.conf.mjs`. It computes `mutate` at load
   time instead of hardcoding globs or paths:
   - every `src/**/*.ts` minus `*.types.ts`, `types.ts`, `*.d.ts`, `src/types/**`,
     `src/models/**`, `src/locales/**`, `src/main.ts`, `src/plugins/vuetify.ts`
   - every `src/**/*.vue` minus `src/App.vue` and `**/*.story.vue`, minus any file whose
     source matches an unmutatable Vue compiler macro pattern (see below)
   - prints the included/excluded counts on every load
2. Removed the `// Stryker disable all` / `// Stryker restore all` comment pair from
   `src/components/analysis/AnalysisDataTable.vue`. That file matches the new filter
   (`withDefaults(defineProps`) and is excluded by the config now, so the comments were
   dead weight. Kept the `userField` helper and the template change from round 1: those
   are a genuine readability improvement independent of the mutation-gate work.
3. Added a short "Scope" section to `docs/testing-guide.md` with the real computed
   numbers.
4. Added `stryker.conf.mjs` to the existing `no-console` ESLint override (alongside
   `tests/**/*`, `scripts/**/*`, `plugins-dev/**/*`) so the required load-time print
   statement doesn't fail `--max-warnings 0`.

### Second unmutatable macro pattern found during verification

The brief named only `withDefaults(defineProps`. Before trusting the filter, I ran the
literal verification command against a file that does NOT use that pattern
(`src/components/ui/AtlasAvatar.vue`, via a throwaway scratch config isolating three
`.vue` candidates) and it hit the identical class of failure, but on `defineOptions()`:

    Error: [@vue/compiler-sfc] `defineOptions()` in <script setup> cannot reference
    locally declared variables because it will be hoisted outside of the setup() function.

Root cause is the same as `withDefaults(defineProps`: Stryker wraps a mutated literal in
a call to its injected switch function; `defineOptions({...})` is, like `defineProps()`,
compiled away and hoisted out of `setup()` by Vue, so it hits the same compiler
restriction. I scanned the 228 `.vue` files that survived the `withDefaults` filter for
`defineOptions(\s*\{`, `defineEmits(\s*\[`, and `defineModel` calls with a `default:`
option (the other macros Vue hoists out of setup and that could plausibly carry a
Stryker-mutatable literal):

    defineOptions({...}) count: 21
    defineEmits([...]) count: 0
    defineModel with default: count: 0

To confirm `defineEmits([...])` is genuinely safe and not just untested in this repo, I
built a throwaway single-file `.vue` probe using `defineEmits(['open', 'close'])` and
ran it through a minimal scratch Stryker config. It instrumented and compiled cleanly (4
mutants on the array's string literals, no compiler error); the run then failed for an
unrelated reason (no covering test for the throwaway file), which confirmed the macro
itself is not part of the unmutatable-macro problem. `defineModel` had zero instances
with a `default:` option in the current codebase, so I did not need to decide on it.

Given this, `UNMUTATABLE_MACRO` in the final config is
`/withDefaults\(defineProps|defineOptions\(\s*\{/`, catching both confirmed patterns.
79 `.vue` files are excluded in total (58 `withDefaults(defineProps` + 21
`defineOptions({...})`), all scratch probe files and configs were deleted, none were
committed.

### Verified with

    node -e "import('./stryker.conf.mjs').then(m => { const c = m.default; console.log(c.mutate.length) })"

Output:

    [stryker.conf] mutate target: 387 files included (180 .ts, 207/286 .vue); 79 .vue excluded for withDefaults(defineProps)/defineOptions({...})
    mutate.length = 387

### Finding: `--mutate` on the CLI fully replaces the config's computed list, not intersects with it

Per the coordinator's verification step 2, I ran:

    npx stryker run --mutate 'src/components/ui/AtlasRadio.vue' --concurrency 2

This still crashed with the same `defineProps()` hoisting error as before the fix.
I traced this to Stryker's own source rather than assume a bug in my config:
`@stryker-mutator/core/dist/src/config/config-reader.js` merges CLI options over the
config file's options via `deepMerge(options, cliOptions)`
(`@stryker-mutator/util/dist/src/deep-merge.js`), and for any array-typed key (`mutate`
is an array), `deepMerge` does `defaults[key] = overrideValue`, i.e. full replacement,
not a union or intersection. `stryker.js` also always passes
`targetMutatePatterns: undefined` to `PrepareExecutor.execute` for the `run` command, so
there is no separate CLI-vs-config intersection path either. I confirmed this is real
CLI behavior, not a fluke, by checking that `mutate` is a plain array key with no special
merge handling anywhere in the config/options pipeline.

Practical consequence: my config-level content filter protects every invocation that
does not pass an explicit `--mutate` (the default `npx stryker run` used by
`npm run test:mutation`, the nightly CI job, and Task 10's real threshold), which is the
thing this whole round exists to fix. It cannot protect an invocation that explicitly
names an excluded file on the command line; Stryker will always attempt exactly what you
tell it to mutate on `--mutate`, overriding any config-level exclusion by design. There
is no config-only way to change this: `ignorePatterns` would work but removes the file
from the sandbox entirely, breaking every test that imports it (`AtlasRadio.vue` is a
shared UI atom), which is strictly worse.

I verified the filter is correctly wired for the case that matters, without invoking the
literal `--mutate` override, using two checks:

1. Direct membership check against the config's own computed array:

       node -e "
       import('./stryker.conf.mjs').then(m => {
         const mutate = m.default.mutate
         console.log('AtlasRadio.vue excluded:', !mutate.includes('src/components/ui/AtlasRadio.vue'))
         console.log('AtlasAvatar.vue excluded:', !mutate.includes('src/components/ui/AtlasAvatar.vue'))
       })
       "

   Output: `AtlasRadio.vue excluded: true` and `AtlasAvatar.vue excluded: true`.

2. A throwaway scratch config (`stryker.verify.conf.mjs`, deleted after use, never
   committed) that reused the same filter over three candidate UI files (one
   `withDefaults` file, one `defineOptions` file, one clean file with a dedicated spec).
   Running it via `npx stryker run stryker.verify.conf.mjs` (no `--mutate` override, so
   the config's own filtered list drives the run) produced no compiler crash, confirming
   the exclusion holds for the actual default-run code path. This diagnostic run was
   secondary confirmation beyond what the coordinator asked for; the required
   verification command output (still crashing) is the one reported above, honestly, not
   substituted with this workaround.

I am flagging this discrepancy rather than declaring the literal verification step 2
command a pass: it will still crash if run exactly as specified, and that is expected,
correct Stryker CLI behavior, not a defect in this round's work.

### Dropped the undeclared `fast-glob` dependency

The coordinator's review caught that the first draft of `stryker.conf.mjs` imported
`fast-glob`, which was not in `package.json` and only resolved because something else
pulled it in transitively. Replaced it with Node's built-in `node:fs` `globSync`
(available and stable on Node 24, which this repo's CI and this machine both run).

`globSync`'s `exclude` option does not behave like `fast-glob`'s `ignore`: passing the
same exclusion predicates via the `exclude` option produced 287 `.vue` candidates
instead of the expected 286 (one file that should have been excluded was not), most
likely because `exclude` is evaluated during traversal against intermediate path
segments rather than only against final file matches. Rather than debug that
undocumented discrepancy, I used `globSync(pattern)` to collect the full candidate list
and then applied the same exclusion logic as a plain `.filter()`, which is unambiguous.
This is the same two-step shape (glob then filter) the `withDefaults`/`defineOptions`
content check already used, so it kept the file consistent internally. No `fast-glob`
dependency was added anywhere; `package.json` is untouched by this round.

**Verified with**, comparing the manual-filter approach against the `fast-glob` numbers
from before the swap:

    node -e "
    const { globSync } = require('node:fs');
    const all = globSync('src/**/*.vue');
    const excluded = all.filter(p => p === 'src/App.vue' || p.endsWith('.story.vue'));
    console.log('all:', all.length, 'excluded:', excluded.length, 'remaining:', all.length - excluded.length);
    "

Output: `all: 336 excluded: 50 remaining: 286` (matches `fast-glob`'s 286 exactly, unlike
the built-in `exclude` option's 287).

Then, after rewriting `stryker.conf.mjs` to use this approach:

    node -e "import('./stryker.conf.mjs').then(m => { const c = m.default; console.log('mutate.length =', c.mutate.length) })"

Output:

    [stryker.conf] mutate target: 387 files included (180 .ts, 207/286 .vue); 79 .vue excluded for withDefaults(defineProps)/defineOptions({...})
    mutate.length = 387

Identical to the `fast-glob` version's counts (387 total, 180 `.ts`, 207/286 `.vue`, 79
excluded). No silent scope change from the dependency swap.

### Regression check re-run after the `node:fs` swap

    npx stryker run --mutate 'src/utils/list-filters.ts' --concurrency 2

Completed in 1 minute 25 seconds. Result: **90.24%** mutation score, 41 mutants (37
killed, 0 timeout, 3 survived, 1 no coverage). Unchanged from every prior measurement of
this file in this task.

### Vitest specs covering `AnalysisDataTable.vue`, re-run after removing the directive comments

    npx vitest run tests/unit/views/IncidenceRatesView.spec.ts tests/unit/views/PathwaysView.spec.ts tests/component/characterization/CharacterizationsView.spec.ts tests/component/feature-analyses/FeatureAnalysesView.spec.ts

Output: `Test Files 4 passed (4)`, `Tests 64 passed (64)`.

### Type-check and lint

    npm run type-check

Output: passed, no errors.

    npm run lint

Initially failed: `stryker.conf.mjs` line 34's required `console.log` tripped
`no-console` under `--max-warnings 0`. Fixed by adding `stryker.conf.mjs` to the
existing `no-console` ESLint override block (the same one that already allows console in
`tests/**/*`, `scripts/**/*`, `plugins-dev/**/*`), rather than removing the log line the
coordinator explicitly required. Re-ran:

    npm run lint

Output: passed, no errors, no warnings.

### Scratch/temporary files

`stryker.verify.conf.mjs` and a throwaway `src/__stryker_probe__/Probe.vue` were created
during investigation and deleted before staging anything; neither was ever committed.
Confirmed with `git status --porcelain=v1` showing a clean tree apart from the intended
five files before the commit.

### Files changed this round

- `stryker.conf.json` deleted, `stryker.conf.mjs` added (config load precedence checks
  `stryker.conf.json` before `stryker.conf.mjs`, so the old file had to be removed, not
  just left alongside the new one, or it would silently keep winning).
- `src/components/analysis/AnalysisDataTable.vue`: removed the two `// Stryker` directive
  comments; `userField` helper and template change from round 1 kept unchanged.
- `docs/testing-guide.md`: added a "Scope" section with computed numbers (180 `.ts`, 207
  of 336 `.vue`, 79 excluded, both exclusion patterns explained).
- `.eslintrc.cjs`: added `stryker.conf.mjs` to the existing console-allowed override.

### Self-review

- Em-dash check on every file touched this round (`stryker.conf.mjs`,
  `docs/testing-guide.md`, `.eslintrc.cjs`, `AnalysisDataTable.vue`): no em-dash in any
  line added or changed. `.eslintrc.cjs` contains one pre-existing em-dash elsewhere in
  the file (confirmed via `git diff` that it is not on any added line).
- `vitest.config.ts` untouched this round.
- No push, no PR comment, no attribution trailer, all Stryker runs used
  `--concurrency 2`.
- Did not run the full `npx stryker run`; every run in this round targeted a single file
  or a three-file scratch subset.

---

## Fix report round 3: broaden the rule, verify with `--dryRunOnly`, guard the single-file path

Commit: `b7ed3ea` "test: broaden unmutatable-macro rule, verify with dry run, guard
single-file CLI"

### The regex fix

The old rule (`/withDefaults\(defineProps|defineOptions\(\s*\{/`) missed
`src/components/cohort-builder/EventConceptSetField.vue` because its `withDefaults` call
and `defineProps` are on separate lines:

    withDefaults(
      defineProps<{

Adopted the coordinator's broader rule as given, since it both tolerates whitespace and
covers the other Vue compiler macros that are hoisted out of `setup()` the same way
(`defineEmits`/`defineSlots` only when called with a runtime array or object argument,
since their type-only generic forms carry no literal to mutate):

    /withDefaults\s*\(|defineOptions\s*\(|defineModel\s*\(|defineProps\s*\(\s*[[{]|defineEmits\s*\(\s*[[{]|defineSlots\s*\(\s*[[{]/

Extracted this into a new shared module, `scripts/stryker-unmutatable-macro.mjs`,
exporting `UNMUTATABLE_MACRO` and a `findUnmutatableMacro(source)` helper, so
`stryker.conf.mjs` and the new single-file guard script both read the same rule instead
of each keeping their own copy. Updated `stryker.conf.mjs`'s WHY comment (now living in
the shared module, since that is where the rule itself is defined) to describe the
general hoisting problem rather than naming `withDefaults`/`defineOptions` specifically.

**Verified with:**

    node -e "import('./stryker.conf.mjs').then(m => { const c = m.default; console.log(c.mutate.length) })"

Output:

    [stryker.conf] mutate target: 374 files included (180 .ts, 194/286 .vue); 92 .vue excluded for using a compiler macro Stryker cannot instrument
    mutate.length = 374

Matches the coordinator's measured numbers exactly: 92 of 286 `.vue` candidates
excluded, 194 mutated, 374 total (180 `.ts` + 194 `.vue`).

Confirmed `EventConceptSetField.vue` (the file that broke the full run) is now excluded:

    node -e "
    import('./stryker.conf.mjs').then(m => {
      console.log('excluded from mutate:', !m.default.mutate.includes('src/components/cohort-builder/EventConceptSetField.vue'))
    })
    "

Output: `excluded from mutate: true`.

### `--dryRunOnly` verification, including a real defect it caught

First attempt:

    npx stryker run --dryRunOnly --concurrency 2

This failed, but not on a compiler error: `Initial test run timed out!` after 5 minutes
and 14 seconds. Stryker's `dryRunTimeoutMinutes` defaults to 5, and the dry run has to
execute the entire existing Vitest suite once, instrumented, across all 374 mutated
targets with `perTest` coverage analysis, which is materially heavier than any of the
single-file or three-file spot checks run in earlier rounds. I measured a baseline with
the plain, uninstrumented suite:

    npx vitest run --reporter=basic

Output: `Test Files 520 passed (520)`, `Tests 9110 passed | 37 skipped (9147)`,
`Duration 140.35s` (real time 2m21s). Instrumentation and per-test coverage tracking add
real overhead on top of that, so I added `dryRunTimeoutMinutes: 20` to
`stryker.conf.mjs` with a one-line WHY comment, then re-ran:

    npx stryker run --dryRunOnly --concurrency 2

Output (real time 6m26s):

    [stryker.conf] mutate target: 374 files included (180 .ts, 194/286 .vue); 92 .vue excluded for using a compiler macro Stryker cannot instrument
    INFO ProjectReader Found 374 of 1368 file(s) to be mutated.
    INFO Instrumenter Instrumented 374 source file(s) with 38174 mutant(s)
    INFO DryRunExecutor Starting initial test run (vitest test runner with "perTest" coverage analysis). This may take a while.
    INFO DryRunExecutor Initial test run succeeded. Ran 8636 tests in 6 minutes and 10 seconds (net 82048.60277399958 ms, overhead 288820.39722600044 ms).
    INFO MutationTestExecutor The dry-run has been completed successfully. No mutations have been executed.

Exit code 0. This is the command the coordinator required to exit clean before reporting
DONE, and it now does, having instrumented all 374 targets (38,174 mutants) and
completed the full dry run without any compiler error.

### Addition 1: `test:mutation:check` npm script and CI step

Added `"test:mutation:check": "stryker run --dryRunOnly"` to `package.json`.

In `.github/workflows/mutation-tests.yml`, added a step to the `pull_request`-gated
portion of the `mutation` job, before "Run mutation tests on changed files (advisory)":

    - name: Verify every target can be instrumented (fails if a new file breaks the gate)
      if: github.event_name == 'pull_request'
      run: npm run test:mutation:check

No `|| true`: unlike the advisory scoring step, this one is meant to fail the build, per
the coordinator's instruction, since a failure here means someone added a component the
gate cannot instrument at all, not merely a low-scoring one.

### Addition 2: `test:mutation:file` guard

Replaced the `test:mutation:file` script (previously `"stryker run --mutate"`, which
crashed with the raw Vue compiler error on any of the 92 excluded files) with
`"node scripts/stryker-mutate-file.mjs"`. The new script:

- reads the requested file and checks it against the shared `findUnmutatableMacro` rule
- if excluded: prints a one-line explanation naming the macro and pointing at
  `docs/testing-guide.md`, exits 0
- otherwise: delegates to `npx stryker run --mutate <file> [...extra args]`, forwarding
  any additional CLI arguments (so `npm run test:mutation:file -- <path> --concurrency 2`
  still works exactly as before)

**Verified with:**

    node scripts/stryker-mutate-file.mjs src/components/ui/AtlasRadio.vue

Output: `Skipping src/components/ui/AtlasRadio.vue: it calls withDefaults(...), a Vue
compiler macro whose arguments are hoisted out of setup() and cannot be instrumented by
Stryker. See the "Scope" section in docs/testing-guide.md.` Exit code 0.

    node scripts/stryker-mutate-file.mjs src/components/ui/AtlasAvatar.vue

Output: same shape, naming `defineOptions(...)`. Exit code 0.

    node scripts/stryker-mutate-file.mjs src/components/cohort-builder/EventConceptSetField.vue

Output: same shape, naming `withDefaults(...)` (confirming the multi-line fix reaches
the guard script too, since it shares the same regex). Exit code 0.

Regression check that the non-excluded path still works and still produces the
unchanged 90.24% score:

    npm run test:mutation:file -- src/utils/list-filters.ts --concurrency 2

Output: `All files 90.24 92.50 37 0 3 1 0`, `list-filters.ts 90.24 92.50 37 0 3 1 0`.
Completed in 1 minute 26 seconds. Unchanged from every prior measurement.

### `docs/testing-guide.md`

Updated the "Scope" section's numbers to the final computed values (180 `.ts`, 194 of
336 `.vue`, 92 excluded), rewrote the exclusion explanation to name the general class of
hoisted compiler macros rather than only `withDefaults`/`defineOptions`, noted that the
rule lives in `scripts/stryker-unmutatable-macro.mjs` and is shared by the config and
`test:mutation:file`, and added a paragraph telling developers to run
`npx stryker run --dryRunOnly` after adding a new component, noting that the PR workflow
now runs this automatically via `npm run test:mutation:check`.

### Type-check, lint

    npm run type-check

Output: passed, no errors.

    npm run lint

Output: passed, no errors, no warnings. (`scripts/**/*` already had `no-console` allowed
by the existing override from round 2, which covers both new script files without
further changes.)

### Self-review

- Em-dash check on every file touched this round (`stryker.conf.mjs`,
  `scripts/stryker-unmutatable-macro.mjs`, `scripts/stryker-mutate-file.mjs`,
  `docs/testing-guide.md`, `.github/workflows/mutation-tests.yml`, `package.json`): none
  found.
- `vitest.config.ts` untouched.
- No push, no PR comment, no attribution trailer. Every Stryker invocation this round
  used `--concurrency 2`, and the full `npx stryker run` (without `--dryRunOnly`) was
  never run.
- The `dryRunTimeoutMinutes: 20` addition was not explicitly requested but was necessary
  to make the coordinator's required verification command exit clean rather than time
  out; flagging it here rather than treating it as self-evidently in scope, since it is
  a new config value beyond what was asked for in this round's instructions.

---

## Fix report round 4: restore the dropped `.ts` exclusion, close the guide's arithmetic

Scope was limited to the two review findings. No other file was touched.

### Finding A: the config silently re-included `src/ui/chart-types.ts`

**Change.** One predicate added to the `.ts` filter in `stryker.conf.mjs`:

    file === 'src/plugins/vuetify.ts' ||
    file === 'src/ui/chart-types.ts'

That file is excluded in the brief's original `stryker.conf.json` and in
`vitest.config.ts`'s coverage `exclude` list ("Chart data interfaces only - no runtime
code"). The `.json` to `.mjs` rewrite in round 2 dropped it and no round noticed, because
every check compared aggregate counts rather than the file sets themselves.

**Verified with:**

    node -e "import('./stryker.conf.mjs').then(m => { const c = m.default; console.log(c.mutate.length); console.log(c.mutate.includes('src/ui/chart-types.ts')) })"

Output:

    [stryker.conf] mutate target: 373 files included (179 .ts, 194/286 .vue); 92 .vue excluded for using a compiler macro Stryker cannot instrument
    373
    false

Exactly one file fewer than the 374 round 3 reported, and the file is `chart-types.ts`.

### The file-for-file parity check nobody ran

Aggregate counts hid this regression, so the check is a set difference, not a count
comparison. A throwaway script (in the session scratchpad, never added to the repo)
enumerates what the brief's original `stryker.conf.json` globs would have matched, using
`minimatch` with the exact pattern strings from the brief, and diffs that set against the
`.ts` entries the computed config now produces:

    const INCLUDE = ['src/**/*.ts', 'src/**/*.vue']
    const EXCLUDE = [
      'src/**/*.types.ts', 'src/**/types.ts', 'src/**/*.d.ts',
      'src/types/**', 'src/models/**', 'src/locales/**',
      'src/main.ts', 'src/App.vue', 'src/plugins/vuetify.ts',
      'src/ui/chart-types.ts', 'src/components/ui/**/*.story.vue',
      'src/router/routes.manifest.json',
    ]
    const all = INCLUDE.flatMap((p) => globSync(p))
    const expected = all.filter((f) => !EXCLUDE.some((pat) => minimatch(f, pat)))
    // then set-diff expected's .ts entries against (await import('./stryker.conf.mjs')).default.mutate

Output:

    original-config .ts set: 179
    computed-config .ts set: 179
    in original but NOT in computed: []
    in computed but NOT in original: []
    file-for-file .ts parity: true
    original-config .vue set: 286 computed .vue set: 194
    in computed but NOT in original (.vue): []
    in original but NOT in computed (.vue) count: 92

**The `.ts` diff is empty in both directions.** `chart-types.ts` was the only
discrepancy, and it is now gone.

The `.vue` diff is empty in the computed-but-not-original direction (the computed config
never mutates anything the original would have excluded) and the 92 files in the other
direction are exactly the macro-excluded set, i.e. the whole `.vue` difference is the
deliberate macro filter and nothing else. Worth recording explicitly: the original config
excluded stories only under `src/components/ui/**/*.story.vue` while the computed config
excludes any `**/*.story.vue`, which would be a real scope difference if any story file
lived elsewhere. Checked: all 49 `.story.vue` files are under `src/components/ui/`, so
the two rules select the same set today.

### Finding B: the guide's Scope numbers did not add up

The old section said 194 of 336 `.vue` files are mutated and "the other 92" are excluded.
194 + 92 = 286, not 336. The 50 files dropped before the macro filter runs (`src/App.vue`
plus 49 `*.story.vue`) went unmentioned, so a reader was told 92 components are unmutated
when the true figure is 142.

**Change.** Rewrote the Scope section around two tables, one per file type, each naming
every excluded group with its count and its reason, and closed both sums. Every number
was recomputed from the filesystem and the loaded config, none copied from the review
message or from any prior round of this report. The section also now states plainly that
142 of 336 components carry no mutation score at all.

**Every number re-derived with:**

    node -e "
    const { globSync } = require('node:fs');
    const vue = globSync('src/**/*.vue');
    const story = vue.filter(f => f.endsWith('.story.vue'));
    console.log('total .vue:', vue.length);
    console.log('src/App.vue present:', vue.includes('src/App.vue'));
    console.log('.story.vue:', story.length, 'outside src/components/ui:', story.filter(f => !f.startsWith('src/components/ui/')).length);
    const ts = globSync('src/**/*.ts');
    console.log('total .ts:', ts.length);
    const groups = {
      'types decls (*.types.ts, types.ts, *.d.ts)': f => f.endsWith('.types.ts') || f.split('/').pop()==='types.ts' || f.endsWith('.d.ts'),
      'src/types/**': f => f.startsWith('src/types/'),
      'src/models/**': f => f.startsWith('src/models/'),
      'src/locales/**': f => f.startsWith('src/locales/'),
      'src/main.ts': f => f==='src/main.ts',
      'src/plugins/vuetify.ts': f => f==='src/plugins/vuetify.ts',
      'src/ui/chart-types.ts': f => f==='src/ui/chart-types.ts',
    };
    const seen = new Set();
    for (const [name, pred] of Object.entries(groups)) {
      const m = ts.filter(f => pred(f) && !seen.has(f));
      m.forEach(f => seen.add(f));
      console.log('  ', name, m.length);
    }
    console.log('total .ts excluded:', seen.size, 'remaining:', ts.length - seen.size);
    "

Output:

    total .vue: 336
    src/App.vue present: true
    .story.vue: 49 outside src/components/ui: 0
    total .ts: 216
       types decls (*.types.ts, types.ts, *.d.ts) 27
       src/types/** 5
       src/models/** 2
       src/locales/** 0
       src/main.ts 1
       src/plugins/vuetify.ts 1
       src/ui/chart-types.ts 1
    total .ts excluded: 37 remaining: 179

The group counts are first-match-wins so they are mutually exclusive and sum without
double counting; 22 of the 27 declaration files also sit under `src/types/`,
`src/models/` or `src/locales/`, which is why those directory rows are small. The
arithmetic now closes on both sides:

- `.ts`: 216 total, 37 excluded (27 + 5 + 2 + 0 + 1 + 1 + 1), 179 mutated.
- `.vue`: 336 total, 142 excluded (1 `App.vue` + 49 stories + 92 macro), 194 mutated.
- Config total: 179 + 194 = 373, matching `mutate.length`.

`src/locales/**` is listed with a count of 0 rather than dropped, because the original
config excludes it and a reader comparing the two lists would otherwise wonder where it
went. `src/locales` holds only JSON.

**The `.ts` side of the section was checked as well**, per the review's request. It was
previously a single parenthetical ("180 files") with no breakdown and, after Finding A,
a wrong number. It is now a full table whose groups match `vitest.config.ts`'s coverage
`exclude` list entry for entry, with `src/env.d.ts` covered by the `**/*.d.ts` row.

### Type-check, lint, smoke test

    npm run type-check

Output: passed, no errors.

    npm run lint

Output: passed, no errors, no warnings.

    npx vitest run tests/unit/utils

Output: `Test Files 30 passed (30)`, `Tests 622 passed (622)`, duration 3.76s.

### Self-review

- Per instruction, `npx stryker run` was not invoked in any form this round, including
  `--dryRunOnly`. This round removes one file from the mutate list and edits a markdown
  document; neither can introduce a new instrumentation failure.
- Em-dash check on both touched files: `grep -c` returns 0 for `docs/testing-guide.md`
  and `stryker.conf.mjs`.
- `vitest.config.ts` untouched; confirmed it is absent from `git status --porcelain`,
  which lists only `docs/testing-guide.md` and `stryker.conf.mjs`.
- No new comment was added to `stryker.conf.mjs`; the added line is one more entry in an
  existing list of self-evident path exclusions.
- No push, no PR or issue comment, no attribution trailer.
- The parity script lives in the session scratchpad only and was never written into the
  repository.
