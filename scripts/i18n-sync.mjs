#!/usr/bin/env node
/**
 * Manifest-based differential translation CLI.
 *
 *   node scripts/i18n-sync.mjs status [code]      report new/stale/ok/removed
 *   node scripts/i18n-sync.mjs extract <code>     write the work list to translate
 *   node scripts/i18n-sync.mjs apply   <code>     merge translated delta + prune + update manifest
 *   node scripts/i18n-sync.mjs bootstrap <code>   record current locale as fully in-sync
 *
 * Typical loop when en.json changes:
 *   1. npm run i18n:status
 *   2. npm run i18n:extract -- ja      → .i18n-work/ja/delta.json  ({id: english})
 *   3. translate delta.json → delta.translated.json ({id: japanese})  (agents / human)
 *   4. npm run i18n:apply -- ja        → updates ja.json + manifest, prunes removed keys
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  SOURCE_LOCALE,
  hashSource,
  translatableSource,
  flattenStrings,
  computeStatus,
  deltaKeys,
  assembleLocale,
  placeholders,
} from './i18n-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES_DIR = join(ROOT, 'src', 'locales')
const MANIFEST_PATH = join(LOCALES_DIR, '.i18n-manifest.json')
const WORK_DIR = join(ROOT, '.i18n-work')

const localePath = code => join(LOCALES_DIR, `${code}.json`)
const workDir = code => join(WORK_DIR, code)

async function readJson(path, fallback) {
  if (!existsSync(path)) {
    if (fallback !== undefined) return fallback
    throw new Error(`Missing file: ${path}`)
  }
  return JSON.parse(await readFile(path, 'utf8'))
}

async function writeJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

const log = (...a) => console.log(...a) // eslint-disable-line no-console

async function loadCommon(code) {
  const en = await readJson(localePath(SOURCE_LOCALE))
  const locale = await readJson(localePath(code), {})
  const manifest = await readJson(MANIFEST_PATH, {})
  return { en, locale, manifest }
}

/** Locales that have a bundled JSON next to en.json (excluding en itself). */
async function translatedLocales() {
  const { readdir } = await import('node:fs/promises')
  const files = await readdir(LOCALES_DIR)
  return files
    .filter(f => f.endsWith('.json') && !f.startsWith('.') && f !== `${SOURCE_LOCALE}.json`)
    .map(f => f.replace(/\.json$/, ''))
}

function summarize(code, status) {
  const n = status.new.length
  const s = status.stale.length
  const r = status.removed.length
  const ok = status.ok.length
  const flag = n + s + r === 0 ? '✓ up to date' : `${n} new, ${s} stale, ${r} removed`
  log(`  ${code}: ${flag}  (ok: ${ok})`)
  return n + s + r
}

async function cmdStatus(code) {
  const en = await readJson(localePath(SOURCE_LOCALE))
  const manifest = await readJson(MANIFEST_PATH, {})
  const codes = code ? [code] : await translatedLocales()
  log(`Source: ${SOURCE_LOCALE}.json (${translatableSource(en).size} translatable keys)\n`)
  let pending = 0
  for (const c of codes) {
    const locale = await readJson(localePath(c), {})
    const status = computeStatus(en, locale, manifest[c])
    pending += summarize(c, status)
    if (code) {
      const show = (label, arr) =>
        arr.length && log(`    ${label}:\n${arr.map(k => `      - ${k}`).join('\n')}`)
      show('new', status.new)
      show('stale', status.stale)
      show('removed', status.removed)
    }
  }
  if (!code && pending) log(`\nRun "npm run i18n:extract -- <code>" to start translating.`)
  return pending
}

async function cmdExtract(code) {
  requireCode(code)
  const { en, locale, manifest } = await loadCommon(code)
  const status = computeStatus(en, locale, manifest[code])
  const delta = deltaKeys(status)
  const source = translatableSource(en)

  await mkdir(workDir(code), { recursive: true })
  // Stable id ordering so re-extracting the same delta is reproducible.
  const map = {}
  const englishByID = {}
  delta.forEach((path, i) => {
    map[String(i)] = path
    englishByID[String(i)] = source.get(path)
  })
  await writeJson(join(workDir(code), 'map.json'), map)
  await writeJson(join(workDir(code), 'delta.json'), englishByID)
  await writeJson(join(workDir(code), 'removed.json'), status.removed)

  log(`Locale: ${code}`)
  log(`  new:     ${status.new.length}`)
  log(`  stale:   ${status.stale.length}`)
  log(`  removed: ${status.removed.length} (pruned on apply)`)
  log(`  → wrote ${delta.length} keys to ${join('.i18n-work', code, 'delta.json')}`)
  if (delta.length) {
    log(`\nTranslate {id: english} → {id: japanese}, save as`)
    log(`  ${join('.i18n-work', code, 'delta.translated.json')}`)
    log(`then run: npm run i18n:apply -- ${code}`)
  } else if (status.removed.length) {
    log(`\nNothing to translate; run "npm run i18n:apply -- ${code}" to prune removed keys.`)
  } else {
    log(`\n✓ up to date — nothing to do.`)
  }
}

async function cmdApply(code) {
  requireCode(code)
  const { en, locale, manifest } = await loadCommon(code)
  const source = translatableSource(en)
  const dir = workDir(code)

  const map = await readJson(join(dir, 'map.json'), {})
  const removed = await readJson(join(dir, 'removed.json'), [])
  const translatedByID = await readJson(join(dir, 'delta.translated.json'), {})

  // Validate id parity against the extracted map.
  const mapIds = new Set(Object.keys(map))
  const trIds = new Set(Object.keys(translatedByID))
  const missing = [...mapIds].filter(id => !trIds.has(id))
  const extra = [...trIds].filter(id => !mapIds.has(id))
  if (missing.length || extra.length) {
    fail(
      `Translated delta does not match extracted map: ` +
        `${missing.length} missing, ${extra.length} extra ids. Re-run extract/translate.`
    )
  }

  // Start from the current locale's translations, drop removed keys.
  const translations = new Map()
  for (const [path, value] of flattenStrings(locale)) {
    if (source.has(path)) translations.set(path, value)
  }
  for (const path of removed) translations.delete(path)

  // Apply the freshly translated delta + collect placeholder mismatches.
  const warnings = []
  const appliedKeys = []
  for (const [id, path] of Object.entries(map)) {
    const ja = translatedByID[id]
    if (typeof ja !== 'string') fail(`Translated value for id ${id} (${path}) is not a string`)
    const enVal = source.get(path)
    if (enVal === undefined) continue // key vanished from en since extract
    const a = placeholders(enVal).join('|')
    const b = placeholders(ja).join('|')
    if (a !== b) warnings.push(`  ${path}\n    en: ${a || '(none)'}\n    ${code}: ${b || '(none)'}`)
    translations.set(path, ja)
    appliedKeys.push(path)
  }

  // Rebuild the locale file in en order and update the manifest.
  const assembled = assembleLocale(en, code, translations)
  manifest[code] = manifest[code] || {}
  for (const path of removed) delete manifest[code][path]
  for (const path of appliedKeys) manifest[code][path] = hashSource(source.get(path))

  await writeJson(localePath(code), assembled)
  await writeJson(MANIFEST_PATH, sortManifest(manifest))

  log(`Applied to ${code}.json:`)
  log(`  translated/updated: ${appliedKeys.length}`)
  log(`  pruned (removed):   ${removed.length}`)
  log(`  total kept keys:    ${translations.size}`)
  if (warnings.length) {
    log(`\n⚠ ${warnings.length} placeholder mismatch(es) — review these translations:`)
    log(warnings.join('\n'))
  }
}

async function cmdBootstrap(code) {
  requireCode(code)
  const { en, locale, manifest } = await loadCommon(code)
  const source = translatableSource(en)
  manifest[code] = {}
  let recorded = 0
  for (const [path, enVal] of source) {
    if (typeof getByPathSafe(locale, path) === 'string') {
      manifest[code][path] = hashSource(enVal)
      recorded++
    }
  }
  await writeJson(MANIFEST_PATH, sortManifest(manifest))
  log(`Bootstrapped manifest for "${code}": ${recorded}/${source.size} keys recorded as in-sync.`)
  const untranslated = source.size - recorded
  if (untranslated) log(`  (${untranslated} source keys have no ${code} translation yet — will show as "new")`)
}

function getByPathSafe(obj, path) {
  let cur = obj
  for (const k of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[k]
  }
  return cur
}

function sortManifest(manifest) {
  const out = {}
  for (const code of Object.keys(manifest).sort()) {
    out[code] = {}
    for (const key of Object.keys(manifest[code]).sort()) out[code][key] = manifest[code][key]
  }
  return out
}

function requireCode(code) {
  if (!code) fail('Locale code required, e.g. "ja".')
  if (code === SOURCE_LOCALE) fail(`"${SOURCE_LOCALE}" is the source locale and is not translated.`)
}

function fail(msg) {
  console.error(`✗ ${msg}`) // eslint-disable-line no-console
  process.exit(1)
}

const [cmd, code] = process.argv.slice(2)
const commands = {
  status: () => cmdStatus(code),
  extract: () => cmdExtract(code),
  apply: () => cmdApply(code),
  bootstrap: () => cmdBootstrap(code),
}
if (!commands[cmd]) {
  fail(`Unknown command "${cmd ?? ''}". Use: status | extract | apply | bootstrap`)
}
commands[cmd]().catch(err => fail(err.message))
