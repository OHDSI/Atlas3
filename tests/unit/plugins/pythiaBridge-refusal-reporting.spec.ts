import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import type { CohortExpression } from '@/models/circe-types'

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined),
    currentRoute: { value: { name: 'cohort-new', params: {} } },
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

import { createConceptSet } from '@/services/concept-set.service'
import { setupPythiaBridge, applyProposalDirect } from '@/plugins/host/pythiaBridge'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useNotifications } from '@/stores/notifications'
import type { AgentProposal } from '@/models/agent.types'

function severities() {
  return useNotifications().items.map(i => ({ severity: i.severity, title: i.title }))
}

function attachEditor() {
  const store = useCohortStore()
  store.createNewCohort()
  store.attachExpression(ref<CohortExpression>({}))
  return store
}

describe('pythiaBridge reports refusals rather than silent success', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    vi.mocked(createConceptSet).mockReset()
  })

  it('a cohort proposal the store refuses as unsupported reports failure to the agent', async () => {
    const store = attachEditor()
    vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: false, reason: 'unsupported-kind' })

    const res = await applyProposalDirect({
      kind: 'setEraCollapse',
      collapseSettings: { collapseType: 'ERA', eraPad: 30 },
    } as AgentProposal)

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      { severity: 'danger', title: 'ATLAS cannot make that change to a cohort yet' },
    ])
  })

  it('a removal that matched nothing is reported as a miss, not as a change', async () => {
    attachEditor()

    const res = await applyProposalDirect({
      kind: 'removeInclusionRule',
      match: { name: 'no such rule' },
    } as AgentProposal)

    expect(res).toEqual({ applied: false })
    expect(severities()).toEqual([
      {
        severity: 'danger',
        title: 'Nothing in the cohort matched that change, so it was left as it was',
      },
    ])
  })

  it('a cohort proposal the store applies still reports success', async () => {
    attachEditor()

    const res = await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 0 },
    } as AgentProposal)

    expect(res).toMatchObject({ applied: true })
    expect(severities()).toEqual([])
  })

  it('a created concept set that the cohort refuses is not announced as attached', async () => {
    const store = attachEditor()
    vi.mocked(createConceptSet).mockResolvedValue({
      id: 7,
      name: 'Statins',
      items: [{ conceptId: 1, conceptName: 'Simvastatin', domainId: 'Drug' }],
    } as never)
    vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: false, reason: 'unsupported-kind' })

    const res = await applyProposalDirect({
      kind: 'createStandaloneConceptSet',
      conceptSet: { name: 'Statins', items: [{ conceptId: 1, conceptName: 'Simvastatin' }] },
    } as AgentProposal)

    expect(res).toMatchObject({ applied: false })
    expect(severities().some(s => s.severity === 'success')).toBe(false)
  })

  it('an update the target store makes no change for reports failure to the agent', async () => {
    const conceptSets = useConceptSetsStore()
    conceptSets.currentSet = { id: 3, name: 'Statins', items: [] } as never
    vi.spyOn(conceptSets, 'applyProposal').mockReturnValue(false)

    const res = await applyProposalDirect({
      kind: 'updateConceptSet',
      payload: { id: 3, name: 'Statins' },
    } as AgentProposal)

    expect(res).toEqual({ applied: false })
    expect(severities().some(s => s.severity === 'success')).toBe(false)
  })

  it('an update that cannot load its target reports failure to the agent', async () => {
    const irStore = useIncidenceRateStore()
    vi.spyOn(irStore, 'loadIR').mockResolvedValue(undefined as never)

    const res = await applyProposalDirect({
      kind: 'updateIncidenceRate',
      payload: { id: 999, name: 'nope' },
    } as AgentProposal)

    expect(res).toEqual({ applied: false })
  })
})
