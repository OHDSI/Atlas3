import { globSync, readFileSync } from 'node:fs'
import { UNMUTATABLE_MACRO } from './scripts/stryker-unmutatable-macro.mjs'

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
  `${vueExcluded.length} .vue excluded for using a compiler macro Stryker cannot instrument`
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
  // The instrumented dry run covers the whole existing suite across 374 mutated
  // targets; the 5-minute default is too short for that, so it's raised here.
  dryRunTimeoutMinutes: 20,
  concurrency: 4,
  mutate,
  thresholds: { high: 80, low: 60, break: null },
}
