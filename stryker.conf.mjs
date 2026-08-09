import { globSync, readFileSync } from 'node:fs'

const tsFiles = globSync('src/**/*.ts').filter((file) => !(
  file.endsWith('.types.ts') ||
  file.split('/').pop() === 'types.ts' ||
  file.endsWith('.d.ts') ||
  file.startsWith('src/types/') ||
  file.startsWith('src/models/') ||
  file.startsWith('src/locales/') ||
  file === 'src/main.ts' ||
  file === 'src/plugins/vuetify.ts'
))

const vueCandidates = globSync('src/**/*.vue').filter((file) => !(
  file === 'src/App.vue' ||
  file.endsWith('.story.vue')
))

// Stryker wraps every mutated literal in a call to its injected switch function; inside
// withDefaults(defineProps(), {...}) or defineOptions({...}) that reference makes Vue's
// <script setup> compiler reject the file (both macros are hoisted out of setup()),
// which aborts the whole dry run rather than just that file's mutants, so these files
// cannot be mutation targets at all.
const UNMUTATABLE_MACRO = /withDefaults\(defineProps|defineOptions\(\s*\{/
const vueExcluded = []
const vueFiles = vueCandidates.filter((file) => {
  const isUnmutatable = UNMUTATABLE_MACRO.test(readFileSync(file, 'utf-8'))
  if (isUnmutatable) vueExcluded.push(file)
  return !isUnmutatable
})

const mutate = [...tsFiles, ...vueFiles]

console.log(
  `[stryker.conf] mutate target: ${mutate.length} files included ` +
  `(${tsFiles.length} .ts, ${vueFiles.length}/${vueCandidates.length} .vue); ` +
  `${vueExcluded.length} .vue excluded for withDefaults(defineProps)/defineOptions({...})`
)

export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.ts' },
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  incremental: true,
  incrementalFile: 'reports/mutation/stryker-incremental.json',
  timeoutMS: 60000,
  concurrency: 4,
  mutate,
  thresholds: { high: 80, low: 60, break: null },
}
