import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref, nextTick, computed } from 'vue'
import { useCohortStore } from '@/stores/cohort'
import type { CohortExpression } from '@/components/cohort-editor/circe.types'

/**
 * The editor owns the CohortExpression instance and lends it to the store, so
 * an agent proposal lands in the object the editor is already rendering. These
 * replace the agentRevision re-sync tests: there is no second copy to re-sync,
 * and the counter that drove it is gone.
 */
describe('the attached cohort document', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function openEditor(expression: CohortExpression = {}) {
    const store = useCohortStore()
    const document = ref<CohortExpression>(expression)
    store.setCohort({ name: 'Test' })
    store.attachExpression(document)
    return { store, document }
  }

  it('setObservationPeriod reaches the editor without a re-sync step', async () => {
    const { store, document } = openEditor({
      PrimaryCriteria: { ObservationWindow: { PriorDays: 0, PostDays: 0 } },
    })

    store.applyProposal({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 30 },
    })

    await nextTick()
    expect(document.value.PrimaryCriteria?.ObservationWindow).toEqual({
      PriorDays: 365,
      PostDays: 30,
    })
  })

  it('a computed over the editor document re-evaluates after a proposal', async () => {
    const { store, document } = openEditor({})
    const censoringCount = computed(() => document.value.CensoringCriteria?.length ?? 0)
    expect(censoringCount.value).toBe(0)

    store.applyProposal({
      kind: 'addCensoringCriterion',
      event: { id: 'c1', criteriaType: 'Death' } as never,
    })

    await nextTick()
    expect(censoringCount.value).toBe(1)
  })

  it('a proposal cannot discard an edit the user made since the document was loaded', () => {
    const { store, document } = openEditor({})
    document.value.EndStrategy = { DateOffset: { DateField: 'StartDate', Offset: 7 } }

    store.applyProposal({
      kind: 'addInclusionRule',
      rule: { name: 'Agent rule', description: '' },
    } as never)

    expect(document.value.EndStrategy).toEqual({
      DateOffset: { DateField: 'StartDate', Offset: 7 },
    })
    expect(document.value.InclusionRules).toHaveLength(1)
  })

  it('the store reads the editor document, it does not hold a copy of it', () => {
    const { store, document } = openEditor({})

    document.value.InclusionRules = [{ name: 'Typed by the user' }]

    expect(store.currentCohort?.expression).toBe(document.value)
    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
  })

  it('a definition set while an editor is attached is installed into that document', () => {
    const { store, document } = openEditor({})
    const before = document.value

    store.setCohort({
      id: 5,
      name: 'Loaded',
      expression: { InclusionRules: [{ name: 'From the server' }] },
    })

    expect(document.value).toBe(before)
    expect(document.value.InclusionRules?.[0]?.name).toBe('From the server')
    expect(store.currentCohort?.expression).toBe(document.value)
  })

  it('a new editor does not adopt the expression of the session that just closed', () => {
    const store = useCohortStore()
    const closing = ref<CohortExpression>({})
    store.attachExpression(closing)
    store.setCohort({
      id: 1,
      name: 'Cohort 1',
      expression: { InclusionRules: [{ name: 'Belongs to cohort 1' }] },
    })
    expect(closing.value.InclusionRules).toHaveLength(1)

    store.detachExpression(closing)

    const opening = ref<CohortExpression>({})
    store.attachExpression(opening)

    expect(opening.value).toEqual({})
    // The metadata outlives the editor: pythiaBridge navigates back by id.
    expect(store.currentCohort?.id).toBe(1)
  })

  it('detaching only clears the attachment made by that editor', () => {
    const { store, document } = openEditor({})
    const other = ref<CohortExpression>({})

    store.detachExpression(other)
    expect(store.hasCohortDocument).toBe(true)

    store.detachExpression(document)
    expect(store.hasCohortDocument).toBe(false)
  })
})
