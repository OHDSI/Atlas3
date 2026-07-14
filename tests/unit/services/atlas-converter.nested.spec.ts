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
    const entry = atlas.PrimaryCriteria.CriteriaList[0] as Record<string, any>
    // CIRCE nests CorrelatedCriteria inside the criteria-type object
    // (ConditionOccurrence), not as a sibling of it — see #131.
    const cc = entry.ConditionOccurrence.CorrelatedCriteria
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

/**
 * #131: imported cohort definitions (e.g. from the phenotype library / legacy
 * ATLAS exports) place CorrelatedCriteria *inside* the criteria-type object
 * (Measurement.CorrelatedCriteria), not as a sibling of it. Reading it from
 * the wrong location silently dropped every entry event's nested criteria.
 */
describe('atlas-converter: legacy CIRCE CorrelatedCriteria placement (#131)', () => {
  function legacyAtlasJsonWithNestedEntryCriteria() {
    return {
      ConceptSets: [],
      PrimaryCriteria: {
        CriteriaList: [
          {
            Measurement: {
              CodesetId: 1,
              MeasurementTypeExclude: false,
              CorrelatedCriteria: {
                Type: 'AT_LEAST',
                Count: 1,
                CriteriaList: [
                  {
                    Criteria: { ConditionOccurrence: { CodesetId: 2, ConditionTypeExclude: false } },
                    StartWindow: { Start: { Days: 0, Coeff: -1 }, End: { Days: 365, Coeff: 1 } },
                    Occurrence: { Type: 2, Count: 1 },
                  },
                ],
                DemographicCriteriaList: [],
                Groups: [],
              },
            },
          },
        ],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'First' },
      },
      QualifiedLimit: { Type: 'First' },
      ExpressionLimit: { Type: 'First' },
      InclusionRules: [],
      CensorWindow: {},
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensoringCriteria: [],
    } as unknown as import('@/models/atlas.types').AtlasJSON
  }

  it('reads nested criteria that CIRCE places inside the criteria-type object', () => {
    const cohort = convertAtlasToInternal(legacyAtlasJsonWithNestedEntryCriteria())
    const nested = cohort.entryEvents?.[0]?.nestedCriteria
    expect(nested).toBeDefined()
    expect(nested?.logicType).toBe('AT_LEAST')
    expect(nested?.events).toHaveLength(1)
    expect(nested?.events[0].criteriaType).toBe('ConditionOccurrence')
  })

  it('does not lose nested entry-event criteria on an import/export round-trip', () => {
    const cohort = convertAtlasToInternal(legacyAtlasJsonWithNestedEntryCriteria())
    const reExported = convertInternalToAtlas(cohort as import('@/models/cohort.types').CohortDefinition)
    const entry = reExported.PrimaryCriteria.CriteriaList[0] as Record<string, any>
    expect(entry.Measurement.CorrelatedCriteria).toBeDefined()
    expect(entry.Measurement.CorrelatedCriteria.CriteriaList).toHaveLength(1)
    // Must not regress to the old (wrong) sibling placement.
    expect(entry.CorrelatedCriteria).toBeUndefined()
  })
})

describe('atlas-converter: DrugEra AgeAtStart attribute key', () => {
  it('round-trips DrugEra AgeAtStart without collapsing to Age', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: {
        CriteriaList: [
          { DrugEra: { CodesetId: 0, EraTypeExclude: false, AgeAtStart: { Op: 'gte', Value: 18 } } },
        ],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'All' },
      InclusionRules: [],
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as {
      PrimaryCriteria: { CriteriaList: Array<{ DrugEra: Record<string, unknown> }> }
    }
    const era = back.PrimaryCriteria.CriteriaList[0]!.DrugEra
    expect(era.AgeAtStart).toEqual({ Op: 'gte', Value: 18 })
    expect(era.Age).toBeUndefined()
  })
})

describe('atlas-converter: ObservationPeriod UserDefinedPeriod object shape', () => {
  it('round-trips ObservationPeriod UserDefinedPeriod object', () => {
    const atlas = {
      ConceptSets: [], PrimaryCriteria: {
        CriteriaList: [{ ObservationPeriod: { PeriodTypeExclude: false, UserDefinedPeriod: { StartDate: '2010-01-01', EndDate: '2010-12-31' } } }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' },
      },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' },
      InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ObservationPeriod: Record<string, unknown> }> } }
    expect(back.PrimaryCriteria.CriteriaList[0]!.ObservationPeriod.UserDefinedPeriod)
      .toEqual({ StartDate: '2010-01-01', EndDate: '2010-12-31' })
  })
})

describe('atlas-converter: AdditionalCriteria count, demographics, and nested groups', () => {
  it('round-trips AdditionalCriteria count, demographics, and nested groups', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' },
      },
      AdditionalCriteria: {
        Type: 'AT_LEAST', Count: 2,
        CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }, RestrictVisit: false, IgnoreObservationPeriod: false }],
        DemographicCriteriaList: [{ Age: { Op: 'gte', Value: 18 } }],
        Groups: [{ Type: 'ANY', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }, RestrictVisit: false, IgnoreObservationPeriod: false }], DemographicCriteriaList: [], Groups: [] }],
      },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' },
      InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { AdditionalCriteria: { Count?: number; DemographicCriteriaList: unknown[]; Groups: unknown[] } }
    expect(back.AdditionalCriteria.Count).toBe(2)
    expect(back.AdditionalCriteria.DemographicCriteriaList).toHaveLength(1)
    expect(back.AdditionalCriteria.Groups).toHaveLength(1)
  })
})

describe('atlas-converter: inclusion-rule expression wrapper group preservation', () => {
  it('preserves inclusion-rule expression Type and group count when direct list is empty', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' },
      InclusionRules: [{
        name: 'r',
        expression: {
          Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [],
          Groups: [
            { Type: 'ANY', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }, RestrictVisit: false, IgnoreObservationPeriod: false }], DemographicCriteriaList: [], Groups: [] },
            { Type: 'ALL', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }, RestrictVisit: false, IgnoreObservationPeriod: false }], DemographicCriteriaList: [], Groups: [] },
          ],
        },
      }],
      CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { InclusionRules: Array<{ expression: { Type: string; Groups: unknown[] } }> }
    expect(back.InclusionRules[0]!.expression.Type).toBe('ALL')
    expect(back.InclusionRules[0]!.expression.Groups).toHaveLength(2)
  })
})

describe('atlas-converter: EndWindow reference-point flag', () => {
  it('preserves EndWindow UseEventEnd when only the End bound is present', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ObservationPeriod: { PeriodTypeExclude: false, CorrelatedCriteria: { Type: 'ALL', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }, EndWindow: { End: { Days: 0, Coeff: 1 }, UseIndexEnd: false, UseEventEnd: true }, RestrictVisit: false, IgnoreObservationPeriod: false }], DemographicCriteriaList: [], Groups: [] } } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ObservationPeriod: { CorrelatedCriteria: { CriteriaList: Array<{ EndWindow: { UseEventEnd: boolean } }> } } }> } }
    const nested = back.PrimaryCriteria.CriteriaList[0]!.ObservationPeriod.CorrelatedCriteria.CriteriaList[0]!
    expect(nested.EndWindow.UseEventEnd).toBe(true)
  })

  it('round-trips a window with both UseIndexEnd and UseEventEnd true', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ObservationPeriod: { PeriodTypeExclude: false, CorrelatedCriteria: { Type: 'ALL', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0, DrugTypeExclude: false } }, StartWindow: { Start: { Coeff: -1 }, End: { Days: 0, Coeff: 1 }, UseIndexEnd: true, UseEventEnd: true }, RestrictVisit: false, IgnoreObservationPeriod: false }], DemographicCriteriaList: [], Groups: [] } } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ObservationPeriod: { CorrelatedCriteria: { CriteriaList: Array<{ StartWindow: { UseIndexEnd: boolean; UseEventEnd: boolean } }> } } }> } }
    const w = back.PrimaryCriteria.CriteriaList[0]!.ObservationPeriod.CorrelatedCriteria.CriteriaList[0]!.StartWindow
    expect(w.UseIndexEnd).toBe(true)
    expect(w.UseEventEnd).toBe(true)
  })
})

describe('atlas-converter: source concept alongside codeset', () => {
  it('emits both CodesetId and VisitSourceConcept when both are set', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ VisitOccurrence: { CodesetId: 0, VisitTypeExclude: false, VisitSourceConcept: 8 } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ VisitOccurrence: Record<string, unknown> }> } }
    const v = back.PrimaryCriteria.CriteriaList[0]!.VisitOccurrence
    expect(v.CodesetId).toBe(0)
    expect(v.VisitSourceConcept).toBe(8)
  })
})

describe('atlas-converter: bare type-exclude flag', () => {
  it('round-trips a bare ConditionTypeExclude flag', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: true } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> } }
    expect(back.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(true)
  })

  it('exports false for a normal criterion with no type-exclude signal', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } }], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'All' } },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> } }
    expect(back.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(false)
  })

  it('lets a type-concept attribute isExclusion win over the bare-flag default', () => {
    const atlas = {
      ConceptSets: [{ id: 0, name: 'x', expression: { items: [] } }],
      PrimaryCriteria: {
        CriteriaList: [
          {
            ConditionOccurrence: {
              CodesetId: 0,
              ConditionTypeExclude: true,
              ConditionType: [{ CONCEPT_ID: 44786627, CONCEPT_NAME: 'Primary Condition' }],
              ConditionTypeCS: [],
            },
          },
        ],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
      QualifiedLimit: { Type: 'All' }, ExpressionLimit: { Type: 'All' }, InclusionRules: [], CensoringCriteria: [], CollapseSettings: { CollapseType: 'ERA', EraPad: 0 }, CensorWindow: {},
    }
    const internal = convertAtlasToInternal(atlas as never)
    const back = convertInternalToAtlas(internal as never) as never as { PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> } }
    expect(back.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(true)
  })

  // Task-7 follow-up: the test above round-trips through convertAtlasToInternal
  // first, so event.typeExclude and the ConceptAttribute's isExclusion both end
  // up derived from the same ConditionTypeExclude field — agreement there
  // doesn't prove anything about ordering. Build the internal event directly
  // with genuinely decoupled inputs (event.typeExclude: false, attribute
  // isExclusion: true) to confirm the attribute-derived exclusion still wins.
  it('lets a type-concept attribute isExclusion win over a decoupled event.typeExclude default', () => {
    const cohort: CohortDefinition = {
      name: 'Decoupled type-exclude cohort',
      description: '',
      conceptSets: [],
      entryEvents: [
        {
          id: 'e1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: 0, name: 'x' },
          typeExclude: false,
          attributes: [
            {
              type: 'concept',
              attributeKey: 'conditionType',
              concepts: [{ CONCEPT_ID: 44786627, CONCEPT_NAME: 'Primary Condition' }],
              isExclusion: true,
            },
          ],
        },
      ],
      qualifyingLimit: 'ALL',
      expressionLimit: 'ALL',
      inclusionRules: [],
    } as unknown as CohortDefinition

    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> }
    }
    expect(atlas.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(true)
  })

  // Review finding: convertAttributeToAtlas's concept branch only ever writes
  // `*Exclude: true`, never `false` — so a type-concept attribute with
  // isExclusion: false could not override a stale event.typeExclude: true
  // default, and the UI hides the bare toggle whenever that attribute is
  // present, making the resulting `true` invisible and unfixable.
  it('lets a type-concept attribute isExclusion:false override a stale event.typeExclude:true default', () => {
    const cohort: CohortDefinition = {
      name: 'Stale type-exclude cohort',
      description: '',
      conceptSets: [],
      entryEvents: [
        {
          id: 'e1',
          criteriaType: 'ConditionOccurrence',
          conceptSet: { id: 0, name: 'x' },
          typeExclude: true,
          attributes: [
            {
              type: 'concept',
              attributeKey: 'conditionType',
              concepts: [{ CONCEPT_ID: 44786627, CONCEPT_NAME: 'Primary Condition' }],
              isExclusion: false,
            },
          ],
        },
      ],
      qualifyingLimit: 'ALL',
      expressionLimit: 'ALL',
      inclusionRules: [],
    } as unknown as CohortDefinition

    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> }
    }
    expect(atlas.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(false)
  })
})
