import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

/**
 * #112: nested (correlated) criteria are now a CriteriaGroup and can carry
 * sub-groups (nestedGroups). Those must survive the Atlas round-trip via
 * CorrelatedCriteria.Groups instead of being silently dropped.
 */
describe('atlas-converter: nested criteria sub-groups (#112)', () => {
  function cohortWithNestedGroup(): CohortDefinition {
    return {
      name: 'Nested group cohort',
      description: '',
      entryEvents: [
        {
          id: 'e1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: 1, name: 'CS1' },
          attributes: [],
          nestedCriteria: {
            id: 'n1',
            logicType: 'ALL',
            count: undefined,
            events: [
              { id: 'ne1', criteriaType: 'DrugExposure', conceptSet: { id: 2, name: 'CS2' }, attributes: [] },
            ],
            nestedGroups: [
              {
                id: 'g1',
                logicType: 'ANY',
                events: [
                  { id: 'ge1', criteriaType: 'ProcedureOccurrence', conceptSet: { id: 3, name: 'CS3' }, attributes: [] },
                ],
              },
            ],
          },
        },
      ],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [
        { id: 1, name: 'CS1', items: [] },
        { id: 2, name: 'CS2', items: [] },
        { id: 3, name: 'CS3', items: [] },
      ],
    }
  }

  it('serializes nested-criteria sub-groups to CorrelatedCriteria.Groups', () => {
    const atlas = convertInternalToAtlas(cohortWithNestedGroup())
    const cc = (atlas.PrimaryCriteria.CriteriaList[0] as Record<string, any>).CorrelatedCriteria
    expect(cc.Groups).toHaveLength(1)
    expect(cc.Groups[0].Type).toBe('ANY')
    expect(cc.Groups[0].CriteriaList).toHaveLength(1)
  })

  it('round-trips a nested criteria with a sub-group', () => {
    const atlas = convertInternalToAtlas(cohortWithNestedGroup())
    const back = convertAtlasToInternal(atlas)
    const nested = back.entryEvents?.[0]?.nestedCriteria
    expect(nested?.nestedGroups).toHaveLength(1)
    expect(nested?.nestedGroups?.[0].logicType).toBe('ANY')
    expect(nested?.nestedGroups?.[0].events).toHaveLength(1)
  })
})
