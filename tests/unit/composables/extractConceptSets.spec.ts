// extractConceptSets was removed in the circe-types refactor. The equivalent
// functionality is now findUsedConceptSetIds (walks the CohortExpression graph
// directly rather than transforming from an internal form).
import { describe, it, expect } from 'vitest'
import { findUsedConceptSetIds } from '@/components/cohort-editor/concept-set-usage'
import type { CohortExpression } from '@/components/cohort-editor/circe.types'

describe('findUsedConceptSetIds', () => {
  it('returns both IDs when distinct concept sets share the same name (different ids)', () => {
    // Two genuinely different concept sets referenced from different criteria.
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 1 } }],
      },
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: 2 } } }],
          },
        },
      ],
    }

    const result = findUsedConceptSetIds(expression)

    // Both concept sets must appear — distinct IDs are not collapsed.
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2])
  })

  it('deduplicates the same concept set referenced from multiple places (same id)', () => {
    // The same CodesetId appears in both primary criteria and an inclusion rule.
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 5 } }],
      },
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: 5 } } }],
          },
        },
      ],
    }

    const result = findUsedConceptSetIds(expression)

    expect(result.size).toBe(1)
    expect(result.has(5)).toBe(true)
  })
})
