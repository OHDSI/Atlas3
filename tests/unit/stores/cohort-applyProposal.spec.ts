import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { AgentProposal } from '@/models/agent.types'

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
// client-side string uid. convertEventToAtlas only emits CodesetId when that id
// is a number, and the cohort's ConceptSets array is built from
// cohort.conceptSets — so without registration every agent-built cohort saved as
// `CodesetId: null` + `ConceptSets: []`, i.e. "any drug exposure" rather than
// the drug the agent chose. That silently produced meaningless analyses.
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

  it('gives the entry event a numeric CodesetId and registers the set', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'addEntryEvent',
      event: eventWithConceptSet('Amoxicillin', 1713671),
    } as never)

    const cohort = store.currentCohort!
    expect(typeof cohort.entryEvents[0].conceptSet!.id).toBe('number')
    expect(cohort.conceptSets).toHaveLength(1)
    expect(cohort.conceptSets[0].name).toBe('Amoxicillin')
    // the criterion and the registered set must agree
    expect(cohort.conceptSets[0].id).toBe(cohort.entryEvents[0].conceptSet!.id)
    // and the concept itself must survive in the shape the ATLAS converter
    // reads, otherwise the saved ConceptSets carry CONCEPT_ID: null
    const item = cohort.conceptSets[0].items![0] as Record<string, unknown>
    expect(item.conceptId).toBe(1713671)
    expect(item.conceptName).toBe('Amoxicillin')
  })

  it('assigns distinct ids across several criteria', () => {
    const store = useCohortStore()
    store.createNewCohort()
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

    const cohort = store.currentCohort!
    const ids = cohort.conceptSets.map(cs => cs.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    expect(ids.every(id => typeof id === 'number')).toBe(true)
  })
})

// End-to-end of the serialisation path: store -> convertInternalToAtlas is what
// actually gets POSTed to WebAPI. Before the fix this produced
// `CodesetId: null` + `ConceptSets: []`; after the first fix it produced a
// ConceptSets entry whose concept was all nulls. Assert the real JSON.
describe('agent-built cohort serialises to valid CIRCE', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('emits a matching CodesetId and a concept set carrying the concept', async () => {
    const { convertInternalToAtlas } = await import('@/services/atlas-converter')
    const store = useCohortStore()
    store.createNewCohort()
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

    const atlas = convertInternalToAtlas(store.currentCohort!) as Record<string, never>
    const criteria = (atlas.PrimaryCriteria as never as Record<string, unknown>)
      .CriteriaList as Array<Record<string, Record<string, unknown>>>
    const codesetId = criteria[0].DrugExposure.CodesetId
    const conceptSets = atlas.ConceptSets as never as Array<Record<string, never>>

    expect(typeof codesetId).toBe('number')
    expect(conceptSets).toHaveLength(1)
    expect((conceptSets[0] as Record<string, unknown>).id).toBe(codesetId)
    const concept = (conceptSets[0].expression as never as Record<string, never>)
      .items[0].concept as Record<string, unknown>
    expect(concept.CONCEPT_ID).toBe(1713671)
    expect(concept.CONCEPT_NAME).toBe('Amoxicillin')
  })
})
