/**
 * Date Format Utility Tests
 * Tests for date formatting utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { formatDate, formatRelativeTime, lastTouchedDate } from '@/utils/date-format'

describe('Date Format Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('lastTouchedDate (#292)', () => {
    it('uses the modified date when the asset has one', () => {
      expect(
        lastTouchedDate({ modifiedDate: '2026-05-01T00:00:00Z', createdDate: '2026-01-01T00:00:00Z' })
      ).toBe('2026-05-01T00:00:00Z')
    })

    it('falls back to the created date for an asset never modified', () => {
      expect(lastTouchedDate({ modifiedDate: null, createdDate: '2026-01-01T00:00:00Z' })).toBe(
        '2026-01-01T00:00:00Z'
      )
      expect(lastTouchedDate({ createdDate: 1767225600000 })).toBe(1767225600000)
    })

    it('reports nothing when the asset carries neither date', () => {
      expect(lastTouchedDate({})).toBeUndefined()
      expect(lastTouchedDate({ modifiedDate: null, createdDate: null })).toBeUndefined()
    })
  })

  describe('formatDate', () => {
    it('should format ISO date string to MM/DD/YYYY', () => {
      const result = formatDate('2024-06-15T12:00:00Z')

      expect(result).toBe('06/15/2024')
    })

    it('should format timestamp to MM/DD/YYYY', () => {
      const timestamp = new Date('2024-06-15').getTime()

      const result = formatDate(timestamp)

      expect(result).toContain('06')
      expect(result).toContain('2024')
    })

    it('should return em dash for null', () => {
      const result = formatDate(null)

      expect(result).toBe('—')
    })

    it('should return em dash for undefined', () => {
      const result = formatDate(undefined)

      expect(result).toBe('—')
    })

    it('should return em dash for invalid date string', () => {
      const result = formatDate('not-a-date')

      expect(result).toBe('—')
    })

    it('should pad single digit month and day', () => {
      // Use local date to avoid timezone issues
      const date = new Date(2024, 0, 5) // Jan 5, 2024
      const result = formatDate(date.getTime())

      expect(result).toBe('01/05/2024')
    })
  })

  describe('formatRelativeTime', () => {
    it('should return Today for current day', () => {
      const today = Date.now()

      const result = formatRelativeTime(today)

      expect(result).toBe('Today')
    })

    it('should return Yesterday for one day ago', () => {
      const yesterday = Date.now() - (24 * 60 * 60 * 1000)

      const result = formatRelativeTime(yesterday)

      expect(result).toBe('Yesterday')
    })

    it('should return X days ago for 2-6 days', () => {
      const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(threeDaysAgo)

      expect(result).toBe('3 days ago')
    })

    it('should return X week(s) ago for 7-29 days', () => {
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(twoWeeksAgo)

      expect(result).toBe('2 weeks ago')
    })

    it('should return 1 week ago (singular)', () => {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(oneWeekAgo)

      expect(result).toBe('1 week ago')
    })

    it('should return X month(s) ago for 30-364 days', () => {
      const twoMonthsAgo = Date.now() - (60 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(twoMonthsAgo)

      expect(result).toBe('2 months ago')
    })

    it('should return 1 month ago (singular)', () => {
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(oneMonthAgo)

      expect(result).toBe('1 month ago')
    })

    it('should return X year(s) ago for 365+ days', () => {
      const twoYearsAgo = Date.now() - (730 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(twoYearsAgo)

      expect(result).toBe('2 years ago')
    })

    it('should return 1 year ago (singular)', () => {
      const oneYearAgo = Date.now() - (365 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(oneYearAgo)

      expect(result).toBe('1 year ago')
    })

    it('should return Unknown for null', () => {
      const result = formatRelativeTime(null)

      expect(result).toBe('Unknown')
    })

    it('should return Unknown for undefined', () => {
      const result = formatRelativeTime(undefined)

      expect(result).toBe('Unknown')
    })

    it('should accept ISO date string', () => {
      const result = formatRelativeTime('2024-06-15T12:00:00Z')

      expect(result).toBe('Today')
    })

    it('should return Today for a timestamp a few hours in the future (clock skew)', () => {
      const threeHoursAhead = Date.now() + (3 * 60 * 60 * 1000)

      const result = formatRelativeTime(threeHoursAhead)

      expect(result).toBe('Today')
    })

    it('should never render a negative "days ago" for future dates', () => {
      const threeDaysAhead = Date.now() + (3 * 24 * 60 * 60 * 1000)

      const result = formatRelativeTime(threeDaysAhead)

      expect(result).toBe('Today')
      expect(result).not.toContain('-')
    })

    it('should return Unknown for an invalid date string', () => {
      const result = formatRelativeTime('not-a-date')

      expect(result).toBe('Unknown')
    })
  })
})
