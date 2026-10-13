/**
 * Pure helpers for finding which en.json keys the code actually references.
 *
 * A key counts as referenced when it appears as a quoted literal anywhere in
 * the scanned sources — not only inside t()/tv(), because many keys travel
 * through config objects (`nameKey: 'attributes.age.name'`) before reaching
 * the translator.
 */
import { flattenStrings, isExcludedPath } from './i18n-lib.mjs'

/**
 * Key prefixes that are completed at runtime (template literals such as
 * `versions.errors.${code}`). Everything under them is treated as used.
 */
export const DYNAMIC_PREFIXES = ['versions.errors.', 'characterizations.editor.validation.rules.']

const LITERAL_RE = /(['"`])([A-Za-z][\w-]*(?:\.[\w-]+)+)\1/g

/** Every quoted, dotted literal in `source` (interpolated templates excluded). */
export function collectReferences(source, out = new Set()) {
  LITERAL_RE.lastIndex = 0
  let match
  while ((match = LITERAL_RE.exec(source))) out.add(match[2])
  return out
}

/** Keys from `keys` that are neither referenced nor under a dynamic prefix. */
export function findUnused(keys, refs, prefixes = DYNAMIC_PREFIXES) {
  return keys.filter(
    key => !isExcludedPath(key) && !refs.has(key) && !prefixes.some(p => key.startsWith(p))
  )
}

/**
 * Groups of keys sharing the same English (trimmed, case-insensitive),
 * largest group first. Pass `only` to restrict to e.g. referenced keys.
 */
export function findDuplicates(en, only) {
  const byValue = new Map()
  for (const [key, value] of flattenStrings(en)) {
    if (isExcludedPath(key) || (only && !only.has(key))) continue
    const norm = value.trim().toLowerCase()
    if (!byValue.has(norm)) byValue.set(norm, [])
    byValue.get(norm).push(key)
  }
  return [...byValue.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([value, keys]) => ({ value, keys }))
    .sort((a, b) => b.keys.length - a.keys.length || a.value.localeCompare(b.value))
}
