import { getByPath, translatableSource } from './i18n-lib.mjs'

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

/**
 * When a key is called with two different literal fallbacks, findMissing's
 * first-wins dedup means whichever call site the file walk visits first
 * decides what actually gets backfilled — every other call site's fallback
 * silently becomes dead text, and its rendered output changes without any
 * source diff at that call site. Catch it before it reaches en.json.
 *
 * Only meaningful for keys findMissing would otherwise hand to --backfill:
 * once a key is a string in en.json, the translation lookup wins outright
 * and inline fallbacks are never consulted, so a mismatch there is inert.
 * Call this with the `missing` list, not every usage in the codebase.
 */
export function findFallbackConflicts(usages) {
  const byKey = new Map()
  for (const { key, fallback, file } of usages) {
    if (fallback === null) continue
    if (!byKey.has(key)) byKey.set(key, new Map())
    const fallbacks = byKey.get(key)
    if (!fallbacks.has(fallback)) fallbacks.set(fallback, [])
    fallbacks.get(fallback).push(file)
  }

  const conflicts = []
  for (const [key, fallbacks] of byKey) {
    if (fallbacks.size < 2) continue
    conflicts.push({
      key,
      fallbacks: [...fallbacks.entries()].map(([fallback, files]) => ({ fallback, files })),
    })
  }
  return conflicts
}
/**
 * Atlas 2.x numbered keys (`cohortErasText_2`, `textfield_17`) say nothing
 * about what the string is for. Name keys after their role instead.
 */
const NUMBERED_KEY_RE = /(_\d+|Text\d+)$|textfield/i

/**
 * Rules for en.json itself. Placeholders are `{name}` only — the Atlas 2.x
 * `<%= name %>` style is not interpolated by useI18n.
 */
export function lintEnglish(en) {
  const errors = []
  for (const [key, value] of translatableSource(en)) {
    if (value.includes('<%')) errors.push(`"${key}" uses a <%= %> placeholder; write {name} instead`)
    if (NUMBERED_KEY_RE.test(key.split('.').pop())) {
      errors.push(`"${key}" is a numbered key; name it after what the string is for`)
    }
  }
  return errors
}

// t('key', <string literal> — the literal is '…' or "…" with escapes, or a
// `…` template without interpolation. Group 1 is the call head up to the key,
// group 2 the key, group 3 the literal (with its leading comma).
const FALLBACK_RE =
  /(\b(?:t|tv)\(\s*(['"])([A-Za-z0-9_.-]+)\2)(\s*,\s*(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`$\\]*`))(?=\s*[,)])/g

/**
 * Inline English fallbacks on keys en.json already has. They are dead text at
 * runtime (en.json is loaded before the first render) and drift from the real
 * copy, so en.json stays the single source of English.
 * @returns {{ key: string, line: number }[]}
 */
export function findRedundantFallbacks(source, en) {
  const out = []
  FALLBACK_RE.lastIndex = 0
  let match
  while ((match = FALLBACK_RE.exec(source))) {
    if (typeof getByPath(en, match[3]) !== 'string') continue
    out.push({ key: match[3], line: source.slice(0, match.index).split('\n').length })
  }
  return out
}

/** Drop redundant inline fallbacks, keeping any params argument that follows. */
export function stripFallbacks(source, en) {
  return source.replace(FALLBACK_RE, (match, head, _quote, key) =>
    typeof getByPath(en, key) === 'string' ? head : match
  )
}

/** The value of a single-quoted JS string literal body (`It\'s` → `It's`). */
export function unescapeLiteral(body) {
  return body.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, esc) => {
    if (esc[0] === 'u') return String.fromCodePoint(parseInt(esc.replace(/[u{}]/g, ''), 16))
    if (esc[0] === 'x') return String.fromCharCode(parseInt(esc.slice(1), 16))
    return { n: '\n', t: '\t', r: '\r' }[esc] ?? esc
  })
}
