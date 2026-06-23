/**
 * Pure helpers for manifest-based differential translation.
 *
 * Source of truth is `src/locales/en.json`. Each translated locale records, in
 * `src/locales/.i18n-manifest.json`, the *fingerprint of the English source*
 * that every key was translated from:
 *
 *   { "ja": { "navigation.cohortdefinitions": "<hash of en source>", ... } }
 *
 * Diffing the current en hashes against the manifest classifies every key as
 * new / stale / ok / removed — the i18n analogue of a dependency lockfile,
 * not a semver number (translations track *content*, so a content hash fits).
 */
import { createHash } from 'node:crypto'

export const SOURCE_LOCALE = 'en'

/**
 * Keys that are NOT translated: the top-level `locale` marker and the entire
 * `format.*` subtree (date/number parser tokens). Mirrors the translation
 * pipeline so status accounting matches what actually gets translated.
 */
export function isExcludedPath(path) {
  return path === 'locale' || path === 'format' || path.startsWith('format.')
}

/** Short, stable fingerprint of an English source string. */
export function hashSource(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12)
}

/**
 * Flatten string leaves into a Map<dotPath, string>. The source data has no
 * dotted keys and no array/number leaves; anything else is a hard error so we
 * never silently mis-handle a new shape.
 */
export function flattenStrings(obj, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenStrings(value, path, out)
    } else if (typeof value === 'string') {
      out.set(path, value)
    } else {
      throw new Error(`Unsupported non-string leaf at "${path}" (${typeof value})`)
    }
  }
  return out
}

/** Translatable English leaves only (excludes locale marker + format.*). */
export function translatableSource(enObj) {
  const out = new Map()
  for (const [path, value] of flattenStrings(enObj)) {
    if (!isExcludedPath(path)) out.set(path, value)
  }
  return out
}

export function getByPath(obj, path) {
  let cur = obj
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[key]
  }
  return cur
}

export function setByPath(obj, path, value) {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {}
    cur = cur[key]
  }
  cur[keys[keys.length - 1]] = value
}

/** Placeholders that must survive translation verbatim: {x} and <%= x %>. */
export function placeholders(str) {
  const braces = str.match(/\{[^}]*\}/g) || []
  const legacy = str.match(/<%=.*?%>/g) || []
  return [...braces, ...legacy].sort()
}

/**
 * Classify every translatable key for one locale.
 * @returns {{ new: string[], stale: string[], ok: string[], removed: string[] }}
 */
export function computeStatus(enObj, localeObj, localeManifest) {
  const source = translatableSource(enObj)
  const manifest = localeManifest || {}
  const status = { new: [], stale: [], ok: [], removed: [] }

  for (const [path, enVal] of source) {
    const recorded = manifest[path]
    const hasTranslation = typeof getByPath(localeObj, path) === 'string'
    if (recorded === undefined || !hasTranslation) {
      status.new.push(path)
    } else if (recorded !== hashSource(enVal)) {
      status.stale.push(path)
    } else {
      status.ok.push(path)
    }
  }

  // removed: anything recorded in the manifest or present in the locale file
  // that is no longer a translatable source key.
  const sourceKeys = new Set(source.keys())
  const seen = new Set([
    ...Object.keys(manifest),
    ...flattenStrings(localeObj).keys(),
  ])
  for (const path of seen) {
    if (!isExcludedPath(path) && !sourceKeys.has(path)) status.removed.push(path)
  }
  status.removed.sort()
  return status
}

/** new + stale = the work list to send to translation, sorted for stability. */
export function deltaKeys(status) {
  return [...status.new, ...status.stale].sort()
}

/**
 * Rebuild a locale object preserving en's key ORDER. Includes the `locale`
 * marker (set to `code`), copies the non-translated `format.*` subtree from en
 * verbatim, includes every translated leaf present in `translations`
 * (Map<dotPath,string>), and omits untranslated keys (they fall back to English
 * at runtime via the store's deep-merge).
 */
export function assembleLocale(enObj, code, translations) {
  const out = {}
  for (const [path, enVal] of flattenStrings(enObj)) {
    if (path === 'locale') {
      setByPath(out, path, code)
    } else if (isExcludedPath(path)) {
      setByPath(out, path, enVal)
    } else if (translations.has(path)) {
      setByPath(out, path, translations.get(path))
    }
  }
  return out
}
