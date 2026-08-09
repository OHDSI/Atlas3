import { describe, it, expect } from 'vitest'
import { getUserString, isDateInRange } from '@/utils/list-filters'

describe('list-filters', () => {
  describe('isDateInRange', () => {
    it('passes an undefined date only when no range is set', () => {
      expect(isDateInRange(undefined, {})).toBe(true)
      expect(isDateInRange(undefined, { from: new Date('2024-01-01') })).toBe(false)
      expect(isDateInRange(undefined, { to: new Date('2024-01-01') })).toBe(false)
    })

    it('honours both bounds', () => {
      const range = { from: new Date('2024-01-01'), to: new Date('2024-12-31') }
      expect(isDateInRange('2024-06-15', range)).toBe(true)
      expect(isDateInRange('2023-12-31', range)).toBe(false)
      expect(isDateInRange('2025-01-01', range)).toBe(false)
    })

    it('accepts timestamps', () => {
      expect(isDateInRange(Date.UTC(2024, 5, 15), { from: new Date('2024-01-01') })).toBe(true)
    })
  })

  describe('getUserString', () => {
    it('returns an empty string for missing values', () => {
      expect(getUserString(undefined)).toBe('')
      expect(getUserString(null)).toBe('')
      expect(getUserString('')).toBe('')
    })

    it('lowercases a plain string', () => {
      expect(getUserString('Admin')).toBe('admin')
    })

    it('prefers name, then login, then id on user objects', () => {
      expect(getUserString({ name: 'Ada', login: 'ada1', id: 7 })).toBe('ada')
      expect(getUserString({ login: 'Ada1', id: 7 })).toBe('ada1')
      expect(getUserString({ id: 'U7' })).toBe('u7')
      expect(getUserString({})).toBe('')
    })
  })
})
