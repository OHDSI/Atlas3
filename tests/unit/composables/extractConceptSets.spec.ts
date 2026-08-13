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

  it('finds a concept set that is only referenced inside a nested/correlated criteria group (#205)', () => {
    const cs: ConceptSetReference = { id: 7, name: 'Nested Only', items: [] }
    const nestedEvent = event('nested-e1', cs)
    const outerEvent: CohortEvent = {
      ...event('e1'),
      nestedCriteria: { id: 'g-nested', logicType: 'ALL', events: [nestedEvent] } as CriteriaGroup,
    }

    const result = extractConceptSets([outerEvent], undefined, [], emptyExit, [])

    expect(result.map(r => r.id)).toEqual([7])
  })

  it('finds a concept set that is only referenced through a conceptSet-type attribute (#205)', () => {
    const cs: ConceptSetReference = { id: 8, name: 'Visit Type CS', items: [] }
    const eventWithAttribute: CohortEvent = {
      ...event('e1'),
      attributes: [{ type: 'conceptSet', conceptSet: cs } as CohortEvent['attributes'][number]],
    }

    const result = extractConceptSets([eventWithAttribute], undefined, [], emptyExit, [])

    expect(result.map(r => r.id)).toEqual([8])
  })

  it('finds a concept set nested inside additional criteria and inclusion rule sub-groups (#205)', () => {
    const csAdditional: ConceptSetReference = { id: 9, name: 'Additional Nested', items: [] }
    const csInclusion: ConceptSetReference = { id: 10, name: 'Inclusion Nested', items: [] }

    const additionalCriteria: CriteriaGroup = {
      id: 'ac',
      logicType: 'ALL',
      events: [],
      nestedGroups: [{ id: 'ac-nested', logicType: 'ALL', events: [event('ae1', csAdditional)] } as CriteriaGroup],
    } as CriteriaGroup

    const inclusionRules: InclusionRule[] = [
      {
        id: 'r1',
        name: 'Rule 1',
        criteriaGroups: [
          {
            id: 'g1',
            logicType: 'ALL',
            events: [],
            nestedGroups: [{ id: 'g1-nested', logicType: 'ALL', events: [event('ie1', csInclusion)] } as CriteriaGroup],
          } as CriteriaGroup,
        ],
      } as InclusionRule,
    ]

    const result = extractConceptSets([], additionalCriteria, inclusionRules, emptyExit, [])

    expect((result.map(r => r.id) as number[]).sort((a, b) => a - b)).toEqual([9, 10])
  })
})
