import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { findUnmutatableMacro } from './stryker-unmutatable-macro.mjs'

const [file, ...extraArgs] = process.argv.slice(2)

if (!file) {
  console.error('Usage: npm run test:mutation:file -- <path> [stryker args...]')
  process.exit(1)
}

const source = readFileSync(file, 'utf-8')
const macro = findUnmutatableMacro(source)

if (macro) {
  console.log(
    `Skipping ${file}: it calls ${macro}(...), a Vue compiler macro whose arguments ` +
    'are hoisted out of setup() and cannot be instrumented by Stryker. See the ' +
    '"Scope" section in docs/testing-guide.md.'
  )
  process.exit(0)
}

const result = spawnSync('npx', ['stryker', 'run', '--mutate', file, ...extraArgs], {
  stdio: 'inherit',
})
process.exit(result.status ?? 1)
