#!/usr/bin/env node
/**
 * Fails when a t()/tv() key used in src/ has no entry in en.json. Such keys
 * silently render their inline English fallback and are untranslatable,
 * because i18n-sync only ever diffs locale files against en.json.
 *
 *   node scripts/i18n-check.mjs             report and exit non-zero on a gap
 *   node scripts/i18n-check.mjs --backfill  lift inline fallbacks into en.json
 */
import { readFile, writeFile } from 'node:fs/promises'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { getByPath, setByPath } from './i18n-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const EN_PATH = join(ROOT, 'src', 'locales', 'en.json')

const KEY_RE = /\b(?:t|tv)\(\s*'([A-Za-z0-9_.-]+)'(?:\s*,\s*'((?:[^'\\]|\\.)*)')?/g

export function extractKeys(source) {
  const out = []
  KEY_RE.lastIndex = 0
  let match
  while ((match = KEY_RE.exec(source))) {
    const [, key, fallback] = match
    if (!key.includes('.')) continue
    out.push({ key, fallback: fallback === undefined ? null : fallback })
  }
  return out
}

export function findMissing(en, usages) {
  const seen = new Set()
  const missing = []
  for (const usage of usages) {
    if (seen.has(usage.key)) continue
    if (typeof getByPath(en, usage.key) === 'string') continue
    seen.add(usage.key)
    missing.push(usage)
  }
  return missing
}

/**
 * setByPath replaces a non-object parent with {}, so backfilling
 * `common.save.now` would destroy the existing `common.save` string in every
 * locale. Such keys are a source bug, not something to write into en.json.
 */
export function findParentCollision(en, key) {
  const parts = key.split('.')
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join('.')
    if (typeof getByPath(en, parent) === 'string') return parent
  }
  return null
}

/**
 * findParentCollision only sees strings already in en.json. A batch can
 * still contain two NEW keys where one is a dot-boundary prefix of the
 * other (new `foo.bar` and new `foo.bar.baz`) — neither is a string in the
 * pre-mutation file, so that guard misses it, and setByPath silently
 * destroys whichever of the pair gets written first. Check the batch
 * against itself too.
 */
export function findBatchCollision(keys, key) {
  for (const other of keys) {
    if (other !== key && key.startsWith(`${other}.`)) return other
  }
  return null
}

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(p, out)
    else if (/\.(vue|ts)$/.test(entry.name)) out.push(p)
  }
  return out
}

async function main() {
  const backfill = process.argv.includes('--backfill')
  const en = JSON.parse(await readFile(EN_PATH, 'utf8'))

  const usages = []
  for (const file of sourceFiles(SRC)) {
    const source = await readFile(file, 'utf8')
    for (const usage of extractKeys(source)) {
      usages.push({ ...usage, file: relative(ROOT, file) })
    }
  }

  const missing = findMissing(en, usages)
  if (missing.length === 0) {
    console.log(`[i18n-check] ok — ${usages.length} call sites, no missing keys`)
    return
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
      setByPath(en, key, fallback)
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

  const unresolved = backfill ? withoutFallback.length : missing.length
  if (unresolved > 0) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
