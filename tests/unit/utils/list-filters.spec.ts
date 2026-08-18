import { describe, it, expect } from 'vitest'
import { getUserString, isDateInRange, matchesNameOrId } from '@/utils/list-filters'

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

  describe('matchesNameOrId', () => {
    const asthma = { id: 3, name: 'Asthma' }
    const copd = { id: 13, name: 'COPD' }
    const kidney = { id: 42, name: 'Chronic kidney disease' }
    const diabetes = { id: 7, name: 'Type 2 diabetes' }

    it('keeps every row when the query is empty', () => {
      expect(matchesNameOrId(asthma, '')).toBe(true)
      expect(matchesNameOrId(asthma, '   ')).toBe(true)
      expect(matchesNameOrId(asthma, null)).toBe(true)
      expect(matchesNameOrId(asthma, undefined)).toBe(true)
    })

    it('matches a name on a case-insensitive substring', () => {
      expect(matchesNameOrId(kidney, 'KIDNEY')).toBe(true)
      expect(matchesNameOrId(kidney, 'asthma')).toBe(false)
    })

    it('matches an id exactly or by prefix, never by substring', () => {
      expect(matchesNameOrId(asthma, '3')).toBe(true)
      expect(matchesNameOrId(copd, '13')).toBe(true)
      expect(matchesNameOrId(copd, '1')).toBe(true)
      // 13 contains a 3 but does not start with one.
      expect(matchesNameOrId(copd, '3')).toBe(false)
    })

    it('leaves ids out of a query that is not purely digits', () => {
      expect(matchesNameOrId(diabetes, 'type 2')).toBe(true)
      // Nothing in "Chronic kidney disease" says "7", and "7 diabetes" is a
      // name query, not an id.
      expect(matchesNameOrId(kidney, '7 diabetes')).toBe(false)
    })

    it('tolerates a missing name', () => {
      expect(matchesNameOrId({ id: 5 }, '5')).toBe(true)
      expect(matchesNameOrId({ id: 5, name: null }, 'asthma')).toBe(false)
    })

    it('handles string ids', () => {
      expect(matchesNameOrId({ id: '108', name: 'Sepsis' }, '10')).toBe(true)
      expect(matchesNameOrId({ id: '108', name: 'Sepsis' }, '8')).toBe(false)
    })
  })
})
