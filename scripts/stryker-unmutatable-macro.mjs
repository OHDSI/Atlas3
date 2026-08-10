// Vue's <script setup> compiler hoists these compiler macros' arguments out of setup(),
// so Stryker's injected switch-function call around a mutated literal inside one of them
// gets rejected at compile time, which aborts the whole dry run rather than just that
// file. Shared by stryker.conf.mjs (the mutate-scope filter) and
// scripts/stryker-mutate-file.mjs (the single-file CLI guard) so the rule cannot drift
// between the two.
export const UNMUTATABLE_MACRO =
  /withDefaults\s*\(|defineOptions\s*\(|defineModel\s*\(|defineProps\s*\(\s*[[{]|defineEmits\s*\(\s*[[{]|defineSlots\s*\(\s*[[{]/

export function findUnmutatableMacro(source) {
  const match = source.match(UNMUTATABLE_MACRO)
  return match ? match[0].replace(/[\s([{]+$/, '') : null
}
