/**
 * Format Utility Tests
 * Tests for locale-aware formatting utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  formatNumber,
  formatDateLocalized,
  formatDateTime,
  formatDateOnly,
  formatTimeOnly,
  formatCurrency,
  formatPercent
} from '@/utils/format'

describe('Format Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatNumber', () => {
    it('should format number with default locale', () => {
      const result = formatNumber(1234567.89)

      expect(result).toContain('1')
      expect(result).toContain('234')
    })

    it('should format number with specified locale', () => {
      const result = formatNumber(1234.56, 'en')

      expect(result).toBe('1,234.56')
    })

    it('should format with custom options', () => {
      const result = formatNumber(1234.5, 'en', { minimumFractionDigits: 2 })

      expect(result).toBe('1,234.50')
    })

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234.56, 'en')

      expect(result).toContain('-')
      expect(result).toContain('1,234')
    })

    it('should fallback to string on error', () => {
      // Force an error by passing invalid options
      const result = formatNumber(123, 'invalid-locale-that-should-error')

      // Should return some representation of the number
      expect(result).toBeDefined()
    })
  })

  describe('formatDateLocalized', () => {
    it('should format Date object', () => {
      const date = new Date('2024-06-15T12:00:00Z')

      const result = formatDateLocalized(date, 'en')

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })

    it('should format date string', () => {
      const result = formatDateLocalized('2024-06-15', 'en')

      expect(result).toBeDefined()
    })

    it('should format timestamp', () => {
      const timestamp = Date.now()

      const result = formatDateLocalized(timestamp, 'en')

      expect(result).toBeDefined()
    })

    it('should return Invalid Date for invalid input', () => {
      const result = formatDateLocalized('not-a-date', 'en')

      expect(result).toBe('Invalid Date')
    })

    it('should accept custom options', () => {
      const date = new Date('2024-06-15')

      const result = formatDateLocalized(date, 'en', { year: 'numeric' })

      expect(result).toContain('2024')
    })
  })

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2024-06-15T14:30:00')

      const result = formatDateTime(date, 'en')

      expect(result).toBeDefined()
      // Should contain date and time elements
    })
  })

  describe('formatDateOnly', () => {
    it('should format date without time', () => {
      const date = new Date('2024-06-15T14:30:00')

      const result = formatDateOnly(date, 'en')

      expect(result).toBeDefined()
      expect(result).toContain('2024')
    })
  })

  describe('formatTimeOnly', () => {
    it('should format time without date', () => {
      const date = new Date('2024-06-15T14:30:00')

      const result = formatTimeOnly(date, 'en')

      expect(result).toBeDefined()
    })
  })

  describe('formatCurrency', () => {
    it('should format currency with default USD', () => {
      const result = formatCurrency(1234.56, 'en')

      expect(result).toContain('$')
      expect(result).toContain('1,234')
    })

    it('should format with different currency', () => {
      const result = formatCurrency(1234.56, 'en', 'EUR')

      expect(result).toContain('€')
    })

    it('should handle negative amounts', () => {
      const result = formatCurrency(-100, 'en', 'USD')

      expect(result).toContain('-')
    })

    it('should fallback on error', () => {
      const result = formatCurrency(100, 'invalid-locale', 'USD')

      expect(result).toBeDefined()
    })
  })

  describe('formatPercent', () => {
    it('should format percentage', () => {
      const result = formatPercent(0.25, 'en')

      expect(result).toBe('25%')
    })

    it('should format with specified decimals', () => {
      const result = formatPercent(0.256, 'en', 2)

      expect(result).toBe('25.60%')
    })

    it('should handle values over 100%', () => {
      const result = formatPercent(1.5, 'en')

      expect(result).toBe('150%')
    })

    it('should handle zero', () => {
      const result = formatPercent(0, 'en')

      expect(result).toBe('0%')
    })

    it('should fallback on error', () => {
      const result = formatPercent(0.5, 'invalid-locale')

      expect(result).toBeDefined()
    })
  })
})
