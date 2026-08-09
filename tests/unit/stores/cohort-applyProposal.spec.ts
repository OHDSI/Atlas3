import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCohortStore } from '@/stores/cohort'
import type { AgentProposal } from '@/models/agent.types'

describe('useCohortStore.applyProposal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates a cohort if one does not exist', () => {
    const store = useCohortStore()
    expect(store.currentCohort).toBeNull()

    const proposal: AgentProposal = {
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'ConditionOccurrence' } as never,
    }
    store.applyProposal(proposal)
    expect(store.currentCohort).not.toBeNull()
    expect(store.currentCohort!.entryEvents).toHaveLength(1)
  })

  it('addEntryEvent appends to entryEvents and marks dirty', () => {
    const store = useCohortStore()
    store.createNewCohort()
    expect(store.isDirty).toBe(false)

    store.applyProposal({
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'ConditionOccurrence' } as never,
    })
    expect(store.currentCohort!.entryEvents).toHaveLength(1)
    expect(store.isDirty).toBe(true)
  })

  it('addInclusionRule appends to inclusionRules', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'addInclusionRule',
      rule: { id: 'r1', name: 'rule', criteriaGroups: [] } as never,
    })
    expect(store.currentCohort!.inclusionRules).toHaveLength(1)
    expect(store.isDirty).toBe(true)
  })

  it('addConceptSet dedupes by id', () => {
    const store = useCohortStore()
    store.createNewCohort()
    const conceptSet = { id: 42, name: 'NSAIDs' } as never
    store.applyProposal({ kind: 'addConceptSet', conceptSet })
    store.applyProposal({ kind: 'addConceptSet', conceptSet })
    expect(store.currentCohort!.conceptSets).toHaveLength(1)
  })

  it('setObservationPeriod replaces the observation period', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })
    expect(store.currentCohort!.observationPeriod).toEqual({ priorDays: 365, postDays: 30 })
  })

  it('setExitCriteria replaces the exit criteria', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'setExitCriteria',
      exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } as never,
    })
    expect(store.currentCohort!.exitCriteria).toEqual({ strategy: 'CONTINUOUS_OBSERVATION' })
  })

  it('addCensoringCriterion appends to censoringCriteria', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })
    expect(store.currentCohort!.censoringCriteria).toHaveLength(1)
  })

  it('isDirty flips on every successful proposal', () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.markClean()

    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })
    expect(store.isDirty).toBe(true)
  })

  it('agentRevision increments on every successful proposal', () => {
    const store = useCohortStore()
    store.createNewCohort()
    expect(store.agentRevision).toBe(0)

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })
    expect(store.agentRevision).toBe(1)

    store.applyProposal({
      kind: 'setExitCriteria',
      exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' } as never,
    })
    expect(store.agentRevision).toBe(2)
  })

  it('agentRevision does NOT increment on direct mutations (only via applyProposal)', () => {
    const store = useCohortStore()
    store.createNewCohort()
    const before = store.agentRevision

    store.addEntryEvent({ id: 'e1', criteriaType: 'ConditionOccurrence' } as never)
    store.markDirty()

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
