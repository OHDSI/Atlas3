import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { useCohortStore } from '@/stores/cohort'

/**
 * Mirrors the CohortBuilder.vue watcher pattern: on every `agentRevision`
 * tick, re-sync the local ref from `currentCohort.expression.*`. Verifies that
 * the indirection delivers updated values to local refs after applyProposal.
 */
describe('agentRevision-driven re-sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('re-syncs an ObservationWindow local ref after setObservationPeriod', async () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: { PrimaryCriteria: { ObservationWindow: { PriorDays: 0, PostDays: 0 } } } })

    const localWindow = ref(store.currentCohort!.expression?.PrimaryCriteria?.ObservationWindow)

    watch(
      () => store.agentRevision,
      () => {
        localWindow.value = store.currentCohort!.expression?.PrimaryCriteria?.ObservationWindow
      }
    )

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })

    await nextTick()
    expect(localWindow.value?.PriorDays).toBe(365)
    expect(localWindow.value?.PostDays).toBe(30)
  })

  it('re-syncs an EndStrategy local ref after setCohortExit FIXED_DURATION', async () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    const localEndStrategy = ref(store.currentCohort!.expression?.EndStrategy)

    watch(
      () => store.agentRevision,
      () => {
        localEndStrategy.value = store.currentCohort!.expression?.EndStrategy
      }
    )

    store.applyProposal({
      kind: 'setCohortExit',
      exitCriteria: { strategy: 'FIXED_DURATION', offset: 30 } as never,
    })

    await nextTick()
    expect(localEndStrategy.value).toMatchObject({ DateOffset: { Offset: 30 } })
  })

  it('re-syncs a CensoringCriteria array ref after first addCensoringCriterion', async () => {
    const store = useCohortStore()
    store.setCohort({ name: 'Test', expression: {} })

    const localCensoring = ref<unknown[]>([])

    watch(
      () => store.agentRevision,
      () => {
        localCensoring.value = store.currentCohort!.expression?.CensoringCriteria ?? []
      }
    )

    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })

    await nextTick()
    expect(localCensoring.value).toHaveLength(1)
  })
})

