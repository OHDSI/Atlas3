import { describe, it, expect } from 'vitest'
import { updateConceptSetUsages } from '@/utils/concept-set-usages'
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
