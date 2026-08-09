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
is visible in every run's output rather than silent. Coverage today: all of `src`'s
TypeScript outside the same exclusions coverage uses (180 files), plus 207 of the 336
`.vue` single-file components in `src`.

The other 79 `.vue` files are excluded because Stryker cannot instrument them. Stryker
wraps every mutated literal in a call to its own injected switch function. When that
literal sits inside `withDefaults(defineProps(), {...})` or `defineOptions({...})`, the
injected call makes those macros reference a locally declared function, and Vue's
`<script setup>` compiler rejects that at compile time, because both macros are hoisted
out of `setup()`. That failure aborts the whole dry run, not just the one file, so any
file using either pattern is excluded from the mutate target entirely rather than left
in to bring the run down.

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
