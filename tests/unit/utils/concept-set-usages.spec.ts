import { describe, it, expect } from 'vitest'
import { updateConceptSetUsages, clearConceptSetUsages } from '@/utils/concept-set-usages'
import type {
  CohortEvent,
  CriteriaGroup,
  ExitCriteria,
  InclusionRule,
} from '@/models/cohort.types'

function event(id: string, conceptSetId?: number | string): CohortEvent {
  return {
    id,
    criteriaType: 'ConditionOccurrence',
    ...(conceptSetId !== undefined
      ? { conceptSet: { id: conceptSetId, name: 'Old', items: [{ conceptId: 1 }] } }
      : {}),
  }
}

const updated = { id: 7, name: 'Updated', items: [{ conceptId: 42 }] }

describe('updateConceptSetUsages', () => {
  it('updates matching usages across all cohort locations and returns the count', () => {
    const nested: CriteriaGroup = {
      id: 'g-nested',
      logicType: 'ALL',
      events: [event('evt-nested', 7)],
      nestedGroups: [
        { id: 'g-deep', logicType: 'ANY', events: [event('evt-deep', 7)] },
      ],
    }
    const cohort = {
      entryEvents: [
        { ...event('evt-1', 7), nestedCriteria: nested },
        event('evt-2', 8),
      ],
      additionalCriteria: {
        id: 'g-add',
        logicType: 'ALL',
        events: [event('evt-add', 7)],
      } as CriteriaGroup,
      inclusionRules: [
        {
          id: 'rule-1',
          name: 'r',
          criteriaGroups: [
            { id: 'g-rule', logicType: 'ALL', events: [event('evt-rule', 7)] },
          ],
        },
      ] as InclusionRule[],
      exitCriteria: {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 7, name: 'Old', items: [] },
        censoringEvents: [event('evt-censor-exit', 7)],
      } as ExitCriteria,
      censoringCriteria: [event('evt-censor', 7)],
    }

    const count = updateConceptSetUsages(cohort, updated)

    expect(count).toBe(8)
    expect(cohort.entryEvents[0]!.conceptSet).toEqual(updated)
    expect(cohort.entryEvents[0]!.nestedCriteria!.events[0]!.conceptSet).toEqual(updated)
    expect(cohort.entryEvents[0]!.nestedCriteria!.nestedGroups![0]!.events[0]!.conceptSet).toEqual(
      updated
    )
    expect(cohort.additionalCriteria.events[0]!.conceptSet).toEqual(updated)
    expect(cohort.inclusionRules[0]!.criteriaGroups[0]!.events[0]!.conceptSet).toEqual(updated)
    expect(cohort.exitCriteria.conceptSet).toEqual(updated)
    expect(cohort.exitCriteria.censoringEvents![0]!.conceptSet).toEqual(updated)
    expect(cohort.censoringCriteria[0]!.conceptSet).toEqual(updated)
  })

  it('leaves non-matching usages untouched', () => {
    const cohort = {
      entryEvents: [event('evt-1', 8)],
      inclusionRules: [],
    }
    const count = updateConceptSetUsages(cohort, updated)
    expect(count).toBe(0)
    expect(cohort.entryEvents[0]!.conceptSet).toEqual({
      id: 8,
      name: 'Old',
      items: [{ conceptId: 1 }],
    })
  })

  it('updates only the name on concept-set attributes', () => {
    const cohort = {
      entryEvents: [
        {
          ...event('evt-1'),
          attributes: [
            {
              type: 'conceptSet' as const,
              attributeKey: 'providerSpecialty' as never,
              conceptSet: { id: 7, name: 'Old' },
              isExclusion: true,
            },
          ],
        },
      ],
      inclusionRules: [],
    }
    const count = updateConceptSetUsages(cohort, updated)
    expect(count).toBe(1)
    expect(cohort.entryEvents[0]!.attributes![0]).toEqual({
      type: 'conceptSet',
      attributeKey: 'providerSpecialty',
      conceptSet: { id: 7, name: 'Updated' },
      isExclusion: true,
    })
  })

  it('treats id 0 as a real concept set id', () => {
    const cohort = {
      entryEvents: [event('evt-1', 0)],
      inclusionRules: [],
    }
    const count = updateConceptSetUsages(cohort, { id: 0, name: 'Zero', items: [] })
    expect(count).toBe(1)
    expect(cohort.entryEvents[0]!.conceptSet).toEqual({ id: 0, name: 'Zero', items: [] })
  })

  it('replaces usages with independent copies, not a shared reference', () => {
    const cohort = {
      entryEvents: [event('evt-1', 7), event('evt-2', 7)],
      inclusionRules: [],
    }
    updateConceptSetUsages(cohort, updated)
    expect(cohort.entryEvents[0]!.conceptSet).not.toBe(cohort.entryEvents[1]!.conceptSet)
  })
})

describe('clearConceptSetUsages', () => {
  it('clears matching usages across all cohort locations including nested structures and attributes, returning accurate count', () => {
    // Setup nested structure with multiple levels
    const nestedGroup: CriteriaGroup = {
      id: 'g-nested',
      logicType: 'ALL',
      events: [event('evt-nested', 7)],
      nestedGroups: [
        { id: 'g-deep', logicType: 'ANY', events: [event('evt-deep', 7)] },
      ],
    }

    const cohort = {
      entryEvents: [
        { ...event('evt-1', 7), nestedCriteria: nestedGroup },
        event('evt-2', 8), // Non-matching
      ],
      additionalCriteria: {
        id: 'g-add',
        logicType: 'ALL',
        events: [event('evt-add', 7)],
      } as CriteriaGroup,
      inclusionRules: [
        {
          id: 'rule-1',
          name: 'r',
          criteriaGroups: [
            { id: 'g-rule', logicType: 'ALL', events: [event('evt-rule', 7)] },
          ],
        },
      ] as InclusionRule[],
      exitCriteria: {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 7, name: 'ToDelete', items: [] },
        censoringEvents: [
          {
            ...event('evt-censor-exit'),
            attributes: [
              {
                type: 'conceptSet' as const,
                attributeKey: 'providerSpecialty' as never,
                conceptSet: { id: 7, name: 'ToDelete' },
                isExclusion: false,
              },
            ],
          },
        ],
      } as ExitCriteria,
      censoringCriteria: [event('evt-censor', 7)],
    }

    const count = clearConceptSetUsages(cohort, 7)

    // Verify count: 1 (evt-1) + 1 (nested) + 1 (deep) + 1 (add) + 1 (rule) + 1 (exit conceptSet) + 1 (exit attribute) + 1 (censor) = 8
    expect(count).toBe(8)

    // Verify conceptSet properties are cleared
    expect(cohort.entryEvents[0]!.conceptSet).toBeUndefined()
    expect(cohort.entryEvents[0]!.nestedCriteria!.events[0]!.conceptSet).toBeUndefined()
    expect(cohort.entryEvents[0]!.nestedCriteria!.nestedGroups![0]!.events[0]!.conceptSet).toBeUndefined()
    expect(cohort.additionalCriteria.events[0]!.conceptSet).toBeUndefined()
    expect(cohort.inclusionRules[0]!.criteriaGroups[0]!.events[0]!.conceptSet).toBeUndefined()
    expect(cohort.exitCriteria.conceptSet).toBeUndefined()
    expect(cohort.exitCriteria.censoringEvents![0]!.conceptSet).toBeUndefined()
    expect(cohort.censoringCriteria[0]!.conceptSet).toBeUndefined()

    // Verify concept set attributes are removed
    expect(cohort.exitCriteria.censoringEvents![0]!.attributes).toHaveLength(0)

    // Verify non-matching ID is untouched
    expect(cohort.entryEvents[1]!.conceptSet).toEqual({
      id: 8,
      name: 'Old',
      items: [{ conceptId: 1 }],
    })
  })

  it('clears only matching IDs and leaves non-matching IDs intact', () => {
    const cohort = {
      entryEvents: [
        event('evt-1', 7),
        event('evt-2', 8),
        event('evt-3', 7),
      ],
      inclusionRules: [],
    }

    const count = clearConceptSetUsages(cohort, 7)

    expect(count).toBe(2)
    expect(cohort.entryEvents[0]!.conceptSet).toBeUndefined()
    expect(cohort.entryEvents[1]!.conceptSet).toEqual({
      id: 8,
      name: 'Old',
      items: [{ conceptId: 1 }],
    })
    expect(cohort.entryEvents[2]!.conceptSet).toBeUndefined()
  })

  it('handles clearing id 0 correctly', () => {
    const cohort = {
      entryEvents: [
        event('evt-1', 0),
        event('evt-2', 1),
      ],
      inclusionRules: [],
    }

    const count = clearConceptSetUsages(cohort, 0)

    expect(count).toBe(1)
    expect(cohort.entryEvents[0]!.conceptSet).toBeUndefined()
    expect(cohort.entryEvents[1]!.conceptSet).toEqual({
      id: 1,
      name: 'Old',
      items: [{ conceptId: 1 }],
    })
  })

  it('clears concept set attributes along with event conceptSets', () => {
    const cohort = {
      entryEvents: [
        {
          ...event('evt-1'),
          conceptSet: { id: 7, name: 'ToDelete' },
          attributes: [
            {
              type: 'conceptSet' as const,
              attributeKey: 'specialty' as never,
              conceptSet: { id: 7, name: 'ToDelete' },
              isExclusion: false,
            },
            {
              type: 'conceptSet' as const,
              attributeKey: 'role' as never,
              conceptSet: { id: 8, name: 'KeepThis' },
              isExclusion: false,
            },
          ],
        },
      ],
      inclusionRules: [],
    }

    const count = clearConceptSetUsages(cohort, 7)

    // 1 for conceptSet + 1 for removed attribute = 2
    expect(count).toBe(2)
    expect(cohort.entryEvents[0]!.conceptSet).toBeUndefined()
    expect(cohort.entryEvents[0]!.attributes).toHaveLength(1)
    expect(cohort.entryEvents[0]!.attributes![0]!.conceptSet.id).toBe(8)
  })
})
