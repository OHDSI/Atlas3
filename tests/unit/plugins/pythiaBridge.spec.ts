import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined),
    currentRoute: { value: { name: 'home', params: {} } },
  },
}))

vi.mock('@/services/concept-set.service', () => ({
  createConceptSet: vi.fn(),
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
import { createConceptSet } from '@/services/concept-set.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createCharacterization } from '@/services/characterization.service'
import { createPathway, generatePathway } from '@/services/pathway.service'
import { createIncidenceRate } from '@/services/incidence-rate.service'
import { setupPythiaBridge, applyProposalDirect } from '@/plugins/host/pythiaBridge'
import { useCohortStore } from '@/stores/cohort'
import { useNotifications } from '@/stores/notifications'
import { createHostMessageBus, getHostMessageBus } from '@/plugins/messaging/HostMessageBus'
import { ApiError } from '@/services/api-error'

function dispatchPluginMessage(detail: unknown) {
  window.dispatchEvent(new CustomEvent('plugin-message', { detail }))
}

// Wait one microtask for the bridge's async handler to settle.
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('pythiaBridge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
    vi.mocked(router.push).mockClear()
    vi.mocked(createConceptSet).mockReset()
    vi.mocked(createFeatureAnalysis).mockReset()
    vi.mocked(createCharacterization).mockReset()
    vi.mocked(createPathway).mockReset()
    vi.mocked(createIncidenceRate).mockReset()
  })

  it('routes cohort.applyProposal into the cohort store', () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'setObservationPeriod',
          observationPeriod: { priorDays: 365, postDays: 30 },
        },
      },
      timestamp: new Date(),
    })

    const store = useCohortStore()
    expect(store.currentCohort?.observationPeriod).toEqual({ priorDays: 365, postDays: 30 })
  })

  it('ignores plugin-messages from unrelated plugins', () => {
    const store = useCohortStore()
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'some-other-plugin',
      payload: {
        proposal: {
          kind: 'setObservationPeriod',
          observationPeriod: { priorDays: 999, postDays: 999 },
        },
      },
      timestamp: new Date(),
    })

    expect(store.currentCohort?.observationPeriod).toBeUndefined()
  })

  it('responds to cohort.getContext with the current source + cohort summary', async () => {
    const bus = getHostMessageBus('pythia-plugin')!
    const handleResponseSpy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-1',
      timestamp: new Date(),
    })

    expect(handleResponseSpy).toHaveBeenCalledOnce()
    const response = handleResponseSpy.mock.calls[0][1] as { sourceKey: unknown; cohort: unknown }
    expect(response).toHaveProperty('sourceKey')
    expect(response).toHaveProperty('cohort')
  })

  it('cohort.rejectProposal is a no-op (does not throw)', () => {
    expect(() =>
      dispatchPluginMessage({
        type: 'cohort.rejectProposal',
        sourcePluginId: 'pythia-plugin',
        payload: { id: 'p-1' },
        timestamp: new Date(),
      })
    ).not.toThrow()
  })

  it('createFeatureAnalysis proposal → calls service + navigates to feature-analysis-edit', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue({
      success: true,
      data: {
        id: 42,
        name: 'Demographics',
        type: 'PRESET',
        design: 'demographics-age-group',
      },
    } as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createFeatureAnalysis',
          payload: {
            name: 'Demographics',
            type: 'PRESET',
            design: 'demographics-age-group',
          },
          openAfterCreate: true,
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createFeatureAnalysis).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'feature-analysis-edit',
      params: { id: '42' },
    })
  })

  it('createCharacterization proposal → calls service + navigates to characterization-edit', async () => {
    vi.mocked(createCharacterization).mockResolvedValue({
      success: true,
      data: {
        id: 7,
        name: 'T2DM baseline',
        cohorts: [{ id: 1, name: 'T2DM' }],
        featureAnalyses: [{ id: 10, name: 'Demographics' }],
        stratas: [],
      },
    } as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createCharacterization',
          payload: {
            name: 'T2DM baseline',
            cohorts: [{ id: 1, name: 'T2DM' }],
            featureAnalyses: [{ id: 10, name: 'Demographics' }],
          },
          openAfterCreate: true,
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createCharacterization).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'characterization-edit',
      params: { id: '7' },
    })
  })

  it('createPathway proposal → unwraps ApiResult + navigates to pathway-edit', async () => {
    vi.mocked(createPathway).mockResolvedValue({
      success: true,
      data: { id: 13, name: 'Antidiabetic sequencing' } as never,
    })

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createPathway',
          payload: {
            name: 'Antidiabetic sequencing',
            combinationWindow: 60,
          },
          openAfterCreate: true,
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createPathway).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'pathway-edit',
      params: { id: '13' },
    })
  })

  it('createIncidenceRate proposal → unwraps ApiResult + navigates to incidence-rate-edit', async () => {
    vi.mocked(createIncidenceRate).mockResolvedValue({
      success: true,
      data: { id: 21, name: 'GI bleed on NSAIDs' } as never,
    })

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createIncidenceRate',
          payload: {
            name: 'GI bleed on NSAIDs',
            timeAtRisk: {
              start: { DateField: 'StartDate', Offset: 0 },
              end: { DateField: 'StartDate', Offset: 365 },
            },
          },
          openAfterCreate: true,
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createIncidenceRate).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'incidence-rate-edit',
      params: { id: '21' },
    })
  })

  it('createPathway proposal → no router.push when ApiResult.success is false', async () => {
    vi.mocked(createPathway).mockResolvedValue({
      success: false,
      error: new ApiError('WebAPI returned 500', 500, null),
    })

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createPathway',
          payload: { name: 'will fail' },
          openAfterCreate: true,
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createPathway).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })

  function snackbarSpy() {
    return vi.spyOn(useNotifications(), 'danger')
  }

  function conceptSetProposal() {
    return {
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createStandaloneConceptSet',
          conceptSet: {
            name: 'Statins',
            items: [{ conceptId: 1539403, conceptName: 'Simvastatin' }],
          },
        },
      },
      timestamp: new Date(),
    }
  }

  it('createStandaloneConceptSet → surfaces a rejected createConceptSet as a snackbar without navigating', async () => {
    const snackbar = snackbarSpy()
    vi.mocked(createConceptSet).mockRejectedValue(new Error('WebAPI returned 500'))

    dispatchPluginMessage(conceptSetProposal())

    await flush()
    expect(createConceptSet).toHaveBeenCalledOnce()
    expect(snackbar).toHaveBeenCalledWith('WebAPI returned 500')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('createStandaloneConceptSet → falls back to a generic message for a non-Error throw', async () => {
    const snackbar = snackbarSpy()
    vi.mocked(createConceptSet).mockRejectedValue('boom')

    dispatchPluginMessage(conceptSetProposal())

    await flush()
    expect(snackbar).toHaveBeenCalledWith('Failed to create concept set')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('navigate proposal → calls router.push with route name + params', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'navigate',
          route: { name: 'cohort-edit', params: { id: 7 } },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(router.push).toHaveBeenCalledWith({
      name: 'cohort-edit',
      params: { id: 7 },
    })
  })

  it('saveCohort proposal → bumps saveRequest with the carried name + description', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    const before = store.saveRequest

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'saveCohort',
          name: 'T2DM cohort',
          description: 'agent-built',
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(store.saveRequest).toBe(before + 1)
    expect(store.saveOptions).toEqual({ name: 'T2DM cohort', description: 'agent-built' })
  })

  it('saveCohort proposal → no-op (no saveRequest bump) when no current cohort exists', async () => {
    const store = useCohortStore()
    const before = store.saveRequest

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'saveCohort', name: 'Whatever' },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(store.saveRequest).toBe(before)
  })

  it('saveCohort proposal → resolves the callbackId with the saved cohort summary', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    const bus = getHostMessageBus('pythia-plugin')!
    const handleResponseSpy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'saveCohort', name: 'X' },
      },
      callbackId: 'cb-save-1',
      timestamp: new Date(),
    })

    await flush()
    // Editor would normally answer; simulate it here.
    store.notifySaved({ id: 77, name: 'X' })
    await flush()

    expect(handleResponseSpy).toHaveBeenCalledWith('cb-save-1', { id: 77, name: 'X' })
  })

  it('navigate to cohort-new → requestNewCohort bumps newCohortSignal and resets', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    const before = store.newCohortSignal

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'navigate', route: { name: 'cohort-new' } },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(store.newCohortSignal).toBe(before + 1)
    expect(router.push).toHaveBeenCalledWith({ name: 'cohort-new', params: {} })
  })

  it('applyProposal with callbackId but no current cohort still resolves the caller', async () => {
    const bus = getHostMessageBus('pythia-plugin')!
    const handleResponseSpy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'saveCohort' },
      },
      callbackId: 'cb-resolve-empty',
      timestamp: new Date(),
    })

    await flush()
    // handleSaveCohort returns void → bridge still resolves caller with {} so
    // the agent isn't left hanging.
    expect(handleResponseSpy).toHaveBeenCalledWith('cb-resolve-empty', {})
  })

  it('applyProposalDirect applies a proposal into the cohort store', async () => {
    await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 180, postDays: 60 },
    } as never)

    const store = useCohortStore()
    expect(store.currentCohort?.observationPeriod).toEqual({ priorDays: 180, postDays: 60 })
  })

  it('routes capability.apply through translate + apply and responds via the bus', async () => {
    const bus = getHostMessageBus('pythia-plugin')
    const handleResponseSpy = vi.spyOn(bus!, 'handleResponse')

    dispatchPluginMessage({
      type: 'capability.apply',
      sourcePluginId: 'pythia-plugin',
      payload: { name: 'set_observation_window', args: { priorDays: 90, postDays: 45 } },
      callbackId: 'cap-cb-1',
      timestamp: new Date(),
    })

    await flush()
    const store = useCohortStore()
    expect(store.currentCohort?.observationPeriod).toEqual({ priorDays: 90, postDays: 45 })
    expect(handleResponseSpy).toHaveBeenCalledWith(
      'cap-cb-1',
      expect.objectContaining({ applied: true, kind: 'setObservationPeriod' })
    )
  })

  it('capability.apply reports applied:false for an unknown capability', async () => {
    const bus = getHostMessageBus('pythia-plugin')
    const handleResponseSpy = vi.spyOn(bus!, 'handleResponse')

    dispatchPluginMessage({
      type: 'capability.apply',
      sourcePluginId: 'pythia-plugin',
      payload: { name: 'not_a_real_capability', args: {} },
      callbackId: 'cap-cb-2',
      timestamp: new Date(),
    })

    await flush()
    expect(handleResponseSpy).toHaveBeenCalledWith('cap-cb-2', { applied: false })
  })
})

// Regression: Pythia builds several cohorts in a row without the route ever
// changing (it stays on cohort-new). The bridge used to skip the reset in that
// case and, when it did reset, called the store's plain createNewCohort — which
// clears the store but leaves the MOUNTED editor's local refs alone. The user
// watched one editor accumulate three entry criteria while three separate
// cohorts were saved underneath.
describe('editor starts blank for each new cohort', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
  })

  it('signals the mounted editor rather than silently resetting the store', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    const before = store.newCohortSignal

    // Simulate ATLAS being on some other route, which always forced a reset.
    vi.mocked(router).currentRoute = { value: { name: 'cohorts' } } as never
    applyProposalDirect({
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'ConditionOccurrence', conceptSet: { id: 'x', name: 'Sinusitis', items: [] } },
    } as never)

    // requestNewCohort bumps the signal CohortBuilder watches; createNewCohort
    // does not. That bump is the whole fix.
    expect(store.newCohortSignal).toBeGreaterThan(before)
  })
})

// generate_analysis: the agent can run a saved analysis rather than telling the
// user to click Generate. The bridge resolves the source, calls the service, and
// tells the workbench to start polling — a run started this way is otherwise
// invisible until a manual reload.
describe('generateAnalysis', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
    vi.mocked(generatePathway).mockReset()
    const { useWebAPIStore } = await import('@/stores/webapi')
    const webapi = useWebAPIStore()
    webapi.sources = [{ sourceKey: 'EUNOMIA', sourceName: 'Eunomia' }] as never
    webapi.selectedSource = 'EUNOMIA'
  })

  it('runs a saved pathway on the explicit source and signals the workbench', async () => {
    vi.mocked(generatePathway).mockResolvedValue({ success: true, data: null } as never)
    const { usePathwayStore } = await import('@/stores/pathway')
    const pathwayStore = usePathwayStore()
    const before = pathwayStore.agentGenerationSignal

    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'pathway', analysisId: 12, sourceKey: 'EUNOMIA' },
    } as never)

    expect(generatePathway).toHaveBeenCalledWith(12, 'EUNOMIA')
    expect(pathwayStore.agentGenerationSignal).toBeGreaterThan(before)
  })

  it('falls back to the source the user is working against', async () => {
    vi.mocked(generatePathway).mockResolvedValue({ success: true, data: null } as never)
    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'pathway', analysisId: 7 },
    } as never)
    expect(generatePathway).toHaveBeenCalledWith(7, 'EUNOMIA')
  })

  it('does not signal the workbench when the run could not be started', async () => {
    vi.mocked(generatePathway).mockResolvedValue({ success: false, error: 'boom' } as never)
    const { usePathwayStore } = await import('@/stores/pathway')
    const pathwayStore = usePathwayStore()
    const before = pathwayStore.agentGenerationSignal

    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'pathway', analysisId: 12 },
    } as never)

    expect(pathwayStore.agentGenerationSignal).toBe(before)
  })

  it('reports unsupported analysis types instead of silently doing nothing', async () => {
    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'characterization', analysisId: 4 },
    } as never)
    expect(generatePathway).not.toHaveBeenCalled()
  })

  it('says so when there is no source to run against', async () => {
    const { useWebAPIStore } = await import('@/stores/webapi')
    const webapi = useWebAPIStore()
    webapi.sources = [] as never
    webapi.selectedSource = ''
    vi.spyOn(webapi, 'fetchSources').mockResolvedValue(undefined as never)
    const danger = vi.spyOn(useNotifications(), 'danger')

    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'pathway', analysisId: 12 },
    } as never)

    expect(generatePathway).not.toHaveBeenCalled()
    expect(danger).toHaveBeenCalledWith(expect.stringContaining('no data source'))
  })

  it('surfaces a thrown generation error rather than failing silently', async () => {
    vi.mocked(generatePathway).mockRejectedValue(new Error('gateway down'))
    const danger = vi.spyOn(useNotifications(), 'danger')
    const { usePathwayStore } = await import('@/stores/pathway')
    const before = usePathwayStore().agentGenerationSignal

    await applyProposalDirect({
      kind: 'generateAnalysis',
      payload: { analysisType: 'pathway', analysisId: 12 },
    } as never)

    expect(danger).toHaveBeenCalledWith(expect.stringContaining('gateway down'))
    expect(usePathwayStore().agentGenerationSignal).toBe(before)
  })
})
