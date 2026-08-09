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
// handleSaveCohort awaits a route check before it calls requestSave, so the
// editor's answer has to wait for the request to actually be registered.
async function completeSave(
  store: { saveRequest: number; notifySaved: (r: { id?: number; name?: string }) => void },
  result: { id?: number; name?: string },
) {
  const before = store.saveRequest
  for (let i = 0; i < 50 && store.saveRequest === before; i++) {
    await new Promise(r => setTimeout(r, 5))
  }
  store.notifySaved(result)
}

describe('editor starts blank for each new cohort', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
  })

  // The trigger used to be "any proposal while not on /cohorts/new", which is
  // what discarded the cohort on screen after the first save. The reset itself
  // is still right when the agent starts the NEXT cohort after saving one, and
  // it must still go through requestNewCohort so the mounted editor re-syncs —
  // that is what this covers.
  it('signals the mounted editor rather than silently resetting the store', async () => {
    const { useCohortStore } = await import('@/stores/cohort')
    const store = useCohortStore()
    store.createNewCohort()
    vi.mocked(router).currentRoute = { value: { name: 'cohort-edit', params: { id: '83' } } } as never
    // The editor answers a save request via notifySaved; without one mounted
    // the promise would sit until its fallback timer.
    const saved = applyProposalDirect({ kind: 'saveCohort' } as never)
    await completeSave(store as never, { id: 83, name: 'saved cohort' })
    await saved

    const before = store.newCohortSignal
    await applyProposalDirect({
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

// Regression: every cohort proposal arriving while the route was not
// /cohorts/new reset the editor first. After the first save the route is
// cohort-edit, so the observation window wiped the entry event and each
// inclusion rule wiped the one before it — the agent could not add anything to
// a cohort it had just saved, and the saved definition kept only whatever the
// last proposal happened to leave. A new definition always begins with its
// entry event, so that is what marks the next artifact.
describe('building on a cohort that is already saved', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'cohort-edit', params: { id: '83' } }
  })

  it('adds to the open cohort instead of resetting it', async () => {
    const store = useCohortStore()
    store.createNewCohort()
    const reset = vi.spyOn(store, 'requestNewCohort')

    await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 0 },
    } as never)

    expect(reset).not.toHaveBeenCalled()
    expect(store.currentCohort?.observationPeriod?.priorDays).toBe(365)
  })

  it('keeps earlier criteria when several proposals arrive in a row', async () => {
    const store = useCohortStore()
    store.createNewCohort()

    await applyProposalDirect({
      kind: 'addEntryEvent',
      event: { id: 'e1', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'Ibuprofen', items: [] } },
    } as never)
    await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 365, postDays: 0 },
    } as never)
    await applyProposalDirect({
      kind: 'addInclusionRule',
      rule: { id: 'r1', name: 'Osteoarthritis before index', criteriaGroups: [] },
    } as never)
    await applyProposalDirect({
      kind: 'addInclusionRule',
      rule: { id: 'r2', name: 'Exclude prior GI bleed', criteriaGroups: [] },
    } as never)

    const c = store.currentCohort
    expect(c?.entryEvents).toHaveLength(1)
    expect(c?.observationPeriod?.priorDays).toBe(365)
    expect(c?.inclusionRules).toHaveLength(2)
  })
})

// Two more cases of the same shape as the reset bug: state the user or the
// agent had already built, discarded with no failure anywhere.
describe('proposals never discard work that is already open', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    createHostMessageBus('pythia-plugin')
  })

  it('does not wipe a cohort the user opened after the agent saved a different one', async () => {
    const store = useCohortStore()
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'cohort-edit', params: { id: '83' } }
    store.createNewCohort()
    // The agent saves cohort 83 …
    const saved = applyProposalDirect({ kind: 'saveCohort' } as never)
    await completeSave(store as never, { id: 83, name: 'saved cohort' })
    await saved
    // … then the user opens cohort 42 and asks for a different entry event.
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'cohort-edit', params: { id: '42' } }
    store.createNewCohort()
    store.currentCohort!.name = 'Cohort 42 the user opened'
    const reset = vi.spyOn(store, 'requestNewCohort')

    await applyProposalDirect({
      kind: 'addEntryEvent',
      event: { id: 'e9', criteriaType: 'DrugExposure', conceptSet: { id: 0, name: 'Naproxen', items: [] } },
    } as never)

    expect(reset).not.toHaveBeenCalled()
    expect(store.currentCohort?.name).toBe('Cohort 42 the user opened')
  })

  it('adds to an in-progress cohort even when the user is on another page', async () => {
    const store = useCohortStore()
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'concept-sets', params: {} }
    store.createNewCohort()
    store.currentCohort!.name = 'half-built cohort'
    const reset = vi.spyOn(store, 'requestNewCohort')

    await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 180, postDays: 0 },
    } as never)

    expect(reset).not.toHaveBeenCalled()
    expect(store.currentCohort?.name).toBe('half-built cohort')
    expect(store.currentCohort?.observationPeriod?.priorDays).toBe(180)
  })

  it('still creates a cohort when there is nothing open at all', async () => {
    const store = useCohortStore()
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'home', params: {} }
    store.clearCohort()

    await applyProposalDirect({
      kind: 'setObservationPeriod',
      observationPeriod: { priorDays: 90, postDays: 0 },
    } as never)

    expect(store.currentCohort).toBeTruthy()
    expect(store.currentCohort?.observationPeriod?.priorDays).toBe(90)
  })
})
