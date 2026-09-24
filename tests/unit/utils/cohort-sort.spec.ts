import { describe, it, expect } from 'vitest'
import { formatCohortSortUser, sortCohorts } from '@/utils/cohort-sort'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

describe('cohort-sort', () => {
  it('formats cohort sort users from string and object values', () => {
    expect(formatCohortSortUser('alice')).toBe('alice')
    expect(formatCohortSortUser({ name: 'Alice' })).toBe('Alice')
    expect(formatCohortSortUser({ login: 'alice-login' })).toBe('alice-login')
    expect(formatCohortSortUser({ id: 42 })).toBe(42)
    expect(formatCohortSortUser({})).toBe('Unknown')
    expect(formatCohortSortUser(123 as unknown)).toBe('Unknown')
    expect(formatCohortSortUser(null)).toBe('Unknown')
    expect(formatCohortSortUser(undefined)).toBe('Unknown')
  })

  it('sorts cohorts by each supported key and order', () => {
    const cohorts: CohortDefinitionSummary[] = [
      {
        id: 2,
        name: 'Bravo',
        createdBy: { login: 'b-user', name: 'Beta User' },
        createdDate: '2024-02-01T00:00:00Z',
        modifiedDate: '2024-02-03T00:00:00Z',
      },
      {
        id: 1,
        name: 'Alpha',
        createdBy: { login: 'a-user', name: 'Alpha User' },
        createdDate: '2024-01-01T00:00:00Z',
        modifiedDate: '2024-01-05T00:00:00Z',
      },
    ] as CohortDefinitionSummary[]

    expect(sortCohorts(cohorts, 'id', 'asc').map(c => c.id)).toEqual([1, 2])
    expect(sortCohorts(cohorts, 'id', 'desc').map(c => c.id)).toEqual([2, 1])
    expect(sortCohorts(cohorts, 'name', 'asc').map(c => c.name)).toEqual(['Alpha', 'Bravo'])
    expect(sortCohorts(cohorts, 'createdBy', 'asc').map(c => c.id)).toEqual([1, 2])
    expect(sortCohorts(cohorts, 'createdDate', 'asc').map(c => c.id)).toEqual([1, 2])
    expect(sortCohorts(cohorts, 'modifiedDate', 'asc').map(c => c.id)).toEqual([1, 2])
  })

  it('uses fallback values when sort fields are missing and preserves equal order', () => {
    const missingFields: CohortDefinitionSummary[] = [
      { id: undefined, name: undefined, createdBy: undefined, createdDate: undefined, modifiedDate: undefined },
      { id: undefined, name: undefined, createdBy: undefined, createdDate: undefined, modifiedDate: undefined },
    ] as CohortDefinitionSummary[]

    expect(sortCohorts(missingFields, 'id', 'asc')).toHaveLength(2)
    expect(sortCohorts(missingFields, 'name', 'asc')).toHaveLength(2)
    expect(sortCohorts(missingFields, 'createdDate', 'asc')).toHaveLength(2)
    expect(sortCohorts(missingFields, 'modifiedDate', 'asc')).toHaveLength(2)
  })

  it('returns zero when compared sort values are equal', () => {
    const cohorts: CohortDefinitionSummary[] = [
      { id: 2, name: 'Same', createdBy: 'b', createdDate: '2024-02-01T00:00:00Z', modifiedDate: '2024-02-02T00:00:00Z' },
      { id: 1, name: 'Same', createdBy: 'a', createdDate: '2024-01-01T00:00:00Z', modifiedDate: '2024-01-02T00:00:00Z' },
    ] as CohortDefinitionSummary[]

    expect(sortCohorts(cohorts, 'name', 'asc').map(c => c.id)).toEqual([2, 1])
  })
})
