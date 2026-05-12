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
