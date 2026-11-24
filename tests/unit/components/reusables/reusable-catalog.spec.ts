import { describe, it, expect } from 'vitest'
import {
  catalogKindFor,
  detachAll,
  detachUse,
  findEntry,
  findUses,
  fitsKind,
  getCriteriaUse,
  getGroupUse,
  importReusable,
  materialize,
  pruneCatalog,
  rematerializeUses,
  updateEntry,
} from '@/components/reusables/reusable-catalog'
import { asGroupCriterion, createEmptyDesign, createParameter } from '@/components/reusables/reusable-design'
import {
  CohortExpressionSchema,
  type CohortExpression,
  type ConceptSet,
  type Criteria,
  type CriteriaGroup,
} from '@/models/circe-types'
import type { ReusableDesign } from '@/models/reusable.types'

function conceptSet(id: number, name: string, conceptId = id + 100): ConceptSet {
  const concept = {
    CONCEPT_ID: conceptId,
    CONCEPT_NAME: name,
    STANDARD_CONCEPT_CAPTION: 'Standard',
    INVALID_REASON_CAPTION: 'Valid',
    CONCEPT_CODE: String(conceptId),
    DOMAIN_ID: 'Condition',
    VOCABULARY_ID: 'SNOMED',
  }
  return { id, name, expression: { items: [{ concept }] } } as ConceptSet
}

function singleEvent(codesetName = 'MI', conceptId = 4329847): ReusableDesign {
  const design = createEmptyDesign('INITIAL_EVENT')
  design.conceptSets = [conceptSet(0, codesetName, conceptId)]
  design.initialEventExpression.CriteriaList = [{ ConditionOccurrence: { CodesetId: 0 } }]
  return design
}

function groupDesign(): ReusableDesign {
  const design = createEmptyDesign('CRITERIA_GROUP')
  design.conceptSets = [conceptSet(0, 'Metformin', 1503297)]
  design.criteriaGroupExpression = {
    Type: 'ANY',
    CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0 } }, Occurrence: { Type: 2, Count: 1 } }],
    DemographicCriteriaList: [],
    Groups: [],
  }
  return design
}

function cohort(): CohortExpression {
  return {
    ConceptSets: [conceptSet(0, 'Other', 1)],
    PrimaryCriteria: { CriteriaList: [] },
    InclusionRules: [{ name: 'r', expression: { Type: 'ALL', CriteriaList: [], Groups: [] } }],
  }
}

/** A host over a cohort expression, as CohortBuilder provides one. */
function hostFor(expression: CohortExpression) {
  return {
    getConceptSets: () => expression.ConceptSets ?? [],
    addConceptSet: (cs: ConceptSet) => (expression.ConceptSets ??= []).push(cs),
  }
}

/** Inserts a reusable the way the "From Reusable" button does. */
function use(expression: CohortExpression, design: ReusableDesign, source = { Id: 12, Version: 3, Name: 'Prior MI' }) {
  const { kind, entry } = importReusable(expression, design, source)
  const host = hostFor(expression)
  const materialized = materialize(entry, kind, host.getConceptSets())
  materialized.conceptSets.forEach(host.addConceptSet)
  return { kind, entry, ...materialized }
}

describe('reusable catalog', () => {
  it('imports a single event as a criteria entry and a group as a group entry', () => {
    expect(catalogKindFor(singleEvent())).toBe('criteria')
    expect(catalogKindFor(groupDesign())).toBe('group')
    expect(fitsKind(singleEvent(), 'criteria')).toBe(true)
    expect(fitsKind(singleEvent(), 'group')).toBe(false)
    const parameterized = groupDesign()
    parameterized.parameters = [createParameter([])]
    expect(fitsKind(parameterized, 'group')).toBe(false)
  })

  it('keeps the reusable\'s logic and concept sets in its own id space in the entry', () => {
    const expression = cohort()
    use(expression, singleEvent())
    expect(expression.ReusableCriteria).toEqual([
      {
        Id: 1,
        RefId: 12,
        Version: 3,
        Name: 'Prior MI',
        ConceptSets: [conceptSet(0, 'MI', 4329847)],
        Criteria: { ConditionOccurrence: { CodesetId: 0 } },
      },
    ])
  })

  it('materializes a use inline with the cohort\'s concept set ids and a pointer to the entry', () => {
    const expression = cohort()
    const { criteria } = use(expression, singleEvent())
    expect(expression.ConceptSets?.map(cs => [cs.id, cs.name])).toEqual([
      [0, 'Other'],
      [1, 'MI'],
    ])
    expect(criteria).toEqual({ ConditionOccurrence: { CodesetId: 1, ReusableCriteriaRef: { Id: 1 } } })
    expect(getCriteriaUse(criteria!)).toEqual({ Id: 1 })
  })

  it('shares one entry between uses of the same reusable, and one copy of its concept sets', () => {
    const expression = cohort()
    const first = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(first.criteria!)
    // The repository has moved on, but the cohort keeps the version it holds.
    const second = use(expression, singleEvent('MI', 4329847), { Id: 12, Version: 5, Name: 'Prior MI' })
    expression.InclusionRules![0].expression!.CriteriaList!.push(asGroupCriterion(second.criteria!))

    expect(second.entry).toBe(first.entry)
    expect(expression.ReusableCriteria).toHaveLength(1)
    expect(expression.ReusableCriteria![0].Version).toBe(3)
    expect(expression.ConceptSets).toHaveLength(2)
    expect(findUses(expression, 'criteria', 1)).toHaveLength(2)
  })

  it('numbers entries across both lists, so a pointer never matches the wrong kind', () => {
    const expression = cohort()
    use(expression, singleEvent())
    const { entry, criteriaGroup } = use(expression, groupDesign(), { Id: 30, Version: 1, Name: 'Metformin' })
    expect(entry.Id).toBe(2)
    expect(getGroupUse(criteriaGroup!)).toEqual({ Id: 2 })
    expect(findEntry(expression, 'group', 2)?.Name).toBe('Metformin')
  })

  it('updates every use of an entry together', () => {
    const expression = cohort()
    const first = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(first.criteria!)
    const inRule = asGroupCriterion(use(expression, singleEvent()).criteria!)
    expression.InclusionRules![0].expression!.CriteriaList!.push(inRule)

    const next = singleEvent('MI broad', 4329848)
    next.initialEventExpression.CriteriaList = [{ ConditionOccurrence: { CodesetId: 0, First: true } }]
    const count = updateEntry(
      expression,
      'criteria',
      first.entry,
      next,
      { Id: 12, Version: 4, Name: 'Prior MI' },
      hostFor(expression)
    )

    expect(count).toBe(2)
    expect(expression.ReusableCriteria![0].Version).toBe(4)
    const expected = { ConditionOccurrence: { CodesetId: 2, First: true, ReusableCriteriaRef: { Id: 1 } } }
    expect(expression.PrimaryCriteria!.CriteriaList![0]).toEqual(expected)
    expect(inRule.Criteria).toEqual(expected)
    // The window and occurrence belong to the place the criterion is used.
    expect(inRule.Occurrence).toEqual({ Type: 2, Count: 1 })
    expect(expression.ConceptSets?.map(cs => cs.name)).toEqual(['Other', 'MI', 'MI broad'])
  })

  it('updates a group use in place, keeping the same object', () => {
    const expression = cohort()
    const { entry, criteriaGroup } = use(expression, groupDesign(), { Id: 30, Version: 1, Name: 'Metformin' })
    expression.InclusionRules![0].expression!.Groups!.push(criteriaGroup!)
    const next = groupDesign()
    next.criteriaGroupExpression.Type = 'ALL'
    updateEntry(expression, 'group', entry, next, { Id: 30, Version: 2, Name: 'Metformin' }, hostFor(expression))
    const group = expression.InclusionRules![0].expression!.Groups![0]
    expect(group).toBe(criteriaGroup)
    expect(group.Type).toBe('ALL')
    expect(getGroupUse(group)).toEqual({ Id: 1 })
  })

  it('rebuilds uses that were edited by hand from the entry', () => {
    const expression = cohort()
    const { entry, criteria } = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(criteria!)
    ;(expression.PrimaryCriteria!.CriteriaList![0].ConditionOccurrence as Record<string, unknown>).CodesetId = 0
    rematerializeUses(expression, 'criteria', entry, hostFor(expression))
    expect(expression.PrimaryCriteria!.CriteriaList![0]).toEqual({
      ConditionOccurrence: { CodesetId: 1, ReusableCriteriaRef: { Id: 1 } },
    })
  })

  it('does not count the reusable\'s own logic in the catalog as a use', () => {
    const expression = cohort()
    use(expression, singleEvent())
    expression.ReusableCriteria![0].Criteria = { ConditionOccurrence: { ReusableCriteriaRef: { Id: 1 } } }
    expect(findUses(expression, 'criteria', 1)).toEqual([])
  })

  it('detaches a use into a plain copy and drops entries nothing uses', () => {
    const expression = cohort()
    const { criteria } = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(criteria!)
    expect(pruneCatalog(expression)).toBe(0)

    detachUse(criteria as Criteria, 'criteria')
    expect(criteria).toEqual({ ConditionOccurrence: { CodesetId: 1 } })
    expect(pruneCatalog(expression)).toBe(1)
    expect(expression.ReusableCriteria).toBeUndefined()

    const group: CriteriaGroup = { Type: 'ALL', ReusableCriteriaGroupRef: { Id: 4 } }
    detachUse(group, 'group')
    expect(group).toEqual({ Type: 'ALL' })
  })

  it('drops only the entries nothing uses', () => {
    const expression = cohort()
    const kept = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(kept.criteria!)
    use(expression, singleEvent('Stroke', 443454), { Id: 20, Version: 1, Name: 'Stroke' })
    expect(expression.ReusableCriteria).toHaveLength(2)
    expect(pruneCatalog(expression)).toBe(1)
    expect(expression.ReusableCriteria?.map(e => e.RefId)).toEqual([12])
  })

  it('detaches every use and empties the catalog', () => {
    const expression = cohort()
    const single = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(single.criteria!)
    const group = use(expression, groupDesign(), { Id: 30, Version: 1, Name: 'Metformin' })
    expression.InclusionRules![0].expression!.Groups!.push(group.criteriaGroup!)

    expect(detachAll(expression)).toBe(2)
    expect(expression.ReusableCriteria).toBeUndefined()
    expect(expression.ReusableCriteriaGroups).toBeUndefined()
    expect(JSON.stringify(expression)).not.toContain('Reusable')
    expect(expression.PrimaryCriteria!.CriteriaList![0]).toEqual({ ConditionOccurrence: { CodesetId: 1 } })
  })

  it('leaves a catalog whose entries are all used untouched', () => {
    const expression = cohort()
    const { criteria } = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(criteria!)
    const before = expression.ReusableCriteria
    pruneCatalog(expression)
    expect(expression.ReusableCriteria).toBe(before)
  })

  it('keeps the catalog and the pointers through the cohort expression schema', () => {
    const expression = cohort()
    const single = use(expression, singleEvent())
    expression.PrimaryCriteria!.CriteriaList!.push(single.criteria!)
    const group = use(expression, groupDesign(), { Id: 30, Version: 1, Name: 'Metformin' })
    expression.InclusionRules![0].expression!.Groups!.push(group.criteriaGroup!)

    const parsed = CohortExpressionSchema.parse(JSON.parse(JSON.stringify(expression)))
    expect(parsed.ReusableCriteria).toEqual(expression.ReusableCriteria)
    expect(parsed.ReusableCriteriaGroups).toEqual(expression.ReusableCriteriaGroups)
    expect(parsed.PrimaryCriteria?.CriteriaList?.[0]).toEqual(single.criteria)
    expect(getGroupUse(parsed.InclusionRules![0].expression!.Groups![0])).toEqual({ Id: 2 })
  })
})
