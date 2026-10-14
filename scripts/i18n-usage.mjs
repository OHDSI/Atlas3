#!/usr/bin/env node
/**
 * Reports en.json keys nothing references, and duplicated English values.
 *
 *   node scripts/i18n-usage.mjs unused [--list]   keys no source file mentions
 *   node scripts/i18n-usage.mjs dups [--all]      referenced keys sharing English
 */
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { flattenStrings } from './i18n-lib.mjs'
import { collectReferences, findUnused, findDuplicates } from './i18n-usage.core.mjs'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SCAN_DIRS = ['src', 'tests'].map(d => join(ROOT, d))
const LOCALES_DIR = join(ROOT, 'src', 'locales')
const SOURCE_EXT = /\.(vue|ts|js|mjs|json)$/

const log = (...a) => console.log(...a) // eslint-disable-line no-console

export async function sourceFiles(dirs = SCAN_DIRS) {
  const out = []
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (p !== LOCALES_DIR && entry.name !== 'node_modules') await walk(p)
      } else if (SOURCE_EXT.test(entry.name)) {
        out.push(p)
      }
    }
  }
  for (const dir of dirs) await walk(dir)
  return out
}

export async function scanReferences(dirs = SCAN_DIRS) {
  const refs = new Set()
  for (const file of await sourceFiles(dirs)) collectReferences(await readFile(file, 'utf8'), refs)
  return refs
}

export async function readEn() {
  return JSON.parse(await readFile(join(LOCALES_DIR, 'en.json'), 'utf8'))
}

async function main() {
  const [cmd = 'unused', ...flags] = process.argv.slice(2)
  const en = await readEn()
  const refs = await scanReferences()

  if (cmd === 'unused') {
    const unused = findUnused([...flattenStrings(en).keys()], refs)
    if (flags.includes('--list')) {
      log(unused.join('\n'))
      return
    }
    const byNamespace = {}
    for (const key of unused) {
      const ns = key.split('.')[0]
      byNamespace[ns] = (byNamespace[ns] || 0) + 1
    }
    log(`[i18n-usage] ${unused.length} unused keys`)
    for (const [ns, n] of Object.entries(byNamespace).sort((a, b) => b[1] - a[1])) {
      log(`  ${ns}: ${n}`)
    }
  } else if (cmd === 'dups') {
    const groups = findDuplicates(en, flags.includes('--all') ? undefined : refs)
    for (const { value, keys } of groups) log(`${JSON.stringify(value)}\n  ${keys.join('\n  ')}`)
    log(`[i18n-usage] ${groups.length} duplicated values`)
  } else {
    console.error(`unknown command "${cmd}" (expected unused | dups)`)
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
