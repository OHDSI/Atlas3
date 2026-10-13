#!/usr/bin/env node
/**
 * Keeps en.json the single source of English. Fails when
 *   - a t()/tv() key used in src/ has no entry in en.json (it would render
 *     its inline fallback and be untranslatable — i18n-sync only diffs
 *     locale files against en.json),
 *   - a call still carries an inline English fallback for a key en.json has
 *     (dead text that drifts from the real copy),
 *   - en.json breaks a naming/placeholder rule (see lintEnglish).
 *
 *   node scripts/i18n-check.mjs             report and exit non-zero on any problem
 *   node scripts/i18n-check.mjs --backfill  lift inline fallbacks of new keys into
 *                                           en.json, then strip them from src/
 *   node scripts/i18n-check.mjs --fix       strip redundant inline fallbacks from src/
 */
import { readFile, writeFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { setByPath } from './i18n-lib.mjs'
import {
  extractKeys,
  extractConfigKeys,
  findMissing,
  findParentCollision,
  findBatchCollision,
  findFallbackConflicts,
  lintEnglish,
  findRedundantFallbacks,
  stripFallbacks,
  unescapeLiteral,
} from './i18n-check.core.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const EN_PATH = join(ROOT, 'src', 'locales', 'en.json')
const CONFIG_DIR = join(ROOT, 'src', 'config')

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(p, out)
    else if (/\.(vue|ts)$/.test(entry.name)) out.push(p)
  }
  return out
}

/**
 * Inline fallbacks on keys en.json has. With `strip`, removes the ones that
 * repeat en.json; ones whose wording differs are always reported — give the
 * call site its own key, or update en.json — and never stripped.
 * @returns {{ redundant: number, divergent: number }} counts left in src/
 */
async function handleInlineFallbacks(en, strip) {
  let redundant = 0
  let divergent = 0
  let stripped = 0
  for (const file of sourceFiles(SRC)) {
    const source = await readFile(file, 'utf8')
    const found = findRedundantFallbacks(source, en)
    if (found.length === 0) continue
    const where = line => `${relative(ROOT, file)}:${line}`
    for (const f of found.filter(f => f.divergent)) {
      divergent++
      console.error(
        `[i18n-check] fallback differs from en.json: ${f.key}  (${where(f.line)})\n    inline:  ${JSON.stringify(f.fallback)}\n    en.json: ${JSON.stringify(f.english)}`
      )
    }
    const same = found.filter(f => !f.divergent)
    if (strip && same.length) {
      await writeFile(file, stripFallbacks(source, en), 'utf8')
      stripped += same.length
    } else {
      redundant += same.length
      for (const f of same) console.error(`[i18n-check] redundant inline fallback: ${f.key}  (${where(f.line)})`)
    }
  }
  if (stripped) console.log(`[i18n-check] stripped ${stripped} inline fallbacks`)
  if (redundant) console.error(`[i18n-check] ${redundant} inline fallbacks duplicate en.json — run: npm run i18n:check -- --fix`)
  if (divergent) {
    console.error(
      `[i18n-check] ${divergent} inline fallbacks differ from en.json — give the call site its own key or update en.json`
    )
  }
  return { redundant, divergent }
}

async function main() {
  const backfill = process.argv.includes('--backfill')
  const fix = process.argv.includes('--fix')
  const en = JSON.parse(await readFile(EN_PATH, 'utf8'))

  const usages = []
  for (const file of sourceFiles(SRC)) {
    const source = await readFile(file, 'utf8')
    for (const usage of extractKeys(source)) {
      usages.push({ ...usage, file: relative(ROOT, file) })
    }
  }
  for (const entry of readdirSync(CONFIG_DIR).filter(f => f.endsWith('.json'))) {
    const file = join(CONFIG_DIR, entry)
    for (const usage of extractConfigKeys(await readFile(file, 'utf8'))) {
      usages.push({ ...usage, file: relative(ROOT, file) })
    }
  }

  const lintErrors = lintEnglish(en)
  for (const error of lintErrors) console.error(`[i18n-check] en.json: ${error}`)
  if (lintErrors.length > 0) process.exit(1)

  const unresolved = await reportMissing(en, usages, backfill)
  const { redundant, divergent } = await handleInlineFallbacks(en, backfill || fix)
  if (unresolved > 0 || redundant > 0 || divergent > 0) process.exit(1)
  if (unresolved === 0) console.log(`[i18n-check] ok — ${usages.length} call sites, no missing keys`)
}

/** Missing-key check (and --backfill). Returns the number of unresolved keys. */
async function reportMissing(en, usages, backfill) {
  const missing = findMissing(en, usages)
  if (missing.length === 0) return 0

  // findMissing already dedupes to one entry per key — check every usage of
  // each missing key, not just the first one it kept.
  const missingKeys = new Set(missing.map(m => m.key))
  const fallbackConflicts = findFallbackConflicts(usages.filter(u => missingKeys.has(u.key)))
  for (const { key, fallbacks } of fallbackConflicts) {
    console.error(`[i18n-check] "${key}" has conflicting inline fallbacks:`)
    for (const { fallback, files } of fallbacks) {
      console.error(`    ${JSON.stringify(fallback)}  (${files.join(', ')})`)
    }
  }
  if (fallbackConflicts.length > 0) {
    console.error(
      `[i18n-check] refusing to continue: ${fallbackConflicts.length} key(s) have conflicting inline fallbacks — give each wording its own key`
    )
    process.exit(1)
  }

  const withFallback = missing.filter(m => m.fallback !== null)
  const withoutFallback = missing.filter(m => m.fallback === null)
  const batchKeys = withFallback.map(m => m.key)

  const collisions = missing
    .map(m => ({ ...m, parent: findParentCollision(en, m.key) }))
    .filter(m => m.parent !== null)

  const batchCollisions = withFallback
    .map(m => ({ ...m, parent: findBatchCollision(batchKeys, m.key) }))
    .filter(m => m.parent !== null)

  for (const { key, parent, file } of collisions) {
    console.error(`[i18n-check] "${key}" nests under the existing string "${parent}"  (${file})`)
  }

  for (const { key, parent, file } of batchCollisions) {
    console.error(
      `[i18n-check] "${key}" nests under "${parent}", which this same run is also about to add  (${file})`
    )
  }

  if (backfill) {
    if (collisions.length > 0 || batchCollisions.length > 0) {
      console.error('[i18n-check] refusing to backfill: would overwrite the strings above')
      process.exit(1)
    }
    for (const { key, fallback } of withFallback) {
      setByPath(en, key, unescapeLiteral(fallback))
    }
    await writeFile(EN_PATH, `${JSON.stringify(en, null, 2)}\n`, 'utf8')
    console.log(`[i18n-check] backfilled ${withFallback.length} keys into en.json`)
  }

  for (const { key, file } of withoutFallback) {
    console.error(`[i18n-check] missing, no fallback to backfill: ${key}  (${file})`)
  }

  if (!backfill) {
    for (const { key, file } of withFallback) {
      console.error(`[i18n-check] missing from en.json: ${key}  (${file})`)
    }
  }

  return backfill ? withoutFallback.length : missing.length
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
