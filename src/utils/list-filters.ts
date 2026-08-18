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
 * Match a list row against a search box that has to serve both names and ids.
 *
 * Names match on substring, as they do everywhere else. Ids match only when the
 * whole query is digits, and then only exactly or as a prefix. Substring
 * matching on the id is what makes such a box unusable: "3" would return 13 and
 * 130, and any digit typed as part of a name query would drag in rows whose
 * visible name gives no hint why they are there.
 */
export function matchesNameOrId(
  item: { id: number | string; name?: string | null },
  query: string | null | undefined
): boolean {
  const term = (query ?? '').trim().toLowerCase()
  if (!term) return true
  if ((item.name ?? '').toLowerCase().includes(term)) return true
  return /^\d+$/.test(term) && String(item.id).startsWith(term)
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
