/**
 * Shared filter helpers for entity lists (cohorts, concept sets, ...)
 */

export interface DateRange {
  from?: Date
  to?: Date
}

/**
 * Check if a date is within range. An entity without a date only passes when
 * no range is set.
 */
export function isDateInRange(date: number | string | undefined, range: DateRange): boolean {
  if (!date) return !range.from && !range.to
  const value = new Date(date)
  if (range.from && value < range.from) return false
  if (range.to && value > range.to) return false
  return true
}

/**
 * Split a search query into the terms every match has to contain.
 *
 * Whitespace separates terms, so "pl schiz" asks for two fragments rather than
 * one literal phrase. A blank query yields no terms, which callers read as
 * "everything matches".
 */
export function searchTerms(query: string | null | undefined): string[] {
  return (query ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Match a row against a search box, requiring every term but not the order
 * they were typed in or the text between them.
 *
 * Searching used to mean one literal substring, so finding a phenotype-library
 * cohort meant typing "[PL] earliest event of schizophrenia" rather than
 * "pl schiz" (#326). Each term now has to appear somewhere in `fields`, in any
 * order, and terms may land in different fields — a name/description pair is
 * searched as one body of text, so "pl schiz" still matches when the prefix is
 * in the name and the disease in the description.
 *
 * The change only ever widens: a multi-term query that matched as a literal
 * phrase still contains all of its terms, so nothing that matched before stops
 * matching, and a single-term query behaves exactly as it always did.
 */
export function matchesTerms(
  fields: (string | null | undefined)[],
  query: string | null | undefined,
  options: { identifiers?: (string | number | null | undefined)[] } = {}
): boolean {
  const terms = searchTerms(query)
  if (terms.length === 0) return true

  const haystacks = fields
    .filter((field): field is string => typeof field === 'string' && field.length > 0)
    .map((field) => field.toLowerCase())

  const identifiers = (options.identifiers ?? [])
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map((id) => String(id).toLowerCase())

  if (haystacks.length === 0 && identifiers.length === 0) return false

  return terms.every(
    (term) =>
      haystacks.some((haystack) => haystack.includes(term)) || matchesIdentifier(identifiers, term)
  )
}

/**
 * Identifiers match a term whole or by prefix, never by substring.
 *
 * Splitting a query into terms would otherwise make a lone digit toxic: "type
 * 1" would match "Type 2 diabetes" through concept id 201826, and the row would
 * give the reader no clue why it was there. This is the rule `matchesNameOrId`
 * already applies to list ids, for the same reason.
 *
 * The rule is not restricted to digits, because a concept code need not be
 * numeric — searching "e11" still has to find ICD-10 E11.9.
 */
function matchesIdentifier(identifiers: string[], term: string): boolean {
  return identifiers.some((id) => id.startsWith(term))
}

/**
 * Match a list row against a search box that has to serve both names and ids.
 *
 * Names match on terms, as they do everywhere else. Ids match only when the
 * whole query is digits, and then only exactly or as a prefix. Substring
 * matching on the id is what makes such a box unusable: "3" would return 13 and
 * 130, and any digit typed as part of a name query would drag in rows whose
 * visible name gives no hint why they are there. The id test deliberately reads
 * the query whole rather than per term, so "13 7" stays a name query.
 */
export function matchesNameOrId(
  item: { id: number | string; name?: string | null },
  query: string | null | undefined
): boolean {
  const whole = (query ?? '').trim().toLowerCase()
  if (!whole) return true
  if (matchesTerms([item.name], query)) return true
  return /^\d+$/.test(whole) && String(item.id).startsWith(whole)
}

/**
 * Normalise a WebAPI user field (string or user object) to a lowercase name
 * for comparison.
 */
export function getUserString(userValue: unknown): string {
  if (!userValue) return ''
  if (typeof userValue === 'string') return userValue.toLowerCase()
  if (typeof userValue === 'object') {
    const user = userValue as Record<string, unknown>
    return ((user.name || user.login || user.id || '') as string).toLowerCase()
  }
  return ''
}
