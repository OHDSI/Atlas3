import { describe, it, expect } from 'vitest'
import { defaultAgentCohortName } from '@/utils/agent-cohort-name'
import type { CohortExpression } from '@/models/circe-types'

const expr = (criteria: unknown[], sets: unknown[] = []) =>
  ({
    ConceptSets: sets,
    PrimaryCriteria: { CriteriaList: criteria },
  }) as unknown as CohortExpression

describe('defaultAgentCohortName', () => {
  it('names the cohort after the concept set of the first entry criterion', () => {
    const e = expr(
      [{ DrugExposure: { CodesetId: 0 } }],
      [{ id: 0, name: 'lisinopril', expression: { items: [] } }]
    )
    expect(defaultAgentCohortName(e)).toBe('lisinopril cohort')
  })

  it('falls back when there are no entry criteria', () => {
    expect(defaultAgentCohortName(expr([]))).toBe('Untitled cohort')
  })

  it('falls back for a missing expression', () => {
    expect(defaultAgentCohortName(null)).toBe('Untitled cohort')
    expect(defaultAgentCohortName(undefined)).toBe('Untitled cohort')
  })

  it('falls back when the criterion has no resolvable concept set', () => {
    expect(defaultAgentCohortName(expr([{ DrugExposure: {} }]))).toBe('Untitled cohort')
    expect(defaultAgentCohortName(expr([{ DrugExposure: { CodesetId: 5 } }]))).toBe(
      'Untitled cohort'
    )
  })
})
