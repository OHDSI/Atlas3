import { describe, it, expect } from 'vitest'
import {
  createEmptyDesign,
  createParameter,
  insertCriteriaGroup,
  instantiateReusable,
  nextParameterId,
  parseReusableDesign,
  removeConceptSet,
  removeParameter,
  renameParameter,
  serializeReusableDesign,
} from '@/components/reusables/reusable-design'
import type { ConceptSet, CriteriaGroup } from '@/models/circe-types'
import type { ReusableDesign } from '@/models/reusable.types'

function conceptSet(id: number, name = `CS ${id}`): ConceptSet {
  return { id, name, expression: { items: [] } }
}

/** What Atlas 2.x's ko.toJSON wrote for a criteria-group reusable with one parameter. */
const atlas2Data = JSON.stringify({
  type: 'CRITERIA_GROUP',
  parameters: [
    {
      id: 1,
      name: 'Drug',
      type: 'Concept Set',
      data: { id: -1, name: 'Drug', expression: { items: [] } },
    },
  ],
  conceptSets: [conceptSet(0, 'Diabetes')],
  criteriaGroupExpression: {
    Type: 'ALL',
    CriteriaList: [
      { Criteria: { ConditionOccurrence: { CodesetId: 0 } }, Occurrence: { Type: 2, Count: 1 } },
      { Criteria: { DrugExposure: { CodesetId: -1 } }, Occurrence: { Type: 2, Count: 1 } },
    ],
    DemographicCriteriaList: [],
    Groups: [],
  },
  initialEventExpression: { CriteriaList: [], ObservationWindow: { PriorDays: 0, PostDays: 0 } },
  censoringEventExpression: [],
})

describe('parseReusableDesign', () => {
  it('reads what Atlas 2.x saved', () => {
    const design = parseReusableDesign(atlas2Data)

    expect(design.type).toBe('CRITERIA_GROUP')
    expect(design.parameters).toEqual([
      { id: 1, name: 'Drug', type: 'Concept Set', data: { id: -1, name: 'Drug', expression: { items: [] } } },
    ])
    expect(design.conceptSets.map(cs => cs.name)).toEqual(['Diabetes'])
    expect(design.criteriaGroupExpression.CriteriaList).toHaveLength(2)
  })

  it('reads the early `expression` key as the criteria group', () => {
    const design = parseReusableDesign(JSON.stringify({ expression: { Type: 'ANY', CriteriaList: [] } }))

    expect(design.criteriaGroupExpression.Type).toBe('ANY')
    expect(design).not.toHaveProperty('expression')
  })

  it('treats a missing or unknown type as Criteria Group, as Atlas 2.x did', () => {
    expect(parseReusableDesign(JSON.stringify({})).type).toBe('CRITERIA_GROUP')
    expect(parseReusableDesign(JSON.stringify({ type: 'CENSORING_EVENT' })).type).toBe('CRITERIA_GROUP')
    expect(parseReusableDesign(JSON.stringify({ type: 'INITIAL_EVENT' })).type).toBe('INITIAL_EVENT')
  })

  it('falls back to an empty design for absent or malformed data', () => {
    expect(parseReusableDesign(null)).toEqual(createEmptyDesign())
    expect(parseReusableDesign('{not json')).toEqual(createEmptyDesign())
    expect(parseReusableDesign('[]')).toEqual(createEmptyDesign())
  })

  it('names an unnamed parameter and fixes its placeholder id', () => {
    const design = parseReusableDesign(JSON.stringify({ parameters: [{ id: 3 }, { name: 'no id' }] }))

    expect(design.parameters).toHaveLength(1)
    expect(design.parameters[0]).toMatchObject({ id: 3, name: 'Parameter 3', data: { id: -3, name: 'Parameter 3' } })
  })

  it('keeps keys it does not know through a round trip', () => {
    const data = JSON.stringify({ ...JSON.parse(atlas2Data), futureField: { a: 1 } })

    const reparsed = JSON.parse(serializeReusableDesign(parseReusableDesign(data)))

    expect(reparsed.futureField).toEqual({ a: 1 })
    expect(reparsed.criteriaGroupExpression).toEqual(JSON.parse(atlas2Data).criteriaGroupExpression)
    expect(reparsed.parameters).toEqual(JSON.parse(atlas2Data).parameters)
  })
})

describe('parameters', () => {
  it('numbers new parameters from the lowest free id, starting at 1', () => {
    expect(nextParameterId([])).toBe(1)
    const design = createEmptyDesign()
    design.parameters.push(createParameter(design.parameters))
    design.parameters.push(createParameter(design.parameters, 'Outcome'))
    design.parameters.push(createParameter(design.parameters))
    removeParameter(design, 2)

    const next = createParameter(design.parameters)
    expect(next).toEqual({
      id: 2,
      name: 'Parameter 2',
      type: 'Concept Set',
      data: { id: -2, name: 'Parameter 2', expression: { items: [] } },
    })
    expect(design.parameters.map(p => p.name)).toEqual(['Parameter 1', 'Parameter 3'])
  })

  it('renames the placeholder concept set along with the parameter', () => {
    const parameter = createParameter([])
    renameParameter(parameter, 'Exposure')
    expect(parameter.name).toBe('Exposure')
    expect(parameter.data.name).toBe('Exposure')
  })

  it('clears every reference to a removed parameter, in every section', () => {
    const design = parseReusableDesign(atlas2Data)
    design.initialEventExpression.CriteriaList = [{ DrugEra: { CodesetId: -1 } }]
    design.censoringEventExpression = [{ DrugExposure: { CodesetId: -1 } }]

    removeParameter(design, 1)

    expect(design.parameters).toEqual([])
    expect(design.criteriaGroupExpression.CriteriaList?.[1].Criteria).toEqual({ DrugExposure: { CodesetId: undefined } })
    expect(design.criteriaGroupExpression.CriteriaList?.[0].Criteria).toEqual({ ConditionOccurrence: { CodesetId: 0 } })
    expect(design.initialEventExpression.CriteriaList).toEqual([{ DrugEra: { CodesetId: undefined } }])
    expect(design.censoringEventExpression).toEqual([{ DrugExposure: { CodesetId: undefined } }])
  })

  it('clears references to a removed concept set', () => {
    const design = parseReusableDesign(atlas2Data)

    removeConceptSet(design, 0)

    expect(design.conceptSets).toEqual([])
    expect(design.criteriaGroupExpression.CriteriaList?.[0].Criteria).toEqual({ ConditionOccurrence: { CodesetId: undefined } })
  })
})

describe('instantiateReusable', () => {
  it('renumbers the reusable\'s concept sets after the host\'s and leaves unbound parameters open', () => {
    const design = parseReusableDesign(atlas2Data)
    const host = [conceptSet(0, 'Host A'), conceptSet(4, 'Host B')]

    const instance = instantiateReusable(design, host)

    expect(instance.conceptSets).toEqual([{ id: 5, name: 'Diabetes', expression: { items: [] } }])
    expect(instance.criteriaGroup?.CriteriaList?.map(c => c.Criteria)).toEqual([
      { ConditionOccurrence: { CodesetId: 5 } },
      { DrugExposure: { CodesetId: undefined } },
    ])
    // The reusable itself is untouched.
    expect(design.criteriaGroupExpression.CriteriaList?.[0].Criteria).toEqual({ ConditionOccurrence: { CodesetId: 0 } })
  })

  it('points a parameter at one of the host\'s own concept sets', () => {
    const design = parseReusableDesign(atlas2Data)

    const instance = instantiateReusable(design, [conceptSet(0), conceptSet(1, 'Metformin')], {
      1: { kind: 'existing', id: 1 },
    })

    expect(instance.conceptSets.map(cs => cs.id)).toEqual([2])
    expect(instance.criteriaGroup?.CriteriaList?.[1].Criteria).toEqual({ DrugExposure: { CodesetId: 1 } })
  })

  it('adds a concept set chosen for a parameter to the host', () => {
    const design = parseReusableDesign(atlas2Data)
    const chosen: ConceptSet = { name: 'Insulin', expression: { items: [] } }

    const instance = instantiateReusable(design, [], { 1: { kind: 'new', conceptSet: chosen } })

    expect(instance.conceptSets).toEqual([
      { id: 0, name: 'Diabetes', expression: { items: [] } },
      { id: 1, name: 'Insulin', expression: { items: [] } },
    ])
    expect(instance.criteriaGroup?.CriteriaList?.[1].Criteria).toEqual({ DrugExposure: { CodesetId: 1 } })
  })

  it('rewrites references Atlas 2.x missed: nested groups, correlated criteria and demographics', () => {
    const design = createEmptyDesign()
    design.conceptSets = [conceptSet(0, 'Race'), conceptSet(1, 'Visit')]
    design.criteriaGroupExpression = {
      Type: 'ANY',
      CriteriaList: [],
      DemographicCriteriaList: [{ RaceCS: { CodesetId: 0, IsExclusion: false } }],
      Groups: [
        {
          Type: 'ALL',
          CriteriaList: [
            {
              Criteria: {
                ConditionOccurrence: {
                  CodesetId: 1,
                  CorrelatedCriteria: {
                    Type: 'ALL',
                    CriteriaList: [{ Criteria: { VisitOccurrence: { CodesetId: 0 } } }],
                  },
                },
              },
            },
          ],
        },
      ],
    }

    const instance = instantiateReusable(design, [conceptSet(0), conceptSet(1), conceptSet(2)])
    const group = instance.criteriaGroup as CriteriaGroup

    expect(group.DemographicCriteriaList?.[0].RaceCS).toEqual({ CodesetId: 3, IsExclusion: false })
    const nested = group.Groups?.[0].CriteriaList?.[0].Criteria as {
      ConditionOccurrence: { CodesetId: number; CorrelatedCriteria: CriteriaGroup }
    }
    expect(nested.ConditionOccurrence.CodesetId).toBe(4)
    expect(nested.ConditionOccurrence.CorrelatedCriteria.CriteriaList?.[0].Criteria).toEqual({
      VisitOccurrence: { CodesetId: 3 },
    })
  })

  it('clears a reference to a concept set the reusable does not define', () => {
    const design = createEmptyDesign()
    design.criteriaGroupExpression.CriteriaList = [{ Criteria: { Measurement: { CodesetId: 7 } } }]

    const instance = instantiateReusable(design, [conceptSet(7, 'Unrelated host set')])

    expect(instance.criteriaGroup?.CriteriaList?.[0].Criteria).toEqual({ Measurement: { CodesetId: undefined } })
  })

  it('returns the events of an Initial/Censoring Event reusable', () => {
    const design: ReusableDesign = createEmptyDesign('INITIAL_EVENT')
    design.conceptSets = [conceptSet(0, 'MI')]
    design.parameters = [createParameter([])]
    design.initialEventExpression.CriteriaList = [
      { ConditionOccurrence: { CodesetId: 0 } },
      { ProcedureOccurrence: { CodesetId: -1 } },
    ]

    const instance = instantiateReusable(design, [conceptSet(0)])

    expect(instance.criteriaGroup).toBeUndefined()
    expect(instance.criteriaList).toEqual([
      { ConditionOccurrence: { CodesetId: 1 } },
      { ProcedureOccurrence: { CodesetId: undefined } },
    ])
  })
})

describe('insertCriteriaGroup', () => {
  const inserted = (): CriteriaGroup => ({
    Type: 'AT_LEAST',
    Count: 2,
    CriteriaList: [{ Criteria: { Death: {} } }],
    DemographicCriteriaList: [{}],
    Groups: [{ Type: 'ALL' }],
  })

  it('fills an empty group with the reusable\'s criteria and match type', () => {
    const target: CriteriaGroup = { Type: 'ALL', CriteriaList: [], Groups: [] }

    insertCriteriaGroup(target, inserted())

    expect(target).toEqual(inserted())
  })

  it('adds the reusable as a nested group when the target already has criteria', () => {
    const existing = { Criteria: { ConditionEra: {} } }
    const target: CriteriaGroup = { Type: 'ANY', CriteriaList: [existing] }

    insertCriteriaGroup(target, inserted())

    expect(target.Type).toBe('ANY')
    expect(target.CriteriaList).toEqual([existing])
    expect(target.Groups).toEqual([inserted()])
  })

  it('drops a stale count when the reusable has none', () => {
    const target: CriteriaGroup = { Type: 'AT_MOST', Count: 3 }

    insertCriteriaGroup(target, { Type: 'ALL', CriteriaList: [] })

    expect(target).toEqual({ Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] })
  })
})
