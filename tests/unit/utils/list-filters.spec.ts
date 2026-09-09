import { describe, it, expect } from 'vitest'
import { getUserString, isDateInRange, matchesNameOrId, matchesTerms, searchTerms } from '@/utils/list-filters'

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

  describe('searchTerms', () => {
    it('splits a query on whitespace and lowercases it', () => {
      expect(searchTerms('PL Schiz')).toEqual(['pl', 'schiz'])
    })

    it('collapses runs of whitespace rather than yielding empty terms', () => {
      expect(searchTerms('  pl   schiz  ')).toEqual(['pl', 'schiz'])
    })

    it('yields nothing for a blank query', () => {
      expect(searchTerms('')).toEqual([])
      expect(searchTerms('   ')).toEqual([])
      expect(searchTerms(null)).toEqual([])
      expect(searchTerms(undefined)).toEqual([])
    })
  })

  describe('matchesTerms', () => {
    it('requires every term, in any order', () => {
      const name = '[PL] earliest event of schizophrenia'
      expect(matchesTerms([name], 'pl schiz')).toBe(true)
      expect(matchesTerms([name], 'schiz pl')).toBe(true)
      expect(matchesTerms([name], 'pl depression')).toBe(false)
    })

    it('lets terms be satisfied by different fields', () => {
      // The prefix is in the name, the disease only in the description.
      expect(matchesTerms(['[PL] cohort', 'earliest event of schizophrenia'], 'pl schiz')).toBe(true)
    })

    it('keeps every row when the query is blank', () => {
      expect(matchesTerms(['anything'], '')).toBe(true)
      expect(matchesTerms([null], '   ')).toBe(true)
    })

    it('rejects a non-empty query when there is nothing to search', () => {
      expect(matchesTerms([null, undefined, ''], 'schiz')).toBe(false)
    })

    // Splitting a query into terms would otherwise let a lone digit match the
    // middle of an id: "type 1" would pull in "Type 2 diabetes" via concept id
    // 201826. Identifiers are matched whole or by prefix, the same rule
    // matchesNameOrId already uses and for the same reason.
    it('matches an identifier by prefix, never by substring', () => {
      const opts = { identifiers: [201826, '44054006'] }
      expect(matchesTerms(['Type 2 diabetes mellitus'], '201826', opts)).toBe(true)
      expect(matchesTerms(['Type 2 diabetes mellitus'], '2018', opts)).toBe(true)
      expect(matchesTerms(['Type 2 diabetes mellitus'], '44054006', opts)).toBe(true)
      expect(matchesTerms(['Type 2 diabetes mellitus'], '1', opts)).toBe(false)
    })

    // Concept codes are not always numeric (ICD-10 "E11.9"), so the prefix rule
    // has to hold for letters too — what must never happen is a substring hit.
    it('matches an alphanumeric identifier by prefix but not by substring', () => {
      expect(matchesTerms(['Diabetes'], 'e11', { identifiers: ['E11.9'] })).toBe(true)
      expect(matchesTerms(['Diabetes'], '11', { identifiers: ['E11.9'] })).toBe(false)
    })

    it('lets a term be satisfied by either the text or an identifier', () => {
      const opts = { identifiers: [4193704] }
      expect(matchesTerms(['Type 1 diabetes mellitus'], 'type 4193704', opts)).toBe(true)
    })

    it('behaves exactly like a substring test for a single term', () => {
      expect(matchesTerms(['Chronic kidney disease'], 'KIDNEY')).toBe(true)
      expect(matchesTerms(['Chronic kidney disease'], 'asthma')).toBe(false)
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

    // #326: Atlas 2 let you type the distinctive fragments of a name and skip
    // what sits between them. Requiring one literal substring meant the
    // phenotype-library prefix had to be typed in full before the disease.
    it('matches when every term appears, even non-consecutively', () => {
      const pl = { id: 91, name: '[PL] earliest event of schizophrenia' }
      expect(matchesNameOrId(pl, 'pl schiz')).toBe(true)
    })

    it('ignores the order the terms are typed in', () => {
      const pl = { id: 91, name: '[PL] earliest event of schizophrenia' }
      expect(matchesNameOrId(pl, 'schiz pl')).toBe(true)
    })

    it('still requires every term to appear', () => {
      const pl = { id: 91, name: '[PL] earliest event of schizophrenia' }
      expect(matchesNameOrId(pl, 'pl depression')).toBe(false)
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
