/**
 * The six cohort proposal kinds translate.ts emits that applyProposal used to
 * refuse outright. Field names and defaults come from circe-be
 * (CohortExpression, ResultLimit, Period, CollapseSettings, CorelatedCriteria,
 * Window, Occurrence) and from ATLAS 2.15's matching knockout models.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { useCohortStore } from '@/stores/cohort'
import type { AgentProposal } from '@/models/agent.types'
import { CohortExpressionSchema, type CohortExpression } from '@/components/cohort-editor/circe.types'

function openCohort(expression: CohortExpression = {}) {
  const store = useCohortStore()
  store.setCohort({ name: 'Test' })
  store.attachExpression(ref(expression))
  store.markClean()
  return store
}

function parsed(store: ReturnType<typeof useCohortStore>) {
  const result = CohortExpressionSchema.safeParse(store.currentCohort?.expression)
  expect(result.success, JSON.stringify('error' in result ? result.error.issues : [])).toBe(true)
  return result.success ? result.data : ({} as CohortExpression)
}

describe('applyProposal: setEventLimits', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restricts entry to the first qualifying event', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'setEventLimits',
        limits: { primaryCriteriaLimit: 'FIRST' },
      } as AgentProposal)
    ).toEqual({ applied: true })

    expect(parsed(store).PrimaryCriteria?.PrimaryCriteriaLimit?.Type).toBe('First')
    expect(store.isDirty).toBe(true)
  })

  it('sets the qualifying and inclusion-rule limits on the expression root', () => {
    const store = openCohort()

    store.applyProposal({
      kind: 'setEventLimits',
      limits: { qualifyingLimit: 'LAST', inclusionQualifyingLimit: 'ALL' },
    } as AgentProposal)

    const expr = parsed(store)
    expect(expr.QualifiedLimit?.Type).toBe('Last')
    expect(expr.ExpressionLimit?.Type).toBe('All')
  })

  it('leaves the limits it was not given alone', () => {
    const store = openCohort()

    store.applyProposal({
      kind: 'setEventLimits',
      limits: { primaryCriteriaLimit: 'FIRST' },
    } as AgentProposal)

    const expr = parsed(store)
    expect(expr.QualifiedLimit).toBeUndefined()
    expect(expr.ExpressionLimit).toBeUndefined()
  })

  it('keeps the entry criteria when it creates PrimaryCriteria.PrimaryCriteriaLimit', () => {
    const store = openCohort({
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }] },
    })

    store.applyProposal({
      kind: 'setEventLimits',
      limits: { primaryCriteriaLimit: 'LAST' },
    } as AgentProposal)

    expect(parsed(store).PrimaryCriteria?.CriteriaList).toHaveLength(1)
  })

  it('refuses a proposal that names no limit rather than reporting a change', () => {
    const store = openCohort()

    expect(
      store.applyProposal({ kind: 'setEventLimits', limits: {} } as AgentProposal)
    ).toMatchObject({ applied: false })
    expect(store.isDirty).toBe(false)
  })
})

describe('applyProposal: setCensorWindow', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('bounds the study period', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'setCensorWindow',
        censorWindow: { startDate: '2015-01-01', endDate: '2019-12-31' },
      } as AgentProposal)
    ).toEqual({ applied: true })

    expect(parsed(store).CensorWindow).toEqual({
      StartDate: '2015-01-01',
      EndDate: '2019-12-31',
    })
    expect(store.isDirty).toBe(true)
  })

  it('leaves the unbounded end open rather than writing a null date', () => {
    const store = openCohort()

    store.applyProposal({
      kind: 'setCensorWindow',
      censorWindow: { startDate: '2015-01-01', endDate: null },
    } as AgentProposal)

    expect(parsed(store).CensorWindow).toEqual({ StartDate: '2015-01-01' })
  })

  it('replaces an existing window instead of merging into it', () => {
    const store = openCohort({ CensorWindow: { StartDate: '2001-01-01', EndDate: '2002-01-01' } })

    store.applyProposal({
      kind: 'setCensorWindow',
      censorWindow: { startDate: null, endDate: '2019-12-31' },
    } as AgentProposal)

    expect(parsed(store).CensorWindow).toEqual({ EndDate: '2019-12-31' })
  })

  it('refuses a window with neither bound', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'setCensorWindow',
        censorWindow: { startDate: null, endDate: null },
      } as AgentProposal)
    ).toMatchObject({ applied: false })
    expect(store.isDirty).toBe(false)
  })
})

describe('applyProposal: setEraCollapse', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('merges brief gaps in follow-up', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'setEraCollapse',
        collapseSettings: { collapseType: 'ERA', eraPad: 30 },
      } as AgentProposal)
    ).toEqual({ applied: true })

    expect(parsed(store).CollapseSettings).toEqual({ CollapseType: 'ERA', EraPad: 30 })
    expect(store.isDirty).toBe(true)
  })

  it('refuses a collapse type circe has no rule for', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'setEraCollapse',
        collapseSettings: { collapseType: 'WEEKLY', eraPad: 7 },
      } as AgentProposal)
    ).toMatchObject({ applied: false })
    expect(parsed(store).CollapseSettings).toBeUndefined()
    expect(store.isDirty).toBe(false)
  })
})

describe('applyProposal: addQualifyingCriterion', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('restricts the entry event rather than adding another one', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'addQualifyingCriterion',
        event: { id: 'q1', criteriaType: 'DrugExposure' },
      } as never)
    ).toEqual({ applied: true })

    const expr = parsed(store)
    expect(expr.AdditionalCriteria?.CriteriaList).toHaveLength(1)
    expect(expr.PrimaryCriteria?.CriteriaList ?? []).toHaveLength(0)
    expect(store.isDirty).toBe(true)
  })

  it('carries the ATLAS defaults: at least one occurrence, anytime relative to index', () => {
    const store = openCohort()

    store.applyProposal({
      kind: 'addQualifyingCriterion',
      event: { id: 'q1', criteriaType: 'DrugExposure' },
    } as never)

    const group = parsed(store).AdditionalCriteria
    expect(group?.Type).toBe('ALL')
    expect(group?.CriteriaList?.[0]).toEqual({
      Criteria: { DrugExposure: {} },
      StartWindow: {
        Start: { Days: null, Coeff: -1 },
        End: { Days: null, Coeff: 1 },
        UseIndexEnd: false,
        UseEventEnd: false,
      },
      Occurrence: { Type: 2, Count: 1 },
      RestrictVisit: false,
      IgnoreObservationPeriod: false,
    })
  })

  it('appends to the existing group instead of replacing it', () => {
    const store = openCohort()

    store.applyProposal({
      kind: 'addQualifyingCriterion',
      event: { id: 'q1', criteriaType: 'DrugExposure' },
    } as never)
    store.applyProposal({
      kind: 'addQualifyingCriterion',
      event: { id: 'q2', criteriaType: 'ConditionOccurrence' },
    } as never)

    expect(parsed(store).AdditionalCriteria?.CriteriaList).toHaveLength(2)
  })

  it('refuses a demographic qualifier rather than dropping it silently', () => {
    const store = openCohort()

    expect(
      store.applyProposal({
        kind: 'addQualifyingCriterion',
        event: { id: 'q1', criteriaType: 'Demographic' },
      } as never)
    ).toMatchObject({ applied: false })
    expect(store.isDirty).toBe(false)
  })
})

describe('applyProposal: removeInclusionRule', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const twoRules = (): CohortExpression => ({
    InclusionRules: [
      { name: 'Osteoarthritis before index' },
      { name: 'Exclude prior GI bleed' },
    ],
  })

  it('drops the named rule and leaves the rest', () => {
    const store = openCohort(twoRules())

    expect(
      store.applyProposal({
        kind: 'removeInclusionRule',
        match: { name: 'Exclude prior GI bleed' },
      } as AgentProposal)
    ).toEqual({ applied: true })

    const rules = parsed(store).InclusionRules
    expect(rules).toHaveLength(1)
    expect(rules?.[0].name).toBe('Osteoarthritis before index')
    expect(store.isDirty).toBe(true)
  })

  it('drops every rule sharing the name, since circe rules are not uniquely keyed', () => {
    const store = openCohort({
      InclusionRules: [{ name: 'Dup' }, { name: 'Keep' }, { name: 'Dup' }],
    })

    store.applyProposal({
      kind: 'removeInclusionRule',
      match: { name: 'Dup' },
    } as AgentProposal)

    expect(parsed(store).InclusionRules?.map(r => r.name)).toEqual(['Keep'])
  })

  it('reports a miss rather than a change when no rule has that name', () => {
    const store = openCohort(twoRules())

    expect(
      store.applyProposal({
        kind: 'removeInclusionRule',
        match: { name: 'no such rule' },
      } as AgentProposal)
    ).toEqual({ applied: false, reason: 'no-match' })
    expect(parsed(store).InclusionRules).toHaveLength(2)
    expect(store.isDirty).toBe(false)
  })

  it('refuses an id-only match, which a circe inclusion rule cannot carry', () => {
    const store = openCohort(twoRules())

    expect(
      store.applyProposal({
        kind: 'removeInclusionRule',
        match: { id: 1 },
      } as AgentProposal)
    ).toEqual({ applied: false, reason: 'unsupported-kind' })
    expect(parsed(store).InclusionRules).toHaveLength(2)
  })
})

describe('applyProposal: removeEntryEvent', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // A criterion names a concept only through its CodesetId, so the match has to
  // travel CriteriaList -> CodesetId -> ConceptSets -> items -> CONCEPT_ID.
  const twoEntryEvents = (): CohortExpression => ({
    ConceptSets: [
      {
        id: 0,
        name: 'Viral sinusitis',
        expression: { items: [{ concept: { CONCEPT_ID: 40481087, CONCEPT_NAME: 'Viral sinusitis' } }] },
      },
      {
        id: 1,
        name: 'Ibuprofen',
        expression: { items: [{ concept: { CONCEPT_ID: 1177480, CONCEPT_NAME: 'Ibuprofen' } }] },
      },
    ],
    PrimaryCriteria: {
      CriteriaList: [
        { ConditionOccurrence: { CodesetId: 0 } },
        { DrugExposure: { CodesetId: 1 } },
      ],
    },
  })

  it('drops the entry event built from that concept', () => {
    const store = openCohort(twoEntryEvents())

    expect(
      store.applyProposal({
        kind: 'removeEntryEvent',
        match: { conceptId: 1177480 },
      } as AgentProposal)
    ).toEqual({ applied: true })

    const list = parsed(store).PrimaryCriteria?.CriteriaList as Array<Record<string, unknown>>
    expect(list).toHaveLength(1)
    expect(Object.keys(list[0])).toEqual(['ConditionOccurrence'])
    expect(store.isDirty).toBe(true)
  })

  it('matches on concept name too, ignoring case', () => {
    const store = openCohort(twoEntryEvents())

    store.applyProposal({
      kind: 'removeEntryEvent',
      match: { conceptName: 'ibuprofen' },
    } as AgentProposal)

    const list = parsed(store).PrimaryCriteria?.CriteriaList as Array<Record<string, unknown>>
    expect(list).toHaveLength(1)
    expect(Object.keys(list[0])).toEqual(['ConditionOccurrence'])
  })

  it('leaves the concept set behind, since other criteria may still reference it', () => {
    const store = openCohort(twoEntryEvents())

    store.applyProposal({
      kind: 'removeEntryEvent',
      match: { conceptId: 1177480 },
    } as AgentProposal)

    expect(parsed(store).ConceptSets).toHaveLength(2)
  })

  it('reports a miss rather than a change when nothing references that concept', () => {
    const store = openCohort(twoEntryEvents())

    expect(
      store.applyProposal({
        kind: 'removeEntryEvent',
        match: { conceptId: 999999 },
      } as AgentProposal)
    ).toEqual({ applied: false, reason: 'no-match' })
    expect(parsed(store).PrimaryCriteria?.CriteriaList).toHaveLength(2)
    expect(store.isDirty).toBe(false)
  })

  it('reports a miss when the entry event carries no codeset to match on', () => {
    const store = openCohort({
      PrimaryCriteria: { CriteriaList: [{ ConditionOccurrence: {} }] },
    })

    expect(
      store.applyProposal({
        kind: 'removeEntryEvent',
        match: { conceptId: 40481087 },
      } as AgentProposal)
    ).toEqual({ applied: false, reason: 'no-match' })
  })
})
