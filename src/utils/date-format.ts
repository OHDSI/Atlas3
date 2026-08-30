/**
 * Date Formatting Utilities
 * Format dates for display in UI
 */

import { logger } from '@/utils/logger'

/**
 * Format ISO 8601 date string or timestamp to MM/DD/YYYY format
 * @param isoDate ISO 8601 date string or Unix timestamp (milliseconds)
 * @returns Formatted date string or "Invalid Date" if parsing fails
 */
/**
 * The moment an asset was last touched, for both sorting and display.
 *
 * WebAPI leaves `modifiedDate` unset on an asset that has only ever been
 * created. Read literally that is "no date", which sorted such an asset to the
 * far end of a most-recently-updated list and rendered it as Unknown, so a
 * cohort created minutes ago sank below one last edited months back (#292).
 * Creation is the last time an unmodified asset was touched, so it stands in.
 */
export function lastTouchedDate(entity: {
  modifiedDate?: string | number | null
  createdDate?: string | number | null
}): string | number | undefined {
  return entity.modifiedDate ?? entity.createdDate ?? undefined
}

export function formatDate(isoDate: string | number | undefined | null): string {
  if (!isoDate) {
    return '—' // em dash for missing dates
  }

  try {
    const date = new Date(isoDate)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '—' // em dash for invalid dates
    }

    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const year = date.getUTCFullYear()

    return `${month}/${day}/${year}`
  } catch (error) {
    logger.error('DateFormat', 'Date formatting error', error)
    return '—' // em dash for error cases
  }
}

/**
 * Format ISO 8601 date string or timestamp to relative time (e.g., "2 days ago")
 * @param isoDate ISO 8601 date string or Unix timestamp (milliseconds)
 * @returns Relative time string
 */
export function formatRelativeTime(isoDate: string | number | undefined | null): string {
  if (!isoDate) {
    return 'Unknown'
  }

  try {
    const date = new Date(isoDate)

    if (isNaN(date.getTime())) {
      return 'Unknown'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // Timestamps in the future (client/server clock skew) clamp to Today
    // rather than falling through to a negative "-1 days ago".
    if (diffDays <= 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30)
      return `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffDays / 365)
      return `${years} year${years > 1 ? 's' : ''} ago`
    }
  } catch (error) {
    logger.error('DateFormat', 'Relative time formatting error', error)
    return 'Unknown'
  }
}
