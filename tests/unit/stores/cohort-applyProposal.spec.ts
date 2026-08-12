import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { AgentProposal } from '@/models/agent.types'
import { CohortExpressionSchema } from '@/components/cohort-editor/circe.types'

// T13 (src/stores/cohort.ts:97): every applyProposal mutation early-returns
// when currentCohort has no expression, but createNewCohort() (line 86) never
// creates one -- so a proposal applied to a freshly-created cohort is a silent
// no-op while apply.ts still reports `{applied: true}`. Seed one here to match
// what the mounted CohortBuilder would already have provided by the time an
// agent proposal arrives, so these tests can exercise the criteria-mutation
// logic instead of uniformly hitting this guard.
function newCohort() {
  const store = useCohortStore()
  store.createNewCohort()
  store.currentCohort!.expression = {}
  return store
}

describe('useCohortStore.applyProposal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is a no-op when no cohort exists (expression is absent)', () => {
    const store = useCohortStore()
    expect(store.currentCohort).toBeNull()

    store.applyProposal({
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'ConditionOccurrence' } as never,
    })
    // pythiaBridge is responsible for creating a cohort first; the store does not.
    expect(store.currentCohort).toBeNull()
  })

  it('addEntryEvent pushes a ConditionOccurrence wrapper to PrimaryCriteria.CriteriaList', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    expect(store.isDirty).toBe(false)

    store.applyProposal({
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'ConditionOccurrence' } as never,
    })

    const list = store.currentCohort!.expression?.PrimaryCriteria?.CriteriaList
    expect(list).toHaveLength(1)
    expect(list![0]).toHaveProperty('ConditionOccurrence')
    expect(store.isDirty).toBe(true)
  })

  it('addEntryEvent appends multiple events to PrimaryCriteria.CriteriaList', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({ kind: 'addEntryEvent', event: { id: 'e1', criteriaType: 'ConditionOccurrence' } as never })
    store.applyProposal({ kind: 'addEntryEvent', event: { id: 'e2', criteriaType: 'DrugExposure' } as never })

    const list = store.currentCohort!.expression?.PrimaryCriteria?.CriteriaList
    expect(list).toHaveLength(2)
    expect(list![1]).toHaveProperty('DrugExposure')
  })

  it('addInclusionRule appends to expression.InclusionRules', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({
      kind: 'addInclusionRule',
      rule: { id: 'r1', name: 'At least one prior visit', criteriaGroups: [] } as never,
    })

    const rules = store.currentCohort!.expression?.InclusionRules
    expect(rules).toHaveLength(1)
    expect(rules![0].name).toBe('At least one prior visit')
    expect(store.isDirty).toBe(true)
  })

  it('addConceptSet pushes to expression.ConceptSets', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({ kind: 'addConceptSet', conceptSet: { id: 42, name: 'NSAIDs' } as never })

    const sets = store.currentCohort!.expression?.ConceptSets
    expect(sets).toHaveLength(1)
    expect(sets![0]).toMatchObject({ id: 42, name: 'NSAIDs' })
  })

  it('addConceptSet deduplicates by id', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    const conceptSet = { id: 42, name: 'NSAIDs' } as never

    store.applyProposal({ kind: 'addConceptSet', conceptSet })
    store.applyProposal({ kind: 'addConceptSet', conceptSet })

    expect(store.currentCohort!.expression?.ConceptSets).toHaveLength(1)
  })

  it('setObservationPeriod sets expression.PrimaryCriteria.ObservationWindow', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })

    expect(store.currentCohort!.expression?.PrimaryCriteria?.ObservationWindow).toEqual({
      PriorDays: 365,
      PostDays: 30,
    })
  })

  it('setCohortExit CONTINUOUS_OBSERVATION clears EndStrategy', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: { EndStrategy: { DateOffset: { Offset: 30 } } } })

    store.applyProposal({
      kind: 'setCohortExit',
      exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } as never,
    })

    expect(store.currentCohort!.expression?.EndStrategy).toBeUndefined()
  })

  it('setCohortExit FIXED_DURATION sets DateOffset EndStrategy', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({
      kind: 'setCohortExit',
      exitCriteria: { strategy: 'FIXED_DURATION', offset: 30, dateField: 'START_DATE' } as never,
    })

    expect(store.currentCohort!.expression?.EndStrategy).toEqual({
      DateOffset: { DateField: 'StartDate', Offset: 30 },
    })
  })

  it('addCensoringCriterion appends a Death wrapper to expression.CensoringCriteria', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })

    const censoring = store.currentCohort!.expression?.CensoringCriteria
    expect(censoring).toHaveLength(1)
    expect(censoring![0]).toHaveProperty('Death')
    expect(store.isDirty).toBe(true)
  })

  it('isDirty flips on every mutating proposal', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    store.markClean()

    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })
    expect(store.isDirty).toBe(true)
  })

  it('agentRevision increments on every mutating proposal', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    expect(store.agentRevision).toBe(0)

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })
    expect(store.agentRevision).toBe(1)

    store.applyProposal({
      kind: 'setCohortExit',
      exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } as never,
    })
    expect(store.agentRevision).toBe(2)
  })

  it('agentRevision does NOT increment on direct markDirty mutations', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    const before = store.agentRevision

    // Direct mutation outside applyProposal should not bump agentRevision
    store.markDirty()

    expect(store.agentRevision).toBe(before)
  })

  it('non-cohort proposal kinds (navigate, saveCohort, etc.) do not increment agentRevision', () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })
    const before = store.agentRevision

    store.applyProposal({ kind: 'navigate', route: { name: 'cohorts' } } as AgentProposal)
    store.applyProposal({ kind: 'saveCohort' } as AgentProposal)

    expect(store.agentRevision).toBe(before)
  })
})

// Regression: agent criteria carry their concept set inline on the event with a
// client-side string uid. A criterion's CodesetId is only meaningful once that
// id is a number registered in expression.ConceptSets — so without registration
// every agent-built cohort saved as `CodesetId: null` + `ConceptSets: []`, i.e.
// "any drug exposure" rather than the drug the agent chose. That used to
// silently produce meaningless analyses.
//
// T14 (src/stores/cohort.ts:112): applyProposal's addEntryEvent case reads
// only `event.criteriaType` and pushes an empty wrapper (`{ DrugExposure: {} }`);
// it never looks at `event.conceptSet`, so the concept set and attributes are
// dropped and agentRevision/markDirty still run. The registration this block
// guards is real — it happens in pythiaBridge's adoptProposalConceptSets,
// which runs *before* cohortStore.applyProposal in production — but the
// store's own applyProposal, called directly here, does not do it. Fixed in
// Phase 3 (either move the registration into the store, or accept it only
// ever runs through the bridge).
describe('applyProposal registers concept sets embedded on agent events', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const eventWithConceptSet = (name: string, conceptId: number) => ({
    id: `evt-${conceptId}`,
    criteriaType: 'DrugExposure',
    conceptSet: {
      id: 'client-uuid-not-a-number',
      name,
      conceptCount: 1,
      items: [{ concept: { CONCEPT_ID: conceptId, CONCEPT_NAME: name } }],
    },
  })

  it.fails('gives the entry event a numeric CodesetId and registers the set', () => {
    const store = newCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: eventWithConceptSet('Amoxicillin', 1713671),
    } as never)

    const expr = store.currentCohort!.expression!
    const criterion = expr.PrimaryCriteria?.CriteriaList?.[0] as
      | Record<string, { CodesetId?: number }>
      | undefined
    const codesetId = criterion?.DrugExposure?.CodesetId
    expect(typeof codesetId).toBe('number')
    expect(expr.ConceptSets).toHaveLength(1)
    expect(expr.ConceptSets![0].name).toBe('Amoxicillin')
    // the criterion and the registered set must agree
    expect(expr.ConceptSets![0].id).toBe(codesetId)
    // and the concept itself must survive in the shape CIRCE reads, otherwise
    // the saved ConceptSets carry CONCEPT_ID: null
    const item = expr.ConceptSets![0].expression?.items?.[0]
    expect(item?.concept?.CONCEPT_ID).toBe(1713671)
    expect(item?.concept?.CONCEPT_NAME).toBe('Amoxicillin')
  })

  // T14 on both counts: addEntryEvent drops the first criterion's conceptSet,
  // and addInclusionRule drops criteriaGroups entirely, so the second
  // criterion's conceptSet never even reaches the store.
  it.fails('assigns distinct ids across several criteria', () => {
    const store = newCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: eventWithConceptSet('Amoxicillin', 1713671),
    } as never)
    store.applyProposal({
      kind: 'addInclusionRule',
      rule: {
        id: 'r1',
        name: 'On doxycycline',
        criteriaGroups: [
          { id: 'g1', logicType: 'ALL', events: [eventWithConceptSet('Doxycycline', 1738521)] },
        ],
      },
    } as never)

    const ids = (store.currentCohort!.expression!.ConceptSets ?? []).map(cs => cs.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every(id => typeof id === 'number')).toBe(true)
  })
})

// End-to-end of the serialisation path: store.currentCohort.expression is what
// actually gets POSTed to WebAPI. Before a past fix this produced
// `CodesetId: null` + `ConceptSets: []`; after the first fix it produced a
// ConceptSets entry whose concept was all nulls. Assert the real JSON — and
// that it validates as a well-formed CIRCE expression.
describe('agent-built cohort serialises to valid CIRCE', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds exactly one criterion to PrimaryCriteria.CriteriaList', () => {
    const store = newCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: {
        id: 'evt-1',
        criteriaType: 'DrugExposure',
        conceptSet: {
          id: 'client-uuid',
          name: 'Amoxicillin',
          conceptCount: 1,
          items: [
            {
              concept: {
                CONCEPT_ID: 1713671,
                CONCEPT_NAME: 'Amoxicillin',
                DOMAIN_ID: 'Drug',
              },
              includeDescendants: true,
              isExcluded: false,
            },
          ],
        },
      },
    } as never)

    const parsed = CohortExpressionSchema.safeParse(store.currentCohort?.expression)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.PrimaryCriteria?.CriteriaList).toHaveLength(1)
    }
  })

  // T14: the criterion is added (above), but its embedded conceptSet is
  // dropped — no CodesetId, no ConceptSets entry. Fixed in Phase 3.
  it.fails('emits a matching CodesetId and a concept set carrying the concept', () => {
    const store = newCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: {
        id: 'evt-1',
        criteriaType: 'DrugExposure',
        conceptSet: {
          id: 'client-uuid',
          name: 'Amoxicillin',
          conceptCount: 1,
          items: [
            {
              concept: {
                CONCEPT_ID: 1713671,
                CONCEPT_NAME: 'Amoxicillin',
                DOMAIN_ID: 'Drug',
              },
              includeDescendants: true,
              isExcluded: false,
            },
          ],
        },
      },
    } as never)

    const expr = store.currentCohort!.expression!
    const criteria = expr.PrimaryCriteria?.CriteriaList as
      | Array<Record<string, { CodesetId?: number }>>
      | undefined
    const codesetId = criteria?.[0]?.DrugExposure?.CodesetId
    const conceptSets = expr.ConceptSets ?? []

    expect(typeof codesetId).toBe('number')
    expect(conceptSets).toHaveLength(1)
    expect(conceptSets[0].id).toBe(codesetId)
    const concept = conceptSets[0].expression?.items?.[0]?.concept
    expect(concept?.CONCEPT_ID).toBe(1713671)
    expect(concept?.CONCEPT_NAME).toBe('Amoxicillin')
  })
})
