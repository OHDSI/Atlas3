/**
 * Unit Tests: Format Utilities
 * Tests for src/utils/format.ts
 */

import { describe, it, expect, vi } from 'vitest'
import {
  formatNumber,
  formatDate,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  formatCurrency,
  formatPercent,
} from '@/utils/format'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('format', () => {
  describe('formatNumber', () => {
    it('formats numbers with default locale', () => {
      const result = formatNumber(1234567.89)
      expect(result).toBe('1,234,567.89')
    })

    it('formats numbers with custom locale', () => {
      const result = formatNumber(1234567.89, 'de')
      expect(result).toMatch(/1\.234\.567,89|1 234 567,89/)
    })

    it('formats numbers with custom options', () => {
      const result = formatNumber(1234.5, 'en', { minimumFractionDigits: 2 })
      expect(result).toBe('1,234.50')
    })

    it('handles zero', () => {
      const result = formatNumber(0)
      expect(result).toBe('0')
    })

    it('handles negative numbers', () => {
      const result = formatNumber(-1234.56)
      expect(result).toBe('-1,234.56')
    })
  })

  describe('formatDate', () => {
    it('formats Date object', () => {
      const date = new Date('2024-03-15T00:00:00Z')
      const result = formatDate(date, 'en')
      expect(result).toMatch(/3\/15\/2024|Mar 15, 2024/)
    })

    it('formats ISO string', () => {
      const result = formatDate('2024-03-15T10:30:00Z', 'en')
      expect(result).toBeTruthy()
    })

    it('formats timestamp', () => {
      const timestamp = new Date('2024-03-15').getTime()
      const result = formatDate(timestamp, 'en')
      expect(result).toBeTruthy()
    })

    it('returns Invalid Date for invalid input', () => {
      const result = formatDate('not-a-date', 'en')
      expect(result).toBe('Invalid Date')
    })

    it('formats with custom options', () => {
      const date = new Date('2024-03-15')
      const result = formatDate(date, 'en', { year: 'numeric', month: 'long', day: 'numeric' })
      expect(result).toMatch(/March 15, 2024/)
    })
  })

  describe('formatDateTime', () => {
    it('formats date with time', () => {
      const date = new Date('2024-03-15T14:30:00')
      const result = formatDateTime(date, 'en')
      expect(result).toMatch(/Mar 15, 2024|3\/15\/2024/)
      expect(result).toMatch(/2:30|14:30/)
    })
  })

  describe('formatDateOnly', () => {
    it('formats date without time', () => {
      const date = new Date('2024-03-15T14:30:00')
      const result = formatDateOnly(date, 'en')
      expect(result).toMatch(/Mar 15, 2024/)
      expect(result).not.toMatch(/14:30/)
    })
  })

  describe('formatTimeOnly', () => {
    it('formats time without date', () => {
      const date = new Date('2024-03-15T14:30:00')
      const result = formatTimeOnly(date, 'en')
      expect(result).toMatch(/2:30|02:30|14:30/)
    })
  })

  describe('formatCurrency', () => {
    it('formats currency with default USD', () => {
      const result = formatCurrency(1234.56)
      expect(result).toMatch(/\$1,234\.56/)
    })

    it('formats currency with custom currency code', () => {
      const result = formatCurrency(1234.56, 'en', 'EUR')
      expect(result).toMatch(/1,234\.56/)
    })

    it('handles zero', () => {
      const result = formatCurrency(0)
      expect(result).toMatch(/\$0\.00/)
    })

    it('handles negative amounts', () => {
      const result = formatCurrency(-100)
      expect(result).toMatch(/-?\$100\.00/)
    })
  })

  describe('formatPercent', () => {
    it('formats decimal as percentage', () => {
      const result = formatPercent(0.25)
      expect(result).toBe('25%')
    })

    it('formats with custom decimals', () => {
      const result = formatPercent(0.3333, 'en', 2)
      expect(result).toBe('33.33%')
    })

    it('formats zero percent', () => {
      const result = formatPercent(0)
      expect(result).toBe('0%')
    })

    it('formats values over 100%', () => {
      const result = formatPercent(1.5)
      expect(result).toBe('150%')
    })

    it('handles small decimals', () => {
      const result = formatPercent(0.001, 'en', 1)
      expect(result).toBe('0.1%')
    })
  })
})
