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
