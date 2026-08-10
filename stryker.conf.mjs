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
  file === 'src/plugins/vuetify.ts' ||
  file === 'src/ui/chart-types.ts'
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

const fullMutate = [...tsFiles, ...vueFiles]

// File sizes vary wildly, so a contiguous slice would put all the huge files in one
// shard. Striping by index across the full list balances shard runtime instead.
const shardSpec = process.env.STRYKER_SHARD
let mutate = fullMutate
let shardLabel = 'full set'
if (shardSpec) {
  // A silently-empty mutate array (from a typo'd or malformed shard spec) is the exact
  // scope-reduction failure this sharding exists to avoid, so any unparseable or
  // out-of-range value throws instead of quietly mutating nothing.
  const match = /^(\d+)\/(\d+)$/.exec(shardSpec.trim())
  if (!match) {
    throw new Error(
      `[stryker.conf] STRYKER_SHARD must be in the form "i/N" (1-based i, e.g. "2/6"), got: ${JSON.stringify(shardSpec)}`
    )
  }
  const shardIndex = Number(match[1])
  const shardCount = Number(match[2])
  if (shardCount < 1) {
    throw new Error(
      `[stryker.conf] STRYKER_SHARD's N must be at least 1, got: ${JSON.stringify(shardSpec)}`
    )
  }
  if (shardIndex < 1 || shardIndex > shardCount) {
    throw new Error(
      `[stryker.conf] STRYKER_SHARD's i must be between 1 and N in the form "i/N" ` +
      `(e.g. "2/6"), got i=${shardIndex}, N=${shardCount}`
    )
  }
  mutate = fullMutate.filter((_, idx) => idx % shardCount === shardIndex - 1)
  shardLabel = `shard ${shardIndex}/${shardCount}`
}

console.log(
  `[stryker.conf] mutate target: ${mutate.length} files included (${shardLabel} of ` +
  `${fullMutate.length} total: ${tsFiles.length} .ts, ${vueFiles.length}/${vueCandidates.length} .vue); ` +
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
  // The instrumented dry run covers the whole existing suite across 373 mutated
  // targets; the 5-minute default is too short for that, so it's raised here.
  dryRunTimeoutMinutes: 20,
  concurrency: 4,
  mutate,
  thresholds: { high: 80, low: 60, break: null },
}
