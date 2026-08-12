# Testing guide

Three gates protect this suite. They measure different things and none of them replaces
another.

**Coverage** (`npm run test:coverage`, thresholds in `vitest.config.ts`) proves a line was
reached. Mounting a component lights up most of its lines for free, so a high coverage
number says nothing about whether anything was checked.

**Mutation score** (`npm run test:mutation`) changes the source, re-runs the tests and
asks whether they noticed. A test that mounts a component and asserts it rendered will
not notice, so it scores zero regardless of the coverage it produces.

**Conditional assertions** (`npm run test:no-conditional-assertions`) is a static scan, not
a test run. It refuses assertions that can silently disappear at runtime. It is the only
one of the three that blocks every pull request; see
[The conditional-assertion gate](#the-conditional-assertion-gate) below.

Worked example from this repository, measured on commit 5884245:
`PrevalenceTable.vue` had 88.5% line coverage and a 14.44% mutation score. Sixty-one
of its seventy-four mutants survived, including inverting every `typeof value !== 'number'`
guard in its three formatters.

## Scope

The mutation gate does not cover the whole repository. `stryker.conf.mjs` computes its
`mutate` list at load time and prints the counts every time it loads, so scope reduction
is visible in every run's output rather than silent. The gate mutates **373** files:
179 of the 216 `.ts` files in `src`, and 194 of the 336 `.vue` single-file components in
`src`.

The 37 excluded `.ts` files are the same set coverage excludes in `vitest.config.ts`,
because neither gate can say anything useful about a file with no runtime behavior:

| Excluded `.ts` | Count | Reason |
| --- | ---: | --- |
| `**/*.types.ts`, `**/types.ts`, `**/*.d.ts` | 27 | Type declarations only, no runtime code |
| `src/types/**` (beyond the declarations above) | 5 | Shared type definitions |
| `src/models/**` | 2 | Data-shape definitions |
| `src/locales/**` | 0 | Translations are JSON, no `.ts` files to mutate |
| `src/main.ts` | 1 | App bootstrap, covered by end-to-end tests |
| `src/plugins/vuetify.ts` | 1 | Configuration only |
| `src/ui/chart-types.ts` | 1 | Chart data interfaces only, no runtime code |

The 142 excluded `.vue` files fall into three groups:

| Excluded `.vue` | Count | Reason |
| --- | ---: | --- |
| `src/App.vue` | 1 | Root component, covered by integration and end-to-end tests |
| `**/*.story.vue` | 49 | Histoire stories, dev-time visual docs rather than runtime code |
| Files using an uninstrumentable compiler macro | 92 | See below |

The first two groups are excluded from coverage as well. The third is a Stryker
limitation, not a judgement about the components. Stryker wraps every mutated literal in
a call to its own injected switch function. Several Vue compiler macros in
`<script setup>` (`withDefaults`, `defineProps` and `defineEmits` called with a runtime
object or array argument, `defineOptions`, `defineModel`, `defineSlots`) are hoisted out
of `setup()`, so if a mutated literal lands inside one of their arguments, the injected
call makes the macro reference a locally declared function, and Vue's compiler rejects
that at compile time. That failure aborts the whole dry run, not just the one file, so
any file using one of these forms is excluded from the mutate target entirely rather
than left in to bring the run down. The rule lives in
`scripts/stryker-unmutatable-macro.mjs` and is shared by `stryker.conf.mjs` and
`npm run test:mutation:file`, so it cannot drift between the two.

So 142 of the 336 components carry no mutation score at all, and 92 of those would
otherwise be in scope. Their tests are unmeasured by this gate, and a mutation score
reported for ATLAS v3.0 as a whole says nothing about them.

After adding a new component, run `npx stryker run --dryRunOnly` to check the config
still instruments every target without doing a full mutation run. It validates the
whole `mutate` set in one pass and is what the pull request workflow runs automatically
via `npm run test:mutation:check`.

## The conditional-assertion gate

`scripts/find-conditional-assertions.mjs` scans every `*.spec.ts` / `*.test.ts` under
`tests/` and exits non-zero on a hit. `.github/workflows/unit-tests.yml` runs it as
"Fail on silently-vanishing test assertions", **before** the coverage run, so a pull
request that trips it goes red without any test executing.

Run it locally with:

    npm run test:no-conditional-assertions

### What it catches

1. **Unconditional-assertion guards.** An `if` whose body contains `expect(` and which has
   no `else` branch. All of these forms are caught, including the ones Prettier produces
   on its own at `printWidth: 100`:

       if (attr) expect(attr.value).toBe(30)
       if (attr) { expect(attr.value).toBe(30) }
       if (attr)
         expect(attr.value).toBe(30)
       if (attr) {
         expect(attr.value).toBe(30)
       }
       if (
         attr && attr.value
       ) {
         expect(attr.value).toBe(30)
       }

2. **Tautological assertions.** An `expect()` whose argument cannot be false: the literal
   `true`, anything OR'd with the literal `true`, and `x || !x` in either order.

### What it deliberately does not catch

The rule is conservative, because a gate that produces false reds gets disabled. It will
not flag broader always-true expressions such as `expect(a || b >= 0)`, nor a tautology
assembled across several lines, nor an assertion hidden behind a helper function or a
ternary. It only reads single-line, two-operand `||` splits and literal `true` / `!` forms.
A clean run means no assertion matches those shapes. It does not mean every assertion in
the suite can fail.

Guards where the `if` body is a `return`, `continue`, `break` or `throw` are not flagged:
those are control flow, not vanishing assertions.

### How to fix a hit

For a guard, remove the condition and assert the value directly. If you genuinely cannot,
because the narrowing is needed for TypeScript or the shape is legitimately one of two
things, give the `if` an `else` that fails loudly with a diagnostic:

    if (attr) {
      expect(attr.value).toBe(30)
    } else {
      expect.fail(`expected an attr, got ${JSON.stringify(list)}`)
    }

The gate treats an `if` with an `else` as satisfied, because with an `else` the assertion
cannot vanish. Do not add an empty `else` to silence it; that is the same defect with more
lines.

For a tautology, assert the value the expression was supposed to be checking.

## Rules

1. **Assert on values, not on existence.** `expect(result).toBeDefined()` passes for
   `null`, `0`, `''` and a wrong answer. Assert what the value should be. It is fine as a
   narrowing step, which is how this suite uses it at roughly sixty sites, but only when
   the very next lines assert a value:
   `expect(row).toBeDefined(); expect(row!.name).toBe('Diabetes')`. On its own it is not a
   test.

2. **Never make an assertion conditional.** This pattern is banned, and
   `npm run test:no-conditional-assertions` fails the build on it:

       const attr = find(...)
       if (attr) {
         expect(attr.value).toBe(30)
       }

   If `find` returns nothing the assertions vanish and the test passes green. Write the
   unconditional form: `expect(attr).toEqual({ value: 30, ... })`.

3. **Never reach into private internals.** `wrapper.vm.$.setupState` couples the test to
   variable names instead of behavior. Drive the component through its props, its events
   and the DOM. If a handler cannot be reached that way, that is a signal the component
   needs the behavior exposed, not that the test needs a back door.

4. **A test name is a claim.** If the name says "flips the flag", assert the flag flipped.
   A name that promises more than the body checks is worse than no test, because it makes
   the gap invisible.

5. **Prove a new test has teeth.** Before you commit it, run
   `npm run test:mutation:file -- <the source file>` and confirm the score moved. If the
   score is unchanged, the test does not test anything.

6. **Counting is not comparing.** Asserting `result.length === 3` leaves every field inside
   those three items unchecked. Compare the content.

## Baseline

Per-file worked examples, measured on commit 5884245:

| File | Line coverage | Mutation score |
|---|---|---|
| `src/utils/list-filters.ts` | n/a | 90.24% |
| `src/components/characterization-results/PrevalenceTable.vue` | 88.5% | 14.44% |

A whole-repository run was attempted locally to establish the gate's break threshold and
did not finish: at concurrency 2 it reached 36,667 of the 38,915 mutants in 8h21m, RAM-bound
at around 4GB free, before its parent process exited. That partial run scored **70.4%**
(25,788 killed, 10,853 survived, 26 timed out, out of 36,667 tested), a **94.2% sample**,
not a completed measurement. Because 2,248 mutants were never tested, the true full-repo
score is bounded between **66.3%** (if every untested mutant would have survived) and
**72.1%** (if every one would have been killed). No `mutation.json` survives from that run,
so there is no per-file breakdown to go with the 70.4% figure. Do not repeat that number as
"the" mutation score; it is a sample, not a total.

### Why the nightly run is sharded

At concurrency 4 on a `ubuntu-latest` runner (4 vCPU, 16GB RAM), a full run lands near 4.5
hours, and this repository's CI runners are killed at roughly 4 hours (GitHub's own job
ceiling is 6). One job cannot run the whole suite. `.github/workflows/mutation-tests.yml`
instead runs a nightly **6-way matrix**, `mutation-shard`: each shard sets
`STRYKER_SHARD=<i>/6`, which `stryker.conf.mjs` uses to stripe the 373-file `mutate` list
by index (`idx % 6 === i - 1`) rather than slicing it contiguously, so file-size variance
doesn't leave one shard with all the large files. Each shard runs the full `npx stryker run`
at `--concurrency 4` and uploads its `reports/mutation/mutation.json` as
`mutation-report-shard-<i>`.

No shard applies a break threshold: `stryker.conf.mjs` sets `thresholds.break` to `null`
for every run, sharded or not. A single shard skewed toward low-scoring Vue templates would
otherwise fail on its own, which is a false red, not a real signal, since the repo-wide
score is what matters. Enforcement instead lives entirely in the `aggregate` job, which runs
after all six shards, downloads their artifacts, sums killed/timeout/survived/noCoverage
counts across all of them, and computes one score using Stryker's own definition:
`totalValid = killed + timeout + survived + noCoverage`, `score = (killed + timeout) /
totalValid`. That job fails outright, before it even computes a score, if fewer than six
shard artifacts are present: a missing shard means part of the codebase went unmeasured, and
silently treating that as a pass would be the exact failure this gate exists to prevent.

### Threshold

The `aggregate` job fails the workflow if the overall score is below **65**. This number is
deliberately provisional: it sits 1.3 points below the proven lower bound of 66.3%, so the
gate cannot produce a false red on its first complete nightly run no matter where the true
score lands within the bounded range. Once a nightly run completes with all six shards
reporting, replace 65 with that run's actual score minus two points of headroom, using the
same rationale as any other mutation-score threshold in this repository: scores vary slightly
run to run from timeouts on a loaded runner, and a gate that flakes gets disabled.
