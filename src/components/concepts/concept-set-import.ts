/**
 * Pure helpers for the Concept Set Editor import flows (Paste IDs / Paste source
 * codes / Paste JSON). Kept framework-free so they can be unit-tested in
 * isolation from the Vue component.
 */
import type { ConceptSetItem } from '@/models/concept-set.types'
import { mapConceptSetFromAPI, type ConceptSetAPIExpression } from '@/utils/api-mappers'

/**
 * Parse pasted text into a list of unique, positive numeric concept IDs.
 * Accepts whitespace, commas, semicolons, tabs, or newlines as separators and
 * ignores empty / non-numeric tokens.
 */
export function parsePastedIds(input: string): number[] {
  const seen = new Set<number>()
  const tokens = input.split(/[\s,;]+/).filter(Boolean)
  for (const tok of tokens) {
    const n = Number.parseInt(tok, 10)
    if (Number.isFinite(n) && n > 0) {
      seen.add(n)
    }
  }
  return [...seen]
}

/**
 * Parse pasted text into a list of unique source-code strings. Source codes can
 * be alphanumeric (e.g. ICD10 "E11.9"), so unlike IDs we preserve them verbatim,
 * splitting only on commas, semicolons, tabs, and newlines. Spaces inside a
 * single token are NOT treated as separators because some source codes contain
 * spaces; surrounding whitespace is trimmed.
 */
export function parsePastedSourceCodes(input: string): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  const tokens = input.split(/[,;\t\r\n]+/)
  for (const raw of tokens) {
    const tok = raw.trim()
    if (tok && !seen.has(tok)) {
      seen.add(tok)
      ordered.push(tok)
    }
  }
  return ordered
}

export interface ParsedJsonImport {
  ok: boolean
  items: ConceptSetItem[]
  /** Human-readable error when ok === false. */
  error?: string
}

/**
 * Parse a pasted concept-set-expression JSON string into ConceptSetItem[].
 *
 * Accepts either the raw expression shape `{ items: [...] }` or a wrapper that
 * nests it under an `expression` key (matching the WebAPI concept-set response).
 * Reuses `mapConceptSetFromAPI` so the field mapping stays in one place.
 * Validates gracefully and returns a descriptive error instead of throwing.
 */
export function parseConceptSetJson(input: string): ParsedJsonImport {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, items: [], error: 'Paste a concept set expression first.' }
  }

  let raw: unknown
  try {
    raw = JSON.parse(trimmed)
  } catch {
    return { ok: false, items: [], error: 'Invalid JSON: could not parse the pasted text.' }
  }

  return parseConceptSetObject(raw)
}

/**
 * The object form of {@link parseConceptSetJson}, for callers that already hold
 * parsed JSON and would otherwise have to re-serialise it.
 */
export function parseConceptSetObject(raw: unknown): ParsedJsonImport {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, items: [], error: 'Expected a JSON object with an "items" array.' }
  }

  const obj = raw as Record<string, unknown>
  // Accept both `{ items: [...] }` and `{ expression: { items: [...] } }`.
  const expression = (
    'items' in obj
      ? obj
      : (obj.expression as Record<string, unknown> | undefined) ?? {}
  ) as { items?: unknown }

  if (!Array.isArray(expression.items)) {
    return {
      ok: false,
      items: [],
      error: 'Expected an "items" array in the concept set expression.',
    }
  }

  // Validate each item exposes a concept with a numeric CONCEPT_ID before
  // handing off to the mapper, so a malformed entry yields a clear message
  // rather than a downstream NaN.
  for (const [idx, item] of expression.items.entries()) {
    const concept = (item as { concept?: { CONCEPT_ID?: unknown } } | null)?.concept
    if (!concept || typeof concept.CONCEPT_ID !== 'number') {
      return {
        ok: false,
        items: [],
        error: `Item ${idx + 1} is missing a valid concept (CONCEPT_ID).`,
      }
    }
  }

  const mapped = mapConceptSetFromAPI({
    id: 0,
    name: '',
    expression: expression as ConceptSetAPIExpression,
  })

  return { ok: true, items: mapped.items }
}
