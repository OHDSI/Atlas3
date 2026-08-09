# Testing guide

Two gates protect this suite. They measure different things and neither replaces the other.

**Coverage** (`npm run test:coverage`, thresholds in `vitest.config.ts`) proves a line was
reached. Mounting a component lights up most of its lines for free, so a high coverage
number says nothing about whether anything was checked.

**Mutation score** (`npm run test:mutation`) changes the source, re-runs the tests and
asks whether they noticed. A test that mounts a component and asserts it rendered will
not notice, so it scores zero regardless of the coverage it produces.

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

## Rules

1. **Assert on values, not on existence.** `expect(result).toBeDefined()` passes for
   `null`, `0`, `''` and a wrong answer. Assert what the value should be.

2. **Never make an assertion conditional.** This pattern is banned:

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
