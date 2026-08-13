import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { CohortExpression } from '@/components/cohort-editor/circe.types'

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined),
    currentRoute: { value: { name: 'home', params: {} } },
  },
}))

vi.mock('@/services/concept-set.service', () => ({
  createConceptSet: vi.fn(),
  getConceptSetById: vi.fn(),
}))
vi.mock('@/services/feature-analysis.service', () => ({
  createFeatureAnalysis: vi.fn(),
}))
vi.mock('@/services/characterization.service', () => ({
  createCharacterization: vi.fn(),
}))
vi.mock('@/services/pathway.service', () => ({
  createPathway: vi.fn(),
  generatePathway: vi.fn(),
}))
vi.mock('@/services/incidence-rate.service', () => ({
  createIncidenceRate: vi.fn(),
}))

import router from '@/router'
import { getConceptSetById } from '@/services/concept-set.service'
import { setupPythiaBridge, applyProposalDirect } from '@/plugins/host/pythiaBridge'
import { useCohortStore } from '@/stores/cohort'
import { useNotifications } from '@/stores/notifications'
import type { AgentProposal } from '@/models/agent.types'

const STATINS = {
  id: 42,
  name: 'Statins',
  items: [
    { conceptId: 1, conceptName: 'Simvastatin', domainId: 'Drug' },
  ],
}

function useConceptSetProposal(
  payload: { conceptSetId: number; group?: 'entry' | 'inclusion' | 'exclusion'; name?: string },
): AgentProposal {
  return { kind: 'useConceptSet', payload } as AgentProposal
}

function severities() {
  return useNotifications().items.map(i => ({ severity: i.severity, title: i.title }))
}

function attachEditor() {
  const store = useCohortStore()
  store.createNewCohort()
  store.attachExpression(ref<CohortExpression>({}))
  return store
}

describe('pythiaBridge useConceptSet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    vi.mocked(router.push).mockClear()
    vi.mocked(getConceptSetById).mockReset()
    vi.mocked(getConceptSetById).mockResolvedValue(STATINS as never)
  })

  it('inclusion group: applies the rule and reports success', async () => {
    const store = attachEditor()

    const res = await applyProposalDirect(useConceptSetProposal({ conceptSetId: 42 }))

    expect(res).toEqual({ id: 42, name: 'Statins' })
    expect(store.currentCohort?.expression?.InclusionRules).toHaveLength(1)
    expect(severities()).toEqual([
      { severity: 'success', title: 'Using concept set "Statins" (1 concepts)' },
    ])
  })

  it('entry group: applies the entry event and reports success', async () => {
    const store = attachEditor()

    const res = await applyProposalDirect(
      useConceptSetProposal({ conceptSetId: 42, group: 'entry' }),
    )

    expect(res).toEqual({ id: 42, name: 'Statins' })
    expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(1)
    expect(severities()).toEqual([
      { severity: 'success', title: 'Using concept set "Statins" (1 concepts)' },
    ])
  })

  it('no editor open: surfaces the failure instead of a success toast', async () => {
    const res = await applyProposalDirect(useConceptSetProposal({ conceptSetId: 42 }))

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'danger', title: 'Open a cohort before asking for changes to one' },
    ])
  })

  it('no editor open on the entry path: surfaces the failure too', async () => {
    const res = await applyProposalDirect(
      useConceptSetProposal({ conceptSetId: 42, group: 'entry' }),
    )

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'danger', title: 'Open a cohort before asking for changes to one' },
    ])
  })

  it('reports per-call outcomes: the entry apply succeeds, the rejected inclusion apply does not', async () => {
    const store = attachEditor()
    const real = store.applyProposal.bind(store)
    vi.spyOn(store, 'applyProposal').mockImplementation(proposal =>
      proposal.kind === 'addInclusionRule'
        ? { applied: false, reason: 'unsupported-kind' }
        : real(proposal),
    )

    const entry = await applyProposalDirect(
      useConceptSetProposal({ conceptSetId: 42, group: 'entry' }),
    )
    const inclusion = await applyProposalDirect(useConceptSetProposal({ conceptSetId: 42 }))

    expect(entry).toEqual({ id: 42, name: 'Statins' })
    expect(inclusion).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'success', title: 'Using concept set "Statins" (1 concepts)' },
      { severity: 'danger', title: 'Could not add concept set "Statins" to the cohort' },
    ])
  })

  it('exclusion group: a rejected apply is reported as a failure', async () => {
    const store = attachEditor()
    vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: false, reason: 'unsupported-kind' })

    const res = await applyProposalDirect(
      useConceptSetProposal({ conceptSetId: 42, group: 'exclusion' }),
    )

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'danger', title: 'Could not add concept set "Statins" to the cohort' },
    ])
  })

  it('fetch failure: reports failure without a success toast', async () => {
    attachEditor()
    vi.mocked(getConceptSetById).mockRejectedValue(new Error('WebAPI 500'))

    const res = await applyProposalDirect(useConceptSetProposal({ conceptSetId: 42 }))

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'danger', title: 'Could not read concept set 42' },
    ])
  })

  it('empty concept set: reports failure without touching the cohort', async () => {
    const store = attachEditor()
    vi.mocked(getConceptSetById).mockResolvedValue({ id: 42, name: 'Statins', items: [] } as never)

    const res = await applyProposalDirect(useConceptSetProposal({ conceptSetId: 42 }))

    expect(res).toEqual({ applied: false })
    expect(store.currentCohort?.expression?.InclusionRules).toBeUndefined()
    expect(severities()).toEqual([
      { severity: 'danger', title: 'Concept set "Statins" has no concepts' },
    ])
  })
})
