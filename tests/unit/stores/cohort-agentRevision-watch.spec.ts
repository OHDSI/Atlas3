import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { useCohortStore } from '@/stores/cohort'

/**
 * Mirrors the CohortBuilder.vue watcher pattern: on every `agentRevision`
 * tick, re-sync the local ref from `currentCohort.<field>`. Verifies that
 * the indirection actually delivers an updated value to the local ref
 * after the agent's `applyProposal` mutates the store.
 */
describe('agentRevision-driven re-sync', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('re-syncs an observation-period local ref after applyProposal', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    store.currentCohort!.observationPeriod = { priorDays: 0, postDays: 0 }

    const localObservationPeriod = ref(store.currentCohort!.observationPeriod)
    expect(localObservationPeriod.value.priorDays).toBe(0)

    watch(
      () => store.agentRevision,
      () => {
        localObservationPeriod.value = store.currentCohort!.observationPeriod ?? {
          priorDays: 0,
          postDays: 0,
        }
      }
    )

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })

    await nextTick()
    expect(localObservationPeriod.value.priorDays).toBe(365)
    expect(localObservationPeriod.value.postDays).toBe(30)
  })

  it('re-syncs an exitCriteria local ref after applyProposal', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    const initial = { strategy: 'CONTINUOUS_OBSERVATION' as const }
    store.currentCohort!.exitCriteria = initial

    const localExit = ref(store.currentCohort!.exitCriteria!)
    watch(
      () => store.agentRevision,
      () => {
        localExit.value = store.currentCohort!.exitCriteria ?? initial
      }
    )

    store.applyProposal({
      kind: 'setExitCriteria',
      exitCriteria: { strategy: 'FIXED_DURATION', offset: 30 } as never,
    })

    await nextTick()
    expect(localExit.value.strategy).toBe('FIXED_DURATION')
    expect((localExit.value as { offset?: number }).offset).toBe(30)
  })

  it('re-syncs a freshly-created censoringCriteria array after first push', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    // builder's local ref starts as a new empty array (not the store's)
    const localCensoring = ref<unknown[]>([])

    watch(
      () => store.agentRevision,
      () => {
        localCensoring.value = store.currentCohort!.censoringCriteria ?? []
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
