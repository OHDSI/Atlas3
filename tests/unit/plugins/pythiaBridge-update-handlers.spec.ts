import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/router', () => ({
  default: {
    push: vi.fn().mockResolvedValue(undefined),
    currentRoute: { value: { name: 'home', params: {} } },
  },
}))

// The bridge imports these create-* helpers at module scope; they are not
// exercised by the update handlers but must be stubbed so the module loads
// without hitting real WebAPI code paths.
vi.mock('@/services/concept-set.service', () => ({
  createConceptSet: vi.fn(),
}))
vi.mock('@/services/feature-analysis.service', () => ({
  createFeatureAnalysis: vi.fn(),
}))
vi.mock('@/services/characterization.service', () => ({
  createCharacterization: vi.fn(),
}))
vi.mock('@/services/webapi', () => ({
  createPathway: vi.fn(),
  createIncidenceRate: vi.fn(),
}))

import router from '@/router'
import { createConceptSet } from '@/services/concept-set.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createCharacterization } from '@/services/characterization.service'
import { createPathway, createIncidenceRate } from '@/services/webapi'
import { setupPythiaBridge } from '@/plugins/host/pythiaBridge'
import { ApiError } from '@/services/api-error'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePathwayStore } from '@/stores/pathway'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { createHostMessageBus, getHostMessageBus } from '@/plugins/messaging/HostMessageBus'

function dispatchPluginMessage(detail: unknown) {
  window.dispatchEvent(new CustomEvent('plugin-message', { detail }))
}

// Wait one microtask for the bridge's async handler to settle. The update
// handlers chain at least one awaited store call plus an awaited router.push,
// so two flushes is sufficient.
const flush = async () => {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

describe('pythiaBridge update-existing handlers', () => {
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
    // Reset the currentRoute name to something that is NOT the editor route
    // for any update handler, so the auto-navigate branch always runs.
    ;(router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'home', params: {} }
  })

  // -------------------------------------------------------------------------
  // updateConceptSet
  // -------------------------------------------------------------------------

  it('updateConceptSet → fetches set, calls applyProposal, navigates to concepts', async () => {
    const store = useConceptSetsStore()
    const fetchOne = vi
      .spyOn(store, 'fetchOne')
      .mockImplementation(async () => {
        // Seed currentSet so the not-found guard passes.
        (store as unknown as { currentSet: unknown }).currentSet = {
          id: 5,
          name: 'Statins',
          description: '',
          items: [],
        }
      })
    const applyProposal = vi
      .spyOn(store, 'applyProposal')
      .mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateConceptSet',
          payload: {
            id: 5,
            name: 'Statins (revised)',
            description: 'updated by pythia',
            items: [
              {
                conceptId: 1234,
                conceptName: 'Atorvastatin',
                domain: 'Drug',
                isExcluded: false,
                includeDescendants: true,
              },
            ],
            itemsToAdd: [
              {
                conceptId: 9999,
                conceptName: 'Simvastatin',
              },
            ],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()

    expect(fetchOne).toHaveBeenCalledWith(5)
    expect(applyProposal).toHaveBeenCalledOnce()
    const arg = applyProposal.mock.calls[0][0] as {
      name?: string
      items?: Array<{ conceptId: number }>
      itemsToAdd?: Array<{ conceptId: number }>
    }
    expect(arg.name).toBe('Statins (revised)')
    expect(arg.items?.[0].conceptId).toBe(1234)
    expect(arg.itemsToAdd?.[0].conceptId).toBe(9999)
    expect(router.push).toHaveBeenCalledWith({ name: 'concepts' })
  })

  it('updateConceptSet → no-op + warning when payload.id is missing', async () => {
    const store = useConceptSetsStore()
    const fetchOne = vi.spyOn(store, 'fetchOne').mockResolvedValue(undefined as never)
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateConceptSet',
          payload: { name: 'no id' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(fetchOne).not.toHaveBeenCalled()
    expect(applyProposal).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('updateConceptSet → bails when store cannot load the set', async () => {
    const store = useConceptSetsStore()
    const fetchOne = vi
      .spyOn(store, 'fetchOne')
      .mockResolvedValue(undefined as never)
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    // currentSet stays null after fetchOne, so the handler should short-circuit
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateConceptSet',
          payload: { id: 404 },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(fetchOne).toHaveBeenCalledWith(404)
    expect(applyProposal).not.toHaveBeenCalled()
    expect(router.push).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // updateFeatureAnalysis
  // -------------------------------------------------------------------------

  it('updateFeatureAnalysis → fetches, applies, navigates to feature-analysis-edit', async () => {
    const store = useFeatureAnalysesStore()
    vi.spyOn(store, 'fetchOne').mockImplementation(async () => {
      (store as unknown as { currentFA: unknown }).currentFA = {
        id: 11,
        name: 'Demographics',
        type: 'PRESET',
        design: 'demographics-age-group',
      }
    })
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateFeatureAnalysis',
          payload: {
            id: 11,
            name: 'Demographics v2',
            description: 'updated',
            type: 'PRESET',
            domain: 'Drug',
            statType: 'PREVALENCE',
            design: 'demographics-age-group',
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(applyProposal).toHaveBeenCalledOnce()
    const arg = applyProposal.mock.calls[0][0] as { name?: string; domain?: string }
    expect(arg.name).toBe('Demographics v2')
    expect(arg.domain).toBe('Drug')
    expect(router.push).toHaveBeenCalledWith({
      name: 'feature-analysis-edit',
      params: { id: '11' },
    })
  })

  it('updateFeatureAnalysis → does not navigate when applyProposal returns false', async () => {
    const store = useFeatureAnalysesStore()
    vi.spyOn(store, 'fetchOne').mockImplementation(async () => {
      (store as unknown as { currentFA: unknown }).currentFA = {
        id: 11,
        name: 'Demographics',
        type: 'PRESET',
        design: 'demographics-age-group',
      }
    })
    vi.spyOn(store, 'applyProposal').mockReturnValue(false)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateFeatureAnalysis',
          payload: { id: 11, name: 'No change' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // updateCharacterization
  // -------------------------------------------------------------------------

  it('updateCharacterization → fetches, applies, navigates to characterization-edit', async () => {
    const store = useCharacterizationStore()
    vi.spyOn(store, 'fetchOne').mockImplementation(async () => {
      (store as unknown as { currentCharacterization: unknown }).currentCharacterization = {
        id: 22,
        name: 'Baseline',
        cohorts: [],
        featureAnalyses: [],
        stratas: [],
      }
    })
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateCharacterization',
          payload: {
            id: 22,
            name: 'Baseline v2',
            description: 'updated',
            cohorts: [{ id: 1, name: 'T2DM' }],
            cohortsToAdd: [{ id: 2, name: 'HTN' }],
            featureAnalyses: [{ id: 10, name: 'Demographics' }],
            featureAnalysesToAdd: [{ id: 11, name: 'Conditions' }],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(applyProposal).toHaveBeenCalledOnce()
    const arg = applyProposal.mock.calls[0][0] as {
      featureAnalyses?: Array<{ id: number; name: string }>
      featureAnalysesToAdd?: Array<{ id: number; name: string }>
    }
    expect(arg.featureAnalyses?.[0]).toEqual({ id: 10, name: 'Demographics' })
    expect(arg.featureAnalysesToAdd?.[0]).toEqual({ id: 11, name: 'Conditions' })
    expect(router.push).toHaveBeenCalledWith({
      name: 'characterization-edit',
      params: { id: '22' },
    })
  })

  it('updateCharacterization → coerces feature-analysis name to empty string when missing', async () => {
    const store = useCharacterizationStore()
    vi.spyOn(store, 'fetchOne').mockImplementation(async () => {
      (store as unknown as { currentCharacterization: unknown }).currentCharacterization = {
        id: 22,
        name: 'Baseline',
        cohorts: [],
        featureAnalyses: [],
        stratas: [],
      }
    })
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateCharacterization',
          payload: {
            id: 22,
            featureAnalyses: [{ id: 10 }],
            featureAnalysesToAdd: [{ id: 11 }],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    const arg = applyProposal.mock.calls[0][0] as {
      featureAnalyses?: Array<{ id: number; name: string }>
      featureAnalysesToAdd?: Array<{ id: number; name: string }>
    }
    expect(arg.featureAnalyses?.[0]).toEqual({ id: 10, name: '' })
    expect(arg.featureAnalysesToAdd?.[0]).toEqual({ id: 11, name: '' })
  })

  // -------------------------------------------------------------------------
  // updatePathway
  // -------------------------------------------------------------------------

  it('updatePathway → loads, applies, navigates to pathway-edit', async () => {
    const store = usePathwayStore()
    vi.spyOn(store, 'loadPathway').mockImplementation(async () => {
      (store as unknown as { currentPathway: unknown }).currentPathway = {
        id: 33,
        name: 'Antidiabetics',
        targetCohorts: [],
        eventCohorts: [],
        tags: [],
      }
      return true
    })
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updatePathway',
          payload: {
            id: 33,
            name: 'Antidiabetics v2',
            combinationWindow: 90,
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(applyProposal).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'pathway-edit',
      params: { id: '33' },
    })
  })

  it('updatePathway → propagates store errors via snackbar (no throw)', async () => {
    const store = usePathwayStore()
    vi.spyOn(store, 'loadPathway').mockRejectedValue(new Error('WebAPI 500'))

    expect(() =>
      dispatchPluginMessage({
        type: 'cohort.applyProposal',
        sourcePluginId: 'pythia-plugin',
        payload: {
          proposal: {
            kind: 'updatePathway',
            payload: { id: 99 },
          },
        },
        timestamp: new Date(),
      })
    ).not.toThrow()

    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // updateIncidenceRate
  // -------------------------------------------------------------------------

  it('updateIncidenceRate → loads, applies, navigates to incidence-rate-edit', async () => {
    const store = useIncidenceRateStore()
    vi.spyOn(store, 'loadIR').mockImplementation(async () => {
      (store as unknown as { currentIR: unknown }).currentIR = {
        id: 44,
        name: 'GI bleed',
        expression: { targetIds: [], outcomeIds: [] },
      }
      return true
    })
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateIncidenceRate',
          payload: {
            id: 44,
            name: 'GI bleed v2',
            timeAtRisk: {
              start: { DateField: 'StartDate', Offset: 0 },
              end: { DateField: 'StartDate', Offset: 365 },
            },
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(applyProposal).toHaveBeenCalledOnce()
    expect(router.push).toHaveBeenCalledWith({
      name: 'incidence-rate-edit',
      params: { id: '44' },
    })
  })

  it('updateIncidenceRate → bails when payload.id is missing', async () => {
    const store = useIncidenceRateStore()
    const loadIR = vi.spyOn(store, 'loadIR').mockResolvedValue(true)
    const applyProposal = vi.spyOn(store, 'applyProposal').mockReturnValue(true)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'updateIncidenceRate',
          payload: { name: 'no id' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(loadIR).not.toHaveBeenCalled()
    expect(applyProposal).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // buildArtifactSummary (covered via cohort.getContext public path)
  // -------------------------------------------------------------------------

  it('buildArtifactSummary returns a conceptSet summary when route=concepts', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'concepts', params: {} }
    const cs = useConceptSetsStore()
    ;(cs as unknown as { currentSet: unknown }).currentSet = {
      id: 7,
      name: 'My Set',
      items: [{ conceptId: 1 }, { conceptId: 2 }],
    }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-cs',
      timestamp: new Date(),
    })

    expect(spy).toHaveBeenCalledOnce()
    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: { kind: string; id: number; name: string; summary: string } | null }
    }
    expect(response.routeContext.artifact).not.toBeNull()
    expect(response.routeContext.artifact?.kind).toBe('conceptSet')
    expect(response.routeContext.artifact?.id).toBe(7)
    expect(response.routeContext.artifact?.summary).toContain('2 item')
  })

  it('buildArtifactSummary returns a featureAnalysis summary when route=feature-analysis-edit', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'feature-analysis-edit', params: { id: '8' } }
    const fa = useFeatureAnalysesStore()
    ;(fa as unknown as { currentFA: unknown }).currentFA = {
      id: 8,
      name: 'Age',
      type: 'PRESET',
      domain: 'Demographics',
    }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-fa',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: { kind: string; summary: string } | null }
    }
    expect(response.routeContext.artifact?.kind).toBe('featureAnalysis')
    expect(response.routeContext.artifact?.summary).toContain('PRESET')
    expect(response.routeContext.artifact?.summary).toContain('Demographics')
  })

  it('buildArtifactSummary returns a characterization summary when route=characterization-edit', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'characterization-edit', params: { id: '9' } }
    const ch = useCharacterizationStore()
    ;(ch as unknown as { currentCharacterization: unknown }).currentCharacterization = {
      id: 9,
      name: 'Baseline',
      cohorts: [{ id: 1 }],
      featureAnalyses: [{ id: 10 }, { id: 11 }],
      stratas: [],
    }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-ch',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: { kind: string; summary: string } | null }
    }
    expect(response.routeContext.artifact?.kind).toBe('characterization')
    expect(response.routeContext.artifact?.summary).toContain('1 cohort')
    expect(response.routeContext.artifact?.summary).toContain('2 feature')
  })

  it('buildArtifactSummary returns a pathway summary when route=pathway-edit', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'pathway-edit', params: { id: '10' } }
    const p = usePathwayStore()
    ;(p as unknown as { currentPathway: unknown }).currentPathway = {
      id: 10,
      name: 'Antidiabetics',
      targetCohorts: [{ id: 1 }, { id: 2 }],
      eventCohorts: [{ id: 3 }],
      tags: [],
    }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-pw',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: { kind: string; summary: string } | null }
    }
    expect(response.routeContext.artifact?.kind).toBe('pathway')
    expect(response.routeContext.artifact?.summary).toContain('2 target')
    expect(response.routeContext.artifact?.summary).toContain('1 event')
  })

  it('buildArtifactSummary returns an incidenceRate summary when route=incidence-rate-edit', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'incidence-rate-edit', params: { id: '12' } }
    const ir = useIncidenceRateStore()
    ;(ir as unknown as { currentIR: unknown }).currentIR = {
      id: 12,
      name: 'GI bleed',
      expression: { targetIds: [1, 2], outcomeIds: [3] },
    }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-ir',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: { kind: string; summary: string } | null }
    }
    expect(response.routeContext.artifact?.kind).toBe('incidenceRate')
    expect(response.routeContext.artifact?.summary).toContain('2 target')
    expect(response.routeContext.artifact?.summary).toContain('1 outcome')
  })

  it('buildArtifactSummary returns null for routes not mapped to an artifact', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'home', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-none',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as {
      routeContext: { artifact: unknown }
    }
    expect(response.routeContext.artifact).toBeNull()
  })

  // -------------------------------------------------------------------------
  // notify.snackbar — small helper coverage, not an update handler
  // -------------------------------------------------------------------------

  it('notify.snackbar with an empty message is a no-op', () => {
    expect(() =>
      dispatchPluginMessage({
        type: 'notify.snackbar',
        sourcePluginId: 'pythia-plugin',
        payload: { message: '' },
        timestamp: new Date(),
      })
    ).not.toThrow()
  })

  it('notify.snackbar with a message does not throw', () => {
    expect(() =>
      dispatchPluginMessage({
        type: 'notify.snackbar',
        sourcePluginId: 'pythia-plugin',
        payload: { message: 'hi', type: 'success' },
        timestamp: new Date(),
      })
    ).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // createStandaloneConceptSet (untested elsewhere — biggest remaining gap)
  // -------------------------------------------------------------------------

  it('createStandaloneConceptSet → no cohort → creates + navigates to concepts', async () => {
    vi.mocked(createConceptSet).mockResolvedValue({
      id: 77,
      name: 'Statins',
      description: '',
      items: [],
    } as never)
    const cs = useConceptSetsStore()
    vi.spyOn(cs, 'openEditEditor').mockResolvedValue(undefined as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createStandaloneConceptSet',
          conceptSet: {
            name: 'Statins',
            description: 'lipid lowering',
            items: [
              { conceptId: 1, conceptName: 'Atorvastatin', domain: 'Drug' },
              { conceptId: 2, conceptName: 'Simvastatin' },
            ],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createConceptSet).toHaveBeenCalledOnce()
    const arg = vi.mocked(createConceptSet).mock.calls[0][0] as {
      name: string
      items: Array<{ conceptId: number }>
    }
    expect(arg.name).toBe('Statins')
    expect(arg.items).toHaveLength(2)
    expect(router.push).toHaveBeenCalledWith({ name: 'concepts' })
  })

  it('createStandaloneConceptSet → has cohort → attaches via cohort store applyProposal', async () => {
    vi.mocked(createConceptSet).mockResolvedValue({
      id: 88,
      name: 'NSAIDs',
      description: '',
      items: [{ conceptId: 1 }, { conceptId: 2 }, { conceptId: 3 }],
    } as never)

    // Seed a current cohort so the "attach to cohort" branch runs.
    const cohort = useCohortStore()
    // Intercept applyProposal so the real implementation (which expects a
    // fully-populated cohort shape including conceptSets) doesn't run.
    const cohortApply = vi.spyOn(cohort, 'applyProposal').mockReturnValue(undefined as never)
    ;(cohort as unknown as { currentCohort: unknown }).currentCohort = {
      id: 42,
      name: 'Existing cohort',
      description: '',
      entryEvents: [],
      inclusionRules: [],
      conceptSets: [],
    }

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createStandaloneConceptSet',
          conceptSet: {
            name: 'NSAIDs',
            items: [{ conceptId: 1, conceptName: 'Ibuprofen' }],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createConceptSet).toHaveBeenCalledOnce()
    // applyProposal should have been called with an addConceptSet kind
    const proposalCalls = cohortApply.mock.calls.filter(c => {
      const p = c[0] as { kind?: string }
      return p?.kind === 'addConceptSet'
    })
    expect(proposalCalls).toHaveLength(1)
    const proposal = proposalCalls[0][0] as { conceptSet: { id: number; name: string } }
    expect(proposal.conceptSet.id).toBe(88)
    expect(proposal.conceptSet.name).toBe('NSAIDs')
  })

  it('createStandaloneConceptSet → missing items shows error and does not call service', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createStandaloneConceptSet',
          conceptSet: { name: 'Empty', items: [] },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createConceptSet).not.toHaveBeenCalled()
  })

  it('createStandaloneConceptSet → service returns no id → snackbar error', async () => {
    vi.mocked(createConceptSet).mockResolvedValue({
      id: undefined as unknown as number,
      name: 'broken',
      items: [],
    } as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createStandaloneConceptSet',
          conceptSet: {
            name: 'broken',
            items: [{ conceptId: 1, conceptName: 'X' }],
          },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createConceptSet).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // create-* validation branches (missing required fields)
  // -------------------------------------------------------------------------

  it('createFeatureAnalysis → missing name → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createFeatureAnalysis',
          payload: { type: 'PRESET' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createFeatureAnalysis).not.toHaveBeenCalled()
  })

  it('createFeatureAnalysis → service returns no id → no navigate', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue({
      success: true,
      data: {
        id: undefined as unknown as number,
        name: 'no id',
        type: 'PRESET',
        design: '',
      },
    } as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createFeatureAnalysis',
          payload: { name: 'X', type: 'PRESET' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createFeatureAnalysis).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('createFeatureAnalysis → service fails → snackbar error, no navigate', async () => {
    vi.mocked(createFeatureAnalysis).mockResolvedValue({
      success: false,
      error: new ApiError('boom', 0, null),
    } as never)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createFeatureAnalysis',
          payload: { name: 'X', type: 'PRESET' },
        },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(createFeatureAnalysis).toHaveBeenCalledOnce()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('createCharacterization → missing name → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createCharacterization',
          payload: { cohorts: [{ id: 1, name: 'A' }], featureAnalyses: [{ id: 2, name: 'B' }] },
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(createCharacterization).not.toHaveBeenCalled()
  })

  it('createCharacterization → missing cohorts → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createCharacterization',
          payload: { name: 'X', featureAnalyses: [{ id: 1, name: 'A' }] },
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(createCharacterization).not.toHaveBeenCalled()
  })

  it('createCharacterization → missing featureAnalyses → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createCharacterization',
          payload: { name: 'X', cohorts: [{ id: 1, name: 'A' }] },
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(createCharacterization).not.toHaveBeenCalled()
  })

  it('createPathway → missing name → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createPathway',
          payload: {},
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(createPathway).not.toHaveBeenCalled()
  })

  it('createIncidenceRate → missing name → no service call', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'createIncidenceRate',
          payload: {},
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(createIncidenceRate).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // navigate proposal — route name missing
  // -------------------------------------------------------------------------

  it('navigate proposal → no router.push when route.name is missing', async () => {
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'navigate', route: {} },
      },
      timestamp: new Date(),
    })

    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // applyProposal with no payload — early-return guard
  // -------------------------------------------------------------------------

  it('applyProposal with empty payload is a safe no-op', () => {
    expect(() =>
      dispatchPluginMessage({
        type: 'cohort.applyProposal',
        sourcePluginId: 'pythia-plugin',
        payload: {},
        timestamp: new Date(),
      })
    ).not.toThrow()
  })

  // -------------------------------------------------------------------------
  // pythia.applyProposal alias — confirm both type strings reach the handler
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // buildArtifactSummary — null-currentX branches for each kind
  // -------------------------------------------------------------------------

  it('buildArtifactSummary returns null when route maps to conceptSet but currentSet is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'concepts', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-cs-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  it('buildArtifactSummary returns null when route maps to featureAnalysis but currentFA is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'feature-analysis-edit', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-fa-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  it('buildArtifactSummary returns null when route maps to characterization but currentCharacterization is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'characterization-edit', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-ch-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  it('buildArtifactSummary returns null when route maps to pathway but currentPathway is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'pathway-edit', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-pw-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  it('buildArtifactSummary returns null when route maps to incidenceRate but currentIR is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'incidence-rate-edit', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-ir-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  it('buildArtifactSummary returns null when route maps to cohort but currentCohort is null', () => {
    (router as unknown as { currentRoute: { value: { name: string; params: object } } })
      .currentRoute.value = { name: 'cohort-edit', params: {} }

    const bus = getHostMessageBus('pythia-plugin')!
    const spy = vi.spyOn(bus, 'handleResponse')

    dispatchPluginMessage({
      type: 'cohort.getContext',
      sourcePluginId: 'pythia-plugin',
      payload: {},
      callbackId: 'cb-cohort-null',
      timestamp: new Date(),
    })

    const response = spy.mock.calls[0][1] as { routeContext: { artifact: unknown } }
    expect(response.routeContext.artifact).toBeNull()
  })

  // -------------------------------------------------------------------------
  // update handlers — catch-block path (applyProposal throws)
  // -------------------------------------------------------------------------

  it('updateConceptSet → applyProposal throws → snackbar, no navigate', async () => {
    const store = useConceptSetsStore()
    vi.spyOn(store, 'fetchOne').mockImplementation(async () => {
      (store as unknown as { currentSet: unknown }).currentSet = {
        id: 5,
        name: 'X',
        items: [],
      }
    })
    vi.spyOn(store, 'applyProposal').mockImplementation(() => {
      throw new Error('boom')
    })

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateConceptSet', payload: { id: 5 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('updateFeatureAnalysis → bails when payload.id is missing', async () => {
    const store = useFeatureAnalysesStore()
    const fetchOne = vi.spyOn(store, 'fetchOne')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateFeatureAnalysis', payload: { name: 'no id' } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(fetchOne).not.toHaveBeenCalled()
  })

  it('updateFeatureAnalysis → bails when load yields no currentFA', async () => {
    const store = useFeatureAnalysesStore()
    vi.spyOn(store, 'fetchOne').mockResolvedValue(undefined as never)
    const applyProposal = vi.spyOn(store, 'applyProposal')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateFeatureAnalysis', payload: { id: 404 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(applyProposal).not.toHaveBeenCalled()
  })

  it('updateCharacterization → bails when payload.id is missing', async () => {
    const store = useCharacterizationStore()
    const fetchOne = vi.spyOn(store, 'fetchOne')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateCharacterization', payload: { name: 'no id' } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(fetchOne).not.toHaveBeenCalled()
  })

  it('updateCharacterization → bails when load yields no currentCharacterization', async () => {
    const store = useCharacterizationStore()
    vi.spyOn(store, 'fetchOne').mockResolvedValue(undefined as never)
    const applyProposal = vi.spyOn(store, 'applyProposal')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateCharacterization', payload: { id: 404 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(applyProposal).not.toHaveBeenCalled()
  })

  it('updatePathway → bails when payload.id is missing', async () => {
    const store = usePathwayStore()
    const loadPathway = vi.spyOn(store, 'loadPathway')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updatePathway', payload: { name: 'no id' } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(loadPathway).not.toHaveBeenCalled()
  })

  it('updatePathway → bails when load yields no currentPathway', async () => {
    const store = usePathwayStore()
    vi.spyOn(store, 'loadPathway').mockResolvedValue(false as never)
    const applyProposal = vi.spyOn(store, 'applyProposal')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updatePathway', payload: { id: 404 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(applyProposal).not.toHaveBeenCalled()
  })

  it('updatePathway → no router.push when applyProposal returns false', async () => {
    const store = usePathwayStore()
    vi.spyOn(store, 'loadPathway').mockImplementation(async () => {
      (store as unknown as { currentPathway: unknown }).currentPathway = {
        id: 33,
        name: 'X',
        targetCohorts: [],
        eventCohorts: [],
        tags: [],
      }
      return true
    })
    vi.spyOn(store, 'applyProposal').mockReturnValue(false)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updatePathway', payload: { id: 33 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('updateIncidenceRate → bails when load yields no currentIR', async () => {
    const store = useIncidenceRateStore()
    vi.spyOn(store, 'loadIR').mockResolvedValue(false as never)
    const applyProposal = vi.spyOn(store, 'applyProposal')
    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateIncidenceRate', payload: { id: 404 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(applyProposal).not.toHaveBeenCalled()
  })

  it('updateIncidenceRate → no router.push when applyProposal returns false', async () => {
    const store = useIncidenceRateStore()
    vi.spyOn(store, 'loadIR').mockImplementation(async () => {
      (store as unknown as { currentIR: unknown }).currentIR = {
        id: 44,
        name: 'X',
        expression: { targetIds: [], outcomeIds: [] },
      }
      return true
    })
    vi.spyOn(store, 'applyProposal').mockReturnValue(false)

    dispatchPluginMessage({
      type: 'cohort.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: { kind: 'updateIncidenceRate', payload: { id: 44 } },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(router.push).not.toHaveBeenCalled()
  })

  it('pythia.applyProposal alias also routes through the dispatcher', async () => {
    dispatchPluginMessage({
      type: 'pythia.applyProposal',
      sourcePluginId: 'pythia-plugin',
      payload: {
        proposal: {
          kind: 'navigate',
          route: { name: 'home', params: {} },
        },
      },
      timestamp: new Date(),
    })
    await flush()
    expect(router.push).toHaveBeenCalledWith({ name: 'home', params: {} })
  })
})
