#!/usr/bin/env node
/**
 * Bulk key refactors that keep en.json, every translated locale, the
 * translation manifest and the source code in step.
 *
 *   node scripts/i18n-refactor.mjs prune               delete keys nothing references
 *   node scripts/i18n-refactor.mjs rename <map.json>   apply { oldKey: newKey } renames/merges
 *   node scripts/i18n-refactor.mjs placeholders        <%= x %> → {x} in every locale
 *
 * Add --dry-run to print what would change without writing.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { flattenStrings, setByPath, SOURCE_LOCALE } from './i18n-lib.mjs'
import { findUnused } from './i18n-usage.core.mjs'
import { ROOT, sourceFiles, scanReferences } from './i18n-usage.mjs'
import {
  planRenames,
  applyPlan,
  pruneKeys,
  rewriteSource,
  convertLegacyPlaceholders,
} from './i18n-refactor.core.mjs'

const LOCALES_DIR = join(ROOT, 'src', 'locales')
const MANIFEST_PATH = join(LOCALES_DIR, '.i18n-manifest.json')

const log = (...a) => console.log(...a) // eslint-disable-line no-console
const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

const sortKeys = obj => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : 1)))

async function loadAll() {
  const codes = (await readdir(LOCALES_DIR))
    .filter(f => f.endsWith('.json') && !f.startsWith('.'))
    .map(f => f.replace(/\.json$/, ''))
  const locales = {}
  for (const code of codes) locales[code] = await readJson(join(LOCALES_DIR, `${code}.json`))
  return { locales, manifest: await readJson(MANIFEST_PATH) }
}

async function saveAll({ locales, manifest }) {
  for (const [code, locale] of Object.entries(locales)) {
    await writeJson(join(LOCALES_DIR, `${code}.json`), locale)
  }
  for (const code of Object.keys(manifest)) manifest[code] = sortKeys(manifest[code])
  await writeJson(MANIFEST_PATH, manifest)
}

async function cmdPrune(dryRun) {
  const all = await loadAll()
  const unused = findUnused([...flattenStrings(all.locales[SOURCE_LOCALE]).keys()], await scanReferences())
  log(`[i18n-refactor] pruning ${unused.length} unused keys from ${Object.keys(all.locales).join(', ')}`)
  if (dryRun) return
  for (const [code, locale] of Object.entries(all.locales)) pruneKeys(locale, all.manifest[code], unused)
  await saveAll(all)
}

async function cmdRename(mapPath, dryRun) {
  if (!mapPath) throw new Error('usage: i18n-refactor.mjs rename <map.json>')
  const map = await readJson(mapPath)
  const all = await loadAll()
  const plan = planRenames(all.locales[SOURCE_LOCALE], map)
  for (const error of plan.errors) console.error(`[i18n-refactor] ${error}`)
  if (plan.errors.length) process.exit(1)
  log(`[i18n-refactor] ${plan.renames.length} renames, ${plan.merges.length} merges`)
  if (dryRun) return

  for (const [code, locale] of Object.entries(all.locales)) applyPlan(locale, all.manifest[code], plan)
  await saveAll(all)

  let touched = 0
  for (const file of await sourceFiles()) {
    const source = await readFile(file, 'utf8')
    const next = rewriteSource(source, map)
    if (next !== source) {
      await writeFile(file, next, 'utf8')
      touched++
    }
  }
  log(`[i18n-refactor] rewrote keys in ${touched} source files`)
}

async function cmdPlaceholders(dryRun) {
  const all = await loadAll()
  let changed = 0
  for (const locale of Object.values(all.locales)) {
    for (const [path, value] of flattenStrings(locale)) {
      const next = convertLegacyPlaceholders(value)
      if (next !== value) {
        changed++
        if (!dryRun) setByPath(locale, path, next)
      }
    }
  }
  log(`[i18n-refactor] converted placeholders in ${changed} strings`)
  if (!dryRun) await saveAll(all)
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  const dryRun = rest.includes('--dry-run')
  const args = rest.filter(a => a !== '--dry-run')
  if (cmd === 'prune') await cmdPrune(dryRun)
  else if (cmd === 'rename') await cmdRename(args[0], dryRun)
  else if (cmd === 'placeholders') await cmdPlaceholders(dryRun)
  else {
    console.error('usage: i18n-refactor.mjs prune | rename <map.json> | placeholders [--dry-run]')
    process.exit(1)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
