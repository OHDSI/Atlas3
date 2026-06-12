import { describe, it, expect } from 'vitest'
import { extractConceptSets } from '@/composables/useCohortValidation'
import type {
  CohortEvent,
  InclusionRule,
  CriteriaGroup,
  ExitCriteria,
  ConceptSetReference,
} from '@/models/cohort.types'

function event(id: string, conceptSet?: ConceptSetReference): CohortEvent {
  return {
    id,
    criteriaType: 'ConditionOccurrence',
    attributes: [],
    ...(conceptSet ? { conceptSet } : {}),
  } as CohortEvent
}

const emptyExit: ExitCriteria = { strategy: 'CONTINUOUS_OBSERVATION' }

describe('extractConceptSets', () => {
  it('appends distinct concept sets that share the same name (different ids)', () => {
    // Two genuinely different concept sets that happen to carry the same name
    // (e.g. both still on the blank/default name the editor assigns).
    const csA: ConceptSetReference = { id: 1, name: '', items: [] }
    const csB: ConceptSetReference = { id: 2, name: '', items: [] }

    const entryEvents = [event('e1', csA)]
    const inclusionRules: InclusionRule[] = [
      {
        id: 'r1',
        name: 'Rule 1',
        criteriaGroups: [
          { id: 'g1', logicType: 'ALL', events: [event('e2', csB)] } as CriteriaGroup,
        ],
      } as InclusionRule,
    ]

    const result = extractConceptSets(entryEvents, undefined, inclusionRules, emptyExit, [])

    // Both concept sets must survive — the second must not override the first.
    expect(result.map(cs => cs.id).sort()).toEqual([1, 2])
  })

  it('deduplicates the same concept set referenced from multiple places (same id)', () => {
    const cs: ConceptSetReference = { id: 5, name: 'Diabetes', items: [] }
    const entryEvents = [event('e1', cs)]
    const inclusionRules: InclusionRule[] = [
      {
        id: 'r1',
        name: 'Rule 1',
        criteriaGroups: [
          { id: 'g1', logicType: 'ALL', events: [event('e2', cs)] } as CriteriaGroup,
        ],
      } as InclusionRule,
    ]

    const result = extractConceptSets(entryEvents, undefined, inclusionRules, emptyExit, [])

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe(5)
  })
})
