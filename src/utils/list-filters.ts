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
