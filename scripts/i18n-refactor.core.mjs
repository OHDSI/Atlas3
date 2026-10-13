/**
 * Pure helpers for bulk key refactors across every locale.
 *
 * i18n-sync tracks translations by key, so a hand rename in en.json makes the
 * key look brand new to every locale and silently drops its translations.
 * These helpers move the en value, each locale's translation and the manifest
 * hash together.
 */
import { getByPath, setByPath } from './i18n-lib.mjs'

const isObject = v => v !== null && typeof v === 'object'

/** Remove the leaf at `path` and any parent objects it leaves empty. */
export function deleteByPath(obj, path) {
  const keys = path.split('.')
  const chain = [obj]
  for (const key of keys.slice(0, -1)) {
    const next = chain[chain.length - 1][key]
    if (!isObject(next)) return
    chain.push(next)
  }
  delete chain[chain.length - 1][keys[keys.length - 1]]
  for (let i = chain.length - 1; i > 0; i--) {
    if (Object.keys(chain[i]).length > 0) break
    delete chain[i - 1][keys[i - 1]]
  }
}

function nestsUnderString(en, key) {
  const parts = key.split('.')
  for (let i = 1; i < parts.length; i++) {
    if (typeof getByPath(en, parts.slice(0, i).join('.')) === 'string') return true
  }
  return false
}

/**
 * Classify `map` ({ oldKey: newKey }) against en.json:
 *   - rename: newKey does not exist yet
 *   - merge:  newKey exists (or an earlier entry creates it) with the same English
 *   - error:  anything that would lose or change copy
 */
export function planRenames(en, map) {
  const renames = []
  const merges = []
  const errors = []
  const created = new Map() // newKey → English, for keys this plan creates
  const sources = new Set(Object.keys(map))

  for (const [from, to] of Object.entries(map)) {
    const value = getByPath(en, from)
    if (typeof value !== 'string') {
      errors.push(`"${from}" is not a string in en.json`)
      continue
    }
    if (from === to || sources.has(to)) {
      errors.push(`"${from}" → "${to}": target is itself being renamed`)
      continue
    }
    const existing = created.has(to) ? created.get(to) : getByPath(en, to)
    if (isObject(existing)) {
      errors.push(`"${from}" → "${to}": target is a group of keys, not a string`)
    } else if (nestsUnderString(en, to)) {
      errors.push(`"${from}" → "${to}": target nests under an existing string`)
    } else if ([...created.keys()].some(k => k.startsWith(`${to}.`) || to.startsWith(`${k}.`))) {
      errors.push(`"${from}" → "${to}": target collides with another new key in this plan`)
    } else if (existing === undefined) {
      renames.push([from, to])
      created.set(to, value)
    } else if (existing.trim() === value.trim()) {
      merges.push([from, to])
    } else {
      errors.push(
        `"${from}" → "${to}": English differs (${JSON.stringify(value)} vs ${JSON.stringify(existing)})`
      )
    }
  }
  return { renames, merges, errors }
}

/**
 * Apply a plan to one locale object and (optionally) its flat manifest
 * section, in place. On merge the target's translation wins; the source's is
 * adopted only when the target has none.
 */
export function applyPlan(locale, manifest, { renames, merges }) {
  for (const [from, to] of [...renames, ...merges]) {
    const value = getByPath(locale, from)
    if (typeof value === 'string' && typeof getByPath(locale, to) !== 'string') {
      setByPath(locale, to, value)
      if (manifest && manifest[from] !== undefined) manifest[to] = manifest[from]
    }
    deleteByPath(locale, from)
    if (manifest) delete manifest[from]
  }
}

/** Drop `keys` from a locale object and its manifest section, in place. */
export function pruneKeys(locale, manifest, keys) {
  for (const key of keys) {
    deleteByPath(locale, key)
    if (manifest) delete manifest[key]
  }
}

const QUOTED_KEY_RE = /(['"`])([A-Za-z][\w-]*(?:\.[\w-]+)+)\1/g

/** Rewrite exact quoted occurrences of old keys in source code. */
export function rewriteSource(source, map) {
  return source.replace(QUOTED_KEY_RE, (match, quote, key) =>
    Object.hasOwn(map, key) ? `${quote}${map[key]}${quote}` : match
  )
}

/** `<%= name %>` (Atlas 2.x / lodash template) → `{name}`. */
export function convertLegacyPlaceholders(str) {
  return str.replace(/<%=\s*(\w+)\s*%>/g, '{$1}')
}

/**
 * Re-add keys from an older copy of the same locale under new names, in
 * place — used to revive translations for strings that were pruned while
 * unused and later wired up again. `pairs` is [[newKey, oldKey]]; a pair is
 * skipped when the old copy has no string for it or the new key already exists.
 */
export function restoreKeys(locale, manifest, oldLocale, oldManifest, pairs) {
  for (const [to, from] of pairs) {
    const value = getByPath(oldLocale, from)
    if (typeof value !== 'string' || getByPath(locale, to) !== undefined) continue
    setByPath(locale, to, value)
    if (manifest && oldManifest?.[from] !== undefined) manifest[to] = oldManifest[from]
  }
}

/**
 * Keys whose current (English, translation) pair also appears in a reference
 * snapshot of the same locale — e.g. the commit that imported a bundle. Such a
 * translation was made from exactly the English it sits next to today, so it
 * can be recorded in the manifest as in sync. Anything else stays untracked
 * and is reported as new by i18n-sync.
 * @param {Map<string,string>} en       current English, flattened
 * @param {Map<string,string>} locale   current translations, flattened
 * @param {Map<string,string>} refEn    English at the reference commit
 * @param {Map<string,string>} refLocale translations at the reference commit
 */
export function adoptableKeys(en, locale, refEn, refLocale) {
  const pairs = new Set()
  for (const [key, value] of refLocale) {
    if (refEn.has(key)) pairs.add(`${refEn.get(key)}\u0000${value}`)
  }
  return [...locale.keys()].filter(
    key => en.has(key) && pairs.has(`${en.get(key)}\u0000${locale.get(key)}`)
  )
}
