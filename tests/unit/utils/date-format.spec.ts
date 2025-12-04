/**
 * Unit Tests: Date Format Utilities
 * Tests for src/utils/date-format.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDate, formatRelativeTime } from '@/utils/date-format'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('date-format', () => {
  describe('formatDate', () => {
    it('formats ISO date string to MM/DD/YYYY', () => {
      const result = formatDate('2024-03-15T10:30:00Z')
      expect(result).toMatch(/03\/15\/2024/)
    })

    it('formats timestamp to MM/DD/YYYY', () => {
      // Use explicit UTC time to avoid timezone issues
      const timestamp = new Date('2024-03-15T12:00:00Z').getTime()
      const result = formatDate(timestamp)
      expect(result).toMatch(/03\/15\/2024/)
    })

    it('returns em dash for null', () => {
      const result = formatDate(null)
      expect(result).toBe('—')
    })

    it('returns em dash for undefined', () => {
      const result = formatDate(undefined)
      expect(result).toBe('—')
    })

    it('returns em dash for invalid date string', () => {
      const result = formatDate('not-a-date')
      expect(result).toBe('—')
    })

    it('returns em dash for empty string', () => {
      const result = formatDate('')
      expect(result).toBe('—')
    })

    it('pads single digit months and days', () => {
      const result = formatDate('2024-01-05')
      expect(result).toMatch(/01\/0[45]\/2024/)
    })
  })

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns Today for dates today', () => {
      const result = formatRelativeTime('2024-03-15T10:00:00Z')
      expect(result).toBe('Today')
    })

    it('returns Yesterday for dates yesterday', () => {
      const result = formatRelativeTime('2024-03-14T10:00:00Z')
      expect(result).toBe('Yesterday')
    })

    it('returns days ago for recent dates', () => {
      const result = formatRelativeTime('2024-03-12T10:00:00Z')
      expect(result).toBe('3 days ago')
    })

    it('returns weeks ago for dates within a month', () => {
      const result = formatRelativeTime('2024-03-01T10:00:00Z')
      expect(result).toBe('2 weeks ago')
    })

    it('returns week singular for 1 week', () => {
      const result = formatRelativeTime('2024-03-08T10:00:00Z')
      expect(result).toBe('1 week ago')
    })

    it('returns months ago for dates within a year', () => {
      const result = formatRelativeTime('2024-01-15T10:00:00Z')
      expect(result).toBe('2 months ago')
    })

    it('returns month singular for 1 month', () => {
      // 30+ days difference needed for "1 month ago"
      const result = formatRelativeTime('2024-02-10T10:00:00Z')
      expect(result).toBe('1 month ago')
    })

    it('returns years ago for old dates', () => {
      const result = formatRelativeTime('2022-03-15T10:00:00Z')
      expect(result).toBe('2 years ago')
    })

    it('returns year singular for 1 year', () => {
      const result = formatRelativeTime('2023-03-15T10:00:00Z')
      expect(result).toBe('1 year ago')
    })

    it('returns Unknown for null', () => {
      const result = formatRelativeTime(null)
      expect(result).toBe('Unknown')
    })

    it('returns Unknown for undefined', () => {
      const result = formatRelativeTime(undefined)
      expect(result).toBe('Unknown')
    })

    it('handles timestamps', () => {
      const timestamp = new Date('2024-03-10').getTime()
      const result = formatRelativeTime(timestamp)
      expect(result).toBe('5 days ago')
    })
  })
})
