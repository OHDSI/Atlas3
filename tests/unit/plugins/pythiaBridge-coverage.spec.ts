import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'
import type { CohortExpression } from '@/models/circe-types'
import type { AgentProposal } from '@/models/agent.types'

vi.mock('vue', async importOriginal => {
  const actual = await importOriginal<typeof import('vue')>()
  return { ...actual, nextTick: vi.fn(actual.nextTick) }
})

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
vi.mock('@/plugins/messaging/HostMessageBus', () => ({
  getHostMessageBus: vi.fn(),
}))
vi.mock('@/plugins/host/capabilities/apply', () => ({
  applyCapability: vi.fn(),
}))

import router from '@/router'
import { createConceptSet, getConceptSetById } from '@/services/concept-set.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createCharacterization } from '@/services/characterization.service'
import { createPathway, generatePathway } from '@/services/pathway.service'
import { createIncidenceRate } from '@/services/incidence-rate.service'
import { getHostMessageBus } from '@/plugins/messaging/HostMessageBus'
import { applyCapability } from '@/plugins/host/capabilities/apply'
import { setupPythiaBridge, applyProposalDirect } from '@/plugins/host/pythiaBridge'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useDataSourcesStore } from '@/stores/datasources'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePathwayStore } from '@/stores/pathway'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useNotifications } from '@/stores/notifications'
import { useWebAPIStore } from '@/stores/webapi'

interface RouteValue {
  name?: string
  params?: Record<string, string>
}

type AnyFn = (...args: unknown[]) => unknown

let bus: { handleResponse: ReturnType<typeof vi.fn> }

function setRoute(value: RouteValue) {
  (router as unknown as { currentRoute: { value: RouteValue } }).currentRoute.value = value
}

function dispatch(detail: unknown) {
  window.dispatchEvent(new CustomEvent('plugin-message', { detail }))
}

function message(type: string, payload?: unknown, callbackId?: string) {
  return { type, sourcePluginId: 'pythia-plugin', payload, callbackId, timestamp: new Date() }
}

// Listener exceptions never reach dispatchEvent's caller; jsdom reports them on window.
function listenerErrors(run: () => void): unknown[] {
  const errors: unknown[] = []
  const onError = (e: ErrorEvent) => {
    errors.push(e.error)
    e.preventDefault()
  }
  window.addEventListener('error', onError)
  try {
    run()
  } finally {
    window.removeEventListener('error', onError)
  }
  return errors
}

const flush = async () => {
  for (let i = 0; i < 4; i++) await new Promise<void>(resolve => setTimeout(resolve, 0))
}

function notes() {
  return useNotifications().items.map(i => ({ severity: i.severity, title: i.title }))
}

function attachEditor() {
  const store = useCohortStore()
  store.createNewCohort()
  store.attachExpression(ref<CohortExpression>({}))
  return store
}

function setState(store: object, key: string, value: unknown) {
  (store as Record<string, unknown>)[key] = value
}

function spy(store: object, method: string) {
  return vi.spyOn(store as Record<string, AnyFn>, method)
}

function apply(proposal: unknown) {
  return applyProposalDirect(proposal as AgentProposal)
}

function contextResponse(): Record<string, unknown> {
  dispatch(message('cohort.getContext', {}, 'ctx'))
  expect(bus.handleResponse).toHaveBeenCalledOnce()
  const [callbackId, response] = bus.handleResponse.mock.calls[0]!
  expect(callbackId).toBe('ctx')
  return response as Record<string, unknown>
}

function artifact() {
  return (contextResponse().routeContext as { artifact: unknown }).artifact
}

describe('pythiaBridge coverage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setupPythiaBridge()
    bus = { handleResponse: vi.fn() }
    vi.mocked(getHostMessageBus).mockReset().mockReturnValue(bus as never)
    vi.mocked(router.push).mockReset().mockResolvedValue(undefined as never)
    vi.mocked(nextTick).mockClear()
    vi.mocked(applyCapability).mockReset()
    vi.mocked(createConceptSet).mockReset()
    vi.mocked(getConceptSetById).mockReset()
    vi.mocked(createFeatureAnalysis).mockReset()
    vi.mocked(createCharacterization).mockReset()
    vi.mocked(createPathway).mockReset()
    vi.mocked(generatePathway).mockReset()
    vi.mocked(createIncidenceRate).mockReset()
    setRoute({ name: 'home', params: {} })
  })

  describe('message routing', () => {
    it('ignores messages from other plugins', () => {
      dispatch({ ...message('notify.snackbar', { message: 'hi' }), sourcePluginId: 'other-plugin' })
      expect(notes()).toEqual([])
    })

    it('ignores an event that carries no detail', () => {
      expect(listenerErrors(() => window.dispatchEvent(new CustomEvent('plugin-message')))).toEqual([])
    })

    it('installs its listener only once', () => {
      setupPythiaBridge()
      dispatch(message('notify.snackbar', { message: 'once' }))
      expect(notes()).toEqual([{ severity: 'info', title: 'once' }])
    })

    it('notify.snackbar shows the message with the requested severity', () => {
      dispatch(message('notify.snackbar', { message: 'done', type: 'success' }))
      dispatch(message('notify.snackbar', { message: 'careful', type: 'warning' }))
      dispatch(message('notify.snackbar', { message: 'broken', type: 'error' }))
      dispatch(message('notify.snackbar', { message: 'fyi' }))
      expect(notes()).toEqual([
        { severity: 'success', title: 'done' },
        { severity: 'warning', title: 'careful' },
        { severity: 'danger', title: 'broken' },
        { severity: 'info', title: 'fyi' },
      ])
    })

    it('notify.snackbar without a payload shows nothing', () => {
      expect(listenerErrors(() => dispatch(message('notify.snackbar')))).toEqual([])
      expect(notes()).toEqual([])
    })

    it('app.getContext is answered like cohort.getContext', () => {
      dispatch(message('app.getContext', {}, 'ctx-app'))
      expect(bus.handleResponse).toHaveBeenCalledWith(
        'ctx-app',
        expect.objectContaining({ route: { name: 'home', params: {} } }),
      )
    })

    it('getContext without a callbackId sends nothing', () => {
      dispatch(message('cohort.getContext', {}))
      expect(bus.handleResponse).not.toHaveBeenCalled()
    })

    it('getContext with no plugin bus does not throw', () => {
      vi.mocked(getHostMessageBus).mockReturnValue(undefined)
      expect(listenerErrors(() => dispatch(message('cohort.getContext', {}, 'ctx')))).toEqual([])
    })

    it('applyProposal without a callbackId sends no response', async () => {
      dispatch(message('cohort.applyProposal', { proposal: { kind: 'saveCohort' } }))
      await flush()
      expect(bus.handleResponse).not.toHaveBeenCalled()
    })

    it('applyProposal with no proposal still answers the caller', async () => {
      dispatch(message('pythia.applyProposal', undefined, 'cb-empty'))
      await flush()
      expect(bus.handleResponse).toHaveBeenCalledWith('cb-empty', {})
    })

    it('applyProposal with no plugin bus completes without answering', async () => {
      vi.mocked(getHostMessageBus).mockReturnValue(undefined)
      dispatch(message('cohort.applyProposal', { proposal: { kind: 'saveCohort' } }, 'cb-x'))
      await flush()
      expect(bus.handleResponse).not.toHaveBeenCalled()
    })
  })

  describe('capability.apply', () => {
    it('forwards the capability result to the caller', async () => {
      vi.mocked(applyCapability).mockResolvedValue({ applied: true, kind: 'addEntryEvent' } as never)
      dispatch(message('capability.apply', { name: 'set_entry_event', args: { a: 1 } }, 'cap-1'))
      await flush()
      expect(applyCapability).toHaveBeenCalledWith('set_entry_event', { a: 1 })
      expect(bus.handleResponse).toHaveBeenCalledWith('cap-1', { applied: true, kind: 'addEntryEvent' })
    })

    it('reports applied:false when the capability throws', async () => {
      vi.mocked(applyCapability).mockRejectedValue(new Error('boom'))
      dispatch(message('capability.apply', { name: 'set_entry_event', args: {} }, 'cap-2'))
      await flush()
      expect(bus.handleResponse).toHaveBeenCalledWith('cap-2', { applied: false })
    })

    it('sends nothing without a callbackId', async () => {
      vi.mocked(applyCapability).mockResolvedValue({ applied: true } as never)
      dispatch(message('capability.apply', { name: 'set_entry_event', args: {} }))
      await flush()
      expect(applyCapability).toHaveBeenCalledOnce()
      expect(bus.handleResponse).not.toHaveBeenCalled()
    })

    it('completes without a plugin bus', async () => {
      vi.mocked(getHostMessageBus).mockReturnValue(undefined)
      vi.mocked(applyCapability).mockResolvedValue({ applied: true } as never)
      dispatch(message('capability.apply', { name: 'set_entry_event', args: {} }, 'cap-3'))
      await flush()
      expect(bus.handleResponse).not.toHaveBeenCalled()
    })
  })

  describe('generateAnalysis', () => {
    function generate(payload: Record<string, unknown>) {
      return apply({ kind: 'generateAnalysis', payload })
    }

    function webapiWith(sources: string[], selected: string | null) {
      const store = useWebAPIStore()
      setState(store, 'sources', sources.map(sourceKey => ({ sourceKey })))
      setState(store, 'selectedSource', selected)
      return store
    }

    it('refuses when no source can be found, after trying to fetch sources', async () => {
      const store = webapiWith([], null)
      const fetchSources = spy(store, 'fetchSources').mockResolvedValue(undefined)

      const res = await generate({ analysisType: 'pathway', analysisId: 9 })

      expect(res).toBeUndefined()
      expect(fetchSources).toHaveBeenCalledOnce()
      expect(generatePathway).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Cannot generate: no data source selected' }])
    })

    it('does not refetch sources that are already loaded', async () => {
      const store = webapiWith(['FIRST'], 'SEL')
      const fetchSources = spy(store, 'fetchSources').mockResolvedValue(undefined)
      vi.mocked(generatePathway).mockResolvedValue({ success: true, data: null } as never)

      await generate({ analysisType: 'pathway', analysisId: 9 })

      expect(fetchSources).not.toHaveBeenCalled()
    })

    it('prefers the payload source, then the selected source, then the first source', async () => {
      vi.mocked(generatePathway).mockResolvedValue({ success: true, data: null } as never)

      webapiWith(['FIRST'], 'SEL')
      await generate({ analysisType: 'pathway', analysisId: 1, sourceKey: 'PAY' })
      await generate({ analysisType: 'pathway', analysisId: 2 })
      webapiWith(['FIRST'], null)
      await generate({ analysisType: 'pathway', analysisId: 3 })

      expect(vi.mocked(generatePathway).mock.calls).toEqual([
        [1, 'PAY'],
        [2, 'SEL'],
        [3, 'FIRST'],
      ])
    })

    it('warns that non-pathway analyses cannot be generated yet', async () => {
      webapiWith(['FIRST'], 'SEL')

      await generate({ analysisType: 'characterization', analysisId: 4 })

      expect(generatePathway).not.toHaveBeenCalled()
      expect(notes()).toEqual([
        { severity: 'warning', title: 'Generating a characterization is not supported yet' },
      ])
    })

    it('starts a pathway generation and tells the workbench to watch it', async () => {
      webapiWith(['FIRST'], 'SEL')
      const notify = spy(usePathwayStore(), 'notifyAgentGeneration')
      vi.mocked(generatePathway).mockResolvedValue({ success: true, data: null } as never)

      await generate({ analysisType: 'pathway', analysisId: 5 })

      expect(notify).toHaveBeenCalledOnce()
      expect(notes()).toEqual([{ severity: 'success', title: 'Generating pathway analysis against SEL' }])
    })

    it('reports a generation the service refused', async () => {
      webapiWith(['FIRST'], 'SEL')
      const notify = spy(usePathwayStore(), 'notifyAgentGeneration')
      vi.mocked(generatePathway).mockResolvedValue({ success: false, error: 'busy' } as never)

      await generate({ analysisType: 'pathway', analysisId: 5 })

      expect(notify).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to start generation: busy' }])
    })

    it('reports a generation call that throws', async () => {
      webapiWith(['FIRST'], 'SEL')
      vi.mocked(generatePathway).mockRejectedValue(new Error('down'))

      await generate({ analysisType: 'pathway', analysisId: 5 })

      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to start generation: down' }])
    })
  })

  describe('cohort proposals', () => {
    const entryEvent = (id = 'e1') => ({
      kind: 'addEntryEvent',
      event: { id, criteriaType: 'ConditionOccurrence' },
    })

    function mockSave(store: ReturnType<typeof useCohortStore>, ...results: unknown[]) {
      const save = spy(store, 'requestSave')
      for (const r of results) save.mockResolvedValueOnce(r)
      return save
    }

    it('starts a cohort when none exists', async () => {
      const store = useCohortStore()
      store.attachExpression(ref<CohortExpression>({}))
      setRoute({ name: 'cohort-new', params: {} })

      const res = await apply(entryEvent())

      expect(res).toEqual({ applied: true })
      expect(store.newCohortSignal).toBe(1)
      expect(store.currentCohort).not.toBeNull()
    })

    it('keeps the cohort that is already open', async () => {
      const store = attachEditor()
      store.currentCohort!.name = 'Mine'
      setRoute({ name: 'cohort-new', params: {} })

      await apply(entryEvent())

      expect(store.newCohortSignal).toBe(0)
      expect(store.currentCohort?.name).toBe('Mine')
    })

    it('handles a route that carries no params', async () => {
      attachEditor()
      setRoute({ name: 'cohort-new' })

      expect(await apply(entryEvent())).toEqual({ applied: true })
    })

    it('an entry event on the cohort just saved starts the next cohort, once', async () => {
      const store = attachEditor()
      mockSave(store, { id: 501, name: 'First' })
      setRoute({ name: 'cohort-edit', params: { id: '501' } })

      expect(await apply({ kind: 'saveCohort' })).toEqual({ id: 501, name: 'First' })
      await apply(entryEvent('a'))
      expect(store.newCohortSignal).toBe(1)

      await apply(entryEvent('b'))
      expect(store.newCohortSignal).toBe(1)
    })

    it('a non-entry proposal on the cohort just saved keeps editing it', async () => {
      const store = attachEditor()
      mockSave(store, { id: 502 })
      setRoute({ name: 'cohort-edit', params: { id: '502' } })

      await apply({ kind: 'saveCohort' })
      await apply({ kind: 'setObservationPeriod', observationPeriod: { priorDays: 1, postDays: 0 } })

      expect(store.newCohortSignal).toBe(0)
    })

    it('an entry event on a different cohort than the one saved keeps editing it', async () => {
      const store = attachEditor()
      mockSave(store, { id: 503 })
      setRoute({ name: 'cohort-edit', params: { id: '503' } })
      await apply({ kind: 'saveCohort' })

      setRoute({ name: 'cohort-edit', params: { id: '999' } })
      await apply(entryEvent())

      expect(store.newCohortSignal).toBe(0)
    })

    it('a later save that returns no id keeps the earlier saved cohort', async () => {
      const store = attachEditor()
      mockSave(store, { id: 504 }, { timedOut: true })
      setRoute({ name: 'cohort-edit', params: { id: '504' } })

      await apply({ kind: 'saveCohort' })
      await apply({ kind: 'saveCohort' })
      await apply(entryEvent())

      expect(store.newCohortSignal).toBe(1)
    })

    it('a save that resolves with nothing is passed through', async () => {
      const store = attachEditor()
      mockSave(store, undefined)
      setRoute({ name: 'cohort-new', params: {} })

      expect(await apply({ kind: 'saveCohort', name: 'N', description: 'D' })).toBeUndefined()
      expect(store.requestSave).toHaveBeenCalledWith({ name: 'N', description: 'D' })
    })

    it('refuses to save when there is no cohort', async () => {
      expect(await apply({ kind: 'saveCohort' })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'There is no cohort to save yet' }])
    })

    it('waits for the editor to attach its document', async () => {
      const store = useCohortStore()
      store.createNewCohort()
      setRoute({ name: 'cohort-new', params: {} })
      vi.mocked(nextTick).mockImplementationOnce(async () => {
        store.attachExpression(ref<CohortExpression>({}))
      })

      const res = await apply(entryEvent())

      expect(res).toEqual({ applied: true })
      expect(nextTick).toHaveBeenCalledOnce()
      expect(store.currentCohort?.expression?.PrimaryCriteria?.CriteriaList).toHaveLength(1)
    })

    it('gives up after three ticks when no editor attaches', async () => {
      const store = useCohortStore()
      store.createNewCohort()
      setRoute({ name: 'cohort-new', params: {} })

      const res = await apply(entryEvent())

      expect(res).toEqual({ applied: false })
      expect(nextTick).toHaveBeenCalledTimes(3)
      expect(notes()).toEqual([
        { severity: 'danger', title: 'Open a cohort before asking for changes to one' },
      ])
    })

    it('does not wait when the document is already attached', async () => {
      attachEditor()
      setRoute({ name: 'cohort-new', params: {} })

      await apply(entryEvent())

      expect(nextTick).not.toHaveBeenCalled()
    })

    it('a refusal without a reason is reported as unsupported', async () => {
      const store = attachEditor()
      setRoute({ name: 'cohort-new', params: {} })
      vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: false })

      expect(await apply(entryEvent())).toEqual({ applied: false })
      expect(notes()).toEqual([
        { severity: 'danger', title: 'ATLAS cannot make that change to a cohort yet' },
      ])
    })
  })

  describe('route to the cohort editor', () => {
    function saveable(id?: number) {
      const store = attachEditor()
      if (id !== undefined) store.currentCohort!.id = id
      spy(store, 'requestSave').mockResolvedValue({})
      return store
    }

    it('opens a saved cohort by id', async () => {
      saveable(12)
      await apply({ kind: 'saveCohort' })
      expect(router.push).toHaveBeenCalledWith({ name: 'cohort-edit', params: { id: '12' } })
    })

    it('opens an unsaved cohort in the new-cohort editor', async () => {
      saveable()
      await apply({ kind: 'saveCohort' })
      expect(router.push).toHaveBeenCalledWith({ name: 'cohort-new' })
    })

    it.each(['cohort-edit', 'cohort-new', 'cohort-version-preview'])(
      'stays put when already on %s',
      async name => {
        saveable(12)
        setRoute({ name, params: {} })
        await apply({ kind: 'saveCohort' })
        expect(router.push).not.toHaveBeenCalled()
      },
    )

    it('still saves when navigating to the editor fails', async () => {
      const store = saveable(12)
      vi.mocked(router.push).mockRejectedValue(new Error('nav'))

      await expect(apply({ kind: 'saveCohort' })).resolves.toEqual({})
      expect(store.requestSave).toHaveBeenCalledOnce()
    })
  })

  describe('concept sets carried by cohort proposals', () => {
    function recordApply(store: ReturnType<typeof useCohortStore>) {
      return vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })
    }

    function registered(applySpy: ReturnType<typeof recordApply>) {
      return applySpy.mock.calls
        .map(c => c[0])
        .filter(p => p.kind === 'addConceptSet')
    }

    beforeEach(() => setRoute({ name: 'cohort-new', params: {} }))

    it('gives inclusion-rule concept sets, including nested ones, their own numeric ids', async () => {
      const store = attachEditor()
      const applySpy = recordApply(store)
      const rule = {
        id: 'r1',
        name: 'Rule',
        criteriaGroups: [
          {
            id: 'g1',
            logicType: 'ALL',
            events: [
              { id: 'a', criteriaType: 'DrugExposure', conceptSet: { id: 'uuid-a', name: 'A' } },
              { id: 'plain', criteriaType: 'VisitOccurrence' },
            ],
            nestedGroups: [
              {
                id: 'g2',
                logicType: 'ANY',
                events: [
                  { id: 'b', criteriaType: 'DrugExposure', conceptSet: { id: 'uuid-b', name: 'B' } },
                ],
              },
            ],
          },
        ],
      }

      await apply({ kind: 'addInclusionRule', rule })

      expect(registered(applySpy)).toEqual([
        { kind: 'addConceptSet', conceptSet: { id: 0, name: 'A' } },
        { kind: 'addConceptSet', conceptSet: { id: 1, name: 'B' } },
      ])
      expect(rule.criteriaGroups[0]!.events[0]!.conceptSet).toEqual({ id: 0, name: 'A' })
      expect(rule.criteriaGroups[0]!.nestedGroups[0]!.events[0]!.conceptSet).toEqual({ id: 1, name: 'B' })
      expect(applySpy).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'addInclusionRule' }))
    })

    it.each([
      ['addEntryEvent', (cs: object) => ({ event: { id: 'e', criteriaType: 'ConditionOccurrence', conceptSet: cs } })],
      ['addCensoringCriterion', (cs: object) => ({ event: { id: 'e', criteriaType: 'ConditionOccurrence', conceptSet: cs } })],
      ['setCohortExit', (cs: object) => ({ exitCriteria: { type: 'custom', conceptSet: cs } })],
    ])('registers the concept set carried by %s', async (kind, body) => {
      const store = attachEditor()
      const applySpy = recordApply(store)

      await apply({ kind, ...body({ id: 'uuid', name: 'Set' }) })

      expect(registered(applySpy)).toEqual([
        { kind: 'addConceptSet', conceptSet: { id: 0, name: 'Set' } },
      ])
    })

    it('an addConceptSet proposal is renumbered but not registered twice', async () => {
      const store = attachEditor()
      const applySpy = recordApply(store)

      await apply({ kind: 'addConceptSet', conceptSet: { id: 'uuid', name: 'Set' } })

      expect(applySpy.mock.calls.map(c => c[0])).toEqual([
        { kind: 'addConceptSet', conceptSet: { id: 0, name: 'Set' } },
      ])
    })

    it('leaves other proposal kinds untouched', async () => {
      const store = attachEditor()
      const applySpy = recordApply(store)
      const proposal = { kind: 'removeEntryEvent', match: { conceptId: 1 }, conceptSet: { id: 'uuid', name: 'X' } }

      await apply(proposal)

      expect(applySpy.mock.calls.map(c => c[0])).toEqual([proposal])
      expect(proposal.conceptSet.id).toBe('uuid')
    })

    it('numbers new sets after the cohort\'s own and reuses an existing one in place', async () => {
      const store = attachEditor()
      store.currentCohort!.expression!.ConceptSets = [
        { id: 4, name: 'Old', expression: { items: [] } },
        { id: 'legacy', name: 'Str', expression: { items: [] } },
      ] as never
      const applySpy = recordApply(store)

      await apply({
        kind: 'addInclusionRule',
        rule: {
          id: 'r',
          name: 'R',
          criteriaGroups: [
            {
              id: 'g',
              logicType: 'ALL',
              events: [
                { id: '1', criteriaType: 'DrugExposure', conceptSet: { id: 'n1', name: 'New1' } },
                { id: '2', criteriaType: 'DrugExposure', conceptSet: { id: 'n2', name: 'New2' } },
                { id: '3', criteriaType: 'DrugExposure', conceptSet: { id: 4, name: 'Old' } },
              ],
            },
          ],
        },
      })

      expect(registered(applySpy).map(p => (p as { conceptSet: { id: unknown } }).conceptSet.id)).toEqual([5, 6, 4])
    })
  })

  describe('useConceptSet', () => {
    const SET = {
      id: 42,
      name: 'Statins',
      items: [{ conceptId: 1, conceptName: 'Simvastatin', concept: { DOMAIN_ID: 'Drug' } }],
    }

    function use(payload: Record<string, unknown>) {
      return apply({ kind: 'useConceptSet', payload })
    }

    function lastProposal(applySpy: { mock: { calls: unknown[][] } }) {
      return applySpy.mock.calls[applySpy.mock.calls.length - 1]![0] as {
        kind: string
        event?: Record<string, unknown>
        rule?: { name: string; criteriaGroups: Array<{ id: string; logicType: string; events: Array<Record<string, unknown>> }> }
      }
    }

    beforeEach(() => {
      setRoute({ name: 'cohort-new', params: {} })
      vi.mocked(getConceptSetById).mockResolvedValue(SET as never)
    })

    it('refuses without a concept set id', async () => {
      expect(await use({})).toEqual({ applied: false })
      expect(getConceptSetById).not.toHaveBeenCalled()
    })

    it('reports a concept set that does not exist', async () => {
      attachEditor()
      vi.mocked(getConceptSetById).mockResolvedValue(null as never)

      expect(await use({ conceptSetId: 7 })).toEqual({ applied: false })
      expect(notes()).toEqual([{ severity: 'danger', title: 'Concept set 7 not found' }])
    })

    it('builds an inclusion rule around the set, typed from the nested concept domain', async () => {
      const store = attachEditor()
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })

      expect(await use({ conceptSetId: 42 })).toEqual({ id: 42, name: 'Statins' })

      const p = lastProposal(applySpy)
      expect(p.kind).toBe('addInclusionRule')
      expect(p.rule?.name).toBe('Statins')
      expect(p.rule?.criteriaGroups).toHaveLength(1)
      expect(p.rule?.criteriaGroups[0]).toMatchObject({ id: 'use-group-42', logicType: 'ALL' })
      const event = p.rule!.criteriaGroups[0]!.events[0]!
      expect(event.criteriaType).toBe('DrugExposure')
      expect(event.conceptSet).toEqual({ id: 42, name: 'Statins', conceptCount: 1, items: SET.items })
      expect(event).not.toHaveProperty('cardinality')
    })

    it('prefers the item domain over the nested concept domain', async () => {
      const store = attachEditor()
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })
      vi.mocked(getConceptSetById).mockResolvedValue({
        ...SET,
        items: [{ conceptId: 1, domainId: 'Measurement', concept: { DOMAIN_ID: 'Drug' } }],
      } as never)

      await use({ conceptSetId: 42, group: 'entry' })

      const p = lastProposal(applySpy)
      expect(p.kind).toBe('addEntryEvent')
      expect(p.event?.criteriaType).toBe('Measurement')
    })

    it('an exclusion requires zero occurrences and is named for it', async () => {
      const store = attachEditor()
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })

      await use({ conceptSetId: 42, group: 'exclusion' })

      const p = lastProposal(applySpy)
      expect(p.rule?.name).toBe('Exclude: Statins')
      expect(p.rule?.criteriaGroups[0]!.events[0]!.cardinality).toEqual({
        type: 'EXACTLY',
        count: 0,
        countingMethod: 'ALL',
      })
    })

    it('uses the caller-supplied rule name', async () => {
      const store = attachEditor()
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })

      await use({ conceptSetId: 42, group: 'exclusion', name: 'No statins' })

      expect(lastProposal(applySpy).rule?.name).toBe('No statins')
    })

    it('starts a cohort when none is open', async () => {
      const store = useCohortStore()
      store.attachExpression(ref<CohortExpression>({}))

      expect(await use({ conceptSetId: 42 })).toEqual({ id: 42, name: 'Statins' })
      expect(store.newCohortSignal).toBe(1)
      expect(store.currentCohort).not.toBeNull()
    })

    it('keeps the cohort that is open', async () => {
      const store = attachEditor()
      store.currentCohort!.name = 'Mine'

      await use({ conceptSetId: 42 })

      expect(store.newCohortSignal).toBe(0)
      expect(store.currentCohort?.name).toBe('Mine')
    })
  })

  describe('navigate', () => {
    it('ignores a proposal with no route', async () => {
      expect(await apply({ kind: 'navigate' })).toBeUndefined()
      expect(router.push).not.toHaveBeenCalled()
    })

    it('navigating elsewhere leaves the cohort alone', async () => {
      const store = attachEditor()

      await apply({ kind: 'navigate', route: { name: 'home', params: { x: '1' } } })

      expect(router.push).toHaveBeenCalledWith({ name: 'home', params: { x: '1' } })
      expect(store.newCohortSignal).toBe(0)
    })

    it('saves a dirty cohort open in the editor before blanking it', async () => {
      const store = attachEditor()
      store.isDirty = true
      setRoute({ name: 'cohort-edit', params: { id: '3' } })
      const save = spy(store, 'requestSave').mockResolvedValue({})

      await apply({ kind: 'navigate', route: { name: 'cohort-new' } })

      expect(save).toHaveBeenCalledOnce()
      expect(store.newCohortSignal).toBe(1)
    })

    it('does not save a clean cohort before blanking it', async () => {
      const store = attachEditor()
      setRoute({ name: 'cohort-edit', params: { id: '3' } })
      const save = spy(store, 'requestSave').mockResolvedValue({})

      await apply({ kind: 'navigate', route: { name: 'cohort-new' } })

      expect(save).not.toHaveBeenCalled()
    })

    it('does not save a dirty cohort when the editor is not on screen', async () => {
      const store = attachEditor()
      store.isDirty = true
      const save = spy(store, 'requestSave').mockResolvedValue({})

      await apply({ kind: 'navigate', route: { name: 'cohort-new' } })

      expect(save).not.toHaveBeenCalled()
      expect(store.newCohortSignal).toBe(1)
    })

    it('reports a navigation that fails', async () => {
      vi.mocked(router.push).mockRejectedValue(new Error('nope'))

      await apply({ kind: 'navigate', route: { name: 'home' } })

      expect(notes()).toEqual([{ severity: 'danger', title: 'Could not navigate to that view' }])
    })
  })

  describe('createStandaloneConceptSet', () => {
    const create = (conceptSet: unknown) => apply({ kind: 'createStandaloneConceptSet', conceptSet })
    const items = [
      { conceptId: 1, conceptName: 'A', domain: 'Drug', isExcluded: true, includeDescendants: false },
      { conceptId: 2, conceptName: 'B' },
    ]

    it('sends fully-shaped items to the service', async () => {
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S', items: [] } as never)

      await create({ name: 'S', items })

      expect(createConceptSet).toHaveBeenCalledWith({
        name: 'S',
        description: '',
        items: [
          {
            conceptId: 1,
            conceptName: 'A',
            conceptCode: '',
            domainId: 'Drug',
            vocabularyId: '',
            conceptClassId: '',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: true,
            includeDescendants: false,
            includeMapped: false,
          },
          {
            conceptId: 2,
            conceptName: 'B',
            conceptCode: '',
            domainId: '',
            vocabularyId: '',
            conceptClassId: '',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      })
    })

    it('passes the description through', async () => {
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S', items: [] } as never)
      await create({ name: 'S', description: 'desc', items })
      expect(vi.mocked(createConceptSet).mock.calls[0]![0].description).toBe('desc')
    })

    it.each([[undefined], [{ name: 'S', items: [] }], [{ name: '', items }]])(
      'refuses a payload without a name or items (%#)',
      async payload => {
        expect(await create(payload)).toBeUndefined()
        expect(createConceptSet).not.toHaveBeenCalled()
        expect(notes()).toEqual([{ severity: 'danger', title: 'Concept set is missing a name or items' }])
      },
    )

    it('reports the service error message', async () => {
      vi.mocked(createConceptSet).mockRejectedValue(new Error('quota exceeded'))
      expect(await create({ name: 'S', items })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'quota exceeded' }])
    })

    it('reports a generic failure for a non-Error rejection', async () => {
      vi.mocked(createConceptSet).mockRejectedValue('nope')
      await create({ name: 'S', items })
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create concept set' }])
    })

    it.each([[null], [undefined]])('reports a created set with id %s as a failure', async id => {
      vi.mocked(createConceptSet).mockResolvedValue({ id, name: 'S' } as never)
      expect(await create({ name: 'S', items })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create concept set' }])
    })

    it('without a cohort, opens the new set in the concept set editor', async () => {
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S' } as never)
      const open = spy(useConceptSetsStore(), 'openEditEditor').mockResolvedValue(undefined)

      expect(await create({ name: 'S', items })).toEqual({ id: 5, name: 'S' })
      expect(router.push).toHaveBeenCalledWith({ name: 'concepts' })
      expect(open).toHaveBeenCalledWith(5)
      expect(notes()).toEqual([{ severity: 'success', title: 'Concept set "S" created' }])
    })

    it('without a cohort, still returns the set when opening the editor fails', async () => {
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S' } as never)
      vi.mocked(router.push).mockRejectedValue(new Error('nav'))

      expect(await create({ name: 'S', items })).toEqual({ id: 5, name: 'S' })
    })

    it('with a cohort, attaches the set with its concepts', async () => {
      const store = attachEditor()
      const created = [{ conceptId: 1 }, { conceptId: 2 }]
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S', items: created } as never)
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })

      expect(await create({ name: 'S', items })).toEqual({ id: 5, name: 'S' })
      expect(applySpy).toHaveBeenCalledWith({
        kind: 'addConceptSet',
        conceptSet: { id: 5, name: 'S', conceptCount: 2, items: created },
      })
      expect(notes()).toEqual([
        { severity: 'success', title: 'Concept set "S" created and attached to the cohort' },
      ])
    })

    it('with a cohort, attaches a set the service returned without items as empty', async () => {
      const store = attachEditor()
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S' } as never)
      const applySpy = vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: true })

      await create({ name: 'S', items })

      expect(applySpy).toHaveBeenCalledWith({
        kind: 'addConceptSet',
        conceptSet: { id: 5, name: 'S', conceptCount: 0, items: [] },
      })
    })

    it('with a cohort, reports a rejected attach but hands back the created set', async () => {
      const store = attachEditor()
      vi.mocked(createConceptSet).mockResolvedValue({ id: 5, name: 'S', items: [] } as never)
      vi.spyOn(store, 'applyProposal').mockReturnValue({ applied: false, reason: 'no-match' })

      expect(await create({ name: 'S', items })).toEqual({ id: 5, name: 'S', applied: false })
      expect(notes()).toEqual([
        {
          severity: 'danger',
          title: 'Concept set "S" was created but could not be attached to the cohort',
        },
      ])
    })
  })

  describe('createFeatureAnalysis', () => {
    const create = (payload: unknown) => apply({ kind: 'createFeatureAnalysis', payload })
    const ok = (data: unknown) =>
      vi.mocked(createFeatureAnalysis).mockResolvedValue({ success: true, data } as never)

    it('builds a criteria-set analysis with a distribution stat type', async () => {
      ok({ id: 1, name: 'FA' })
      const design = [{ name: 'c1' }]

      await create({
        name: 'FA',
        description: 'd',
        domain: 'DRUG',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        design,
      })

      expect(createFeatureAnalysis).toHaveBeenCalledWith({
        name: 'FA',
        description: 'd',
        domain: 'DRUG',
        type: 'CRITERIA_SET',
        statType: 'DISTRIBUTION',
        design,
        conceptSets: [],
      })
    })

    it('defaults a criteria-set analysis to prevalence and an empty design', async () => {
      ok({ id: 1, name: 'FA' })

      await create({ name: 'FA', type: 'CRITERIA_SET', statType: 'OTHER', design: 'select 1' })

      expect(vi.mocked(createFeatureAnalysis).mock.calls[0]![0]).toMatchObject({
        type: 'CRITERIA_SET',
        statType: 'PREVALENCE',
        design: [],
        conceptSets: [],
      })
    })

    it('builds a custom analysis, dropping a non-string design', async () => {
      ok({ id: 1, name: 'FA' })

      await create({ name: 'FA', type: 'CUSTOM_FE', design: [1] })

      expect(createFeatureAnalysis).toHaveBeenCalledWith({
        name: 'FA',
        description: undefined,
        domain: undefined,
        type: 'CUSTOM_FE',
        design: '',
      })
    })

    it('refuses a missing payload', async () => {
      expect(await create(undefined)).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Feature analysis is missing a name or type' }])
    })

    it('refuses a preset', async () => {
      await create({ name: 'P', type: 'PRESET' })
      expect(notes()).toEqual([{ severity: 'danger', title: 'Preset feature analyses cannot be created' }])
    })

    it('reports a service failure with its message', async () => {
      vi.mocked(createFeatureAnalysis).mockResolvedValue({
        success: false,
        error: { message: 'bad' },
      } as never)

      expect(await create({ name: 'FA', type: 'CUSTOM_FE' })).toBeUndefined()
      expect(router.push).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create feature analysis: bad' }])
    })

    it.each([[undefined], [{ name: 'FA' }]])('reports a result with no id (%#)', async data => {
      ok(data)
      expect(await create({ name: 'FA', type: 'CUSTOM_FE' })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create feature analysis' }])
    })

    it('announces the created analysis and returns it', async () => {
      ok({ id: 42, name: 'Server FA' })

      expect(await create({ name: 'FA', type: 'CUSTOM_FE' })).toEqual({ id: 42, name: 'Server FA' })
      expect(notes()).toEqual([{ severity: 'success', title: 'Feature analysis "Server FA" created' }])
    })

    it('returns the created analysis even when opening its editor fails', async () => {
      ok({ id: 42, name: 'FA' })
      vi.mocked(router.push).mockRejectedValue(new Error('nav'))

      expect(await create({ name: 'FA', type: 'CUSTOM_FE' })).toEqual({ id: 42, name: 'FA' })
    })
  })

  describe('createCharacterization', () => {
    const create = (payload: unknown) => apply({ kind: 'createCharacterization', payload })
    const valid = {
      name: 'C',
      description: 'd',
      cohorts: [{ id: 1, name: 'T', extra: true }],
      featureAnalyses: [{ id: 3 }, { id: 4, name: 'Age' }],
    }

    it.each([
      [undefined, 'Characterization is missing a name'],
      [{ ...valid, cohorts: [] }, 'Characterization needs at least one cohort attached'],
      [{ ...valid, cohorts: undefined }, 'Characterization needs at least one cohort attached'],
      [{ ...valid, featureAnalyses: [] }, 'Characterization needs at least one feature analysis attached'],
      [{ ...valid, featureAnalyses: undefined }, 'Characterization needs at least one feature analysis attached'],
    ])('refuses an incomplete payload (%#)', async (payload, title) => {
      expect(await create(payload)).toBeUndefined()
      expect(createCharacterization).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title }])
    })

    it('sends the definition with placeholder analysis names', async () => {
      vi.mocked(createCharacterization).mockResolvedValue({ success: true, data: { id: 8, name: 'C' } } as never)

      await create(valid)

      expect(createCharacterization).toHaveBeenCalledWith({
        name: 'C',
        description: 'd',
        cohorts: [{ id: 1, name: 'T' }],
        featureAnalyses: [
          { id: 3, name: 'Feature analysis 3' },
          { id: 4, name: 'Age' },
        ],
        stratas: [],
      })
    })

    it('reports a service failure', async () => {
      vi.mocked(createCharacterization).mockResolvedValue({ success: false, error: { message: 'bad' } } as never)
      expect(await create(valid)).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create characterization: bad' }])
    })

    it.each([[undefined], [{ name: 'C' }]])('reports a result with no id (%#)', async data => {
      vi.mocked(createCharacterization).mockResolvedValue({ success: true, data } as never)
      expect(await create(valid)).toBeUndefined()
      expect(router.push).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create characterization' }])
    })

    it('announces the created characterization and returns it', async () => {
      vi.mocked(createCharacterization).mockResolvedValue({ success: true, data: { id: 8, name: 'Srv' } } as never)
      expect(await create(valid)).toEqual({ id: 8, name: 'Srv' })
      expect(notes()).toEqual([{ severity: 'success', title: 'Characterization "Srv" created' }])
    })
  })

  describe('createPathway', () => {
    const create = (payload: unknown) => apply({ kind: 'createPathway', payload })

    it('refuses a missing payload', async () => {
      expect(await create(undefined)).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Pathway is missing a name' }])
    })

    it.each([[undefined], [{ name: 'P' }]])('reports a result with no id (%#)', async data => {
      vi.mocked(createPathway).mockResolvedValue({ success: true, data } as never)
      expect(await create({ name: 'P' })).toBeUndefined()
      expect(router.push).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create pathway: no id returned' }])
    })

    it('reports a service failure', async () => {
      vi.mocked(createPathway).mockResolvedValue({ success: false, error: { message: 'bad' } } as never)
      await create({ name: 'P' })
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create pathway: bad' }])
    })

    it('reports a service call that throws', async () => {
      vi.mocked(createPathway).mockRejectedValue(new Error('net'))
      expect(await create({ name: 'P' })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create pathway: net' }])
    })

    it('announces the server name but returns the requested one', async () => {
      vi.mocked(createPathway).mockResolvedValue({ success: true, data: { id: 3, name: 'Srv' } } as never)
      expect(await create({ name: 'P' })).toEqual({ id: 3, name: 'P' })
      expect(notes()).toEqual([{ severity: 'success', title: 'Pathway "Srv" created' }])
    })
  })

  describe('createIncidenceRate', () => {
    const create = (payload: unknown) => apply({ kind: 'createIncidenceRate', payload })
    const ok = () =>
      vi.mocked(createIncidenceRate).mockResolvedValue({ success: true, data: { id: 6, name: 'Srv' } } as never)
    const sentExpression = () =>
      (vi.mocked(createIncidenceRate).mock.calls[0]![0] as unknown as { expression: Record<string, unknown> })
        .expression

    it('refuses a missing payload', async () => {
      expect(await create(undefined)).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Incidence rate is missing a name' }])
    })

    it('defaults the time at risk to cohort start through cohort end', async () => {
      ok()
      await create({ name: 'IR' })
      expect(sentExpression().timeAtRisk).toEqual({
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'EndDate', Offset: 0 },
      })
    })

    it('keeps a supplied time at risk', async () => {
      ok()
      const timeAtRisk = { start: { DateField: 'StartDate', Offset: 1 }, end: { DateField: 'StartDate', Offset: 30 } }
      await create({ name: 'IR', timeAtRisk })
      expect(sentExpression().timeAtRisk).toEqual(timeAtRisk)
    })

    it.each([[undefined], [{ name: 'IR' }]])('reports a result with no id (%#)', async data => {
      vi.mocked(createIncidenceRate).mockResolvedValue({ success: true, data } as never)
      expect(await create({ name: 'IR' })).toBeUndefined()
      expect(router.push).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create incidence rate: no id returned' }])
    })

    it('reports a service failure', async () => {
      vi.mocked(createIncidenceRate).mockResolvedValue({ success: false, error: { message: 'bad' } } as never)
      await create({ name: 'IR' })
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create incidence rate: bad' }])
    })

    it('reports a service call that throws', async () => {
      vi.mocked(createIncidenceRate).mockRejectedValue(new Error('net'))
      expect(await create({ name: 'IR' })).toBeUndefined()
      expect(notes()).toEqual([{ severity: 'danger', title: 'Failed to create incidence rate: net' }])
    })

    it('announces the server name but returns the requested one', async () => {
      ok()
      expect(await create({ name: 'IR' })).toEqual({ id: 6, name: 'IR' })
      expect(notes()).toEqual([{ severity: 'success', title: 'Incidence rate "Srv" created' }])
    })
  })

  describe('getContext', () => {
    it('reports the route, an empty name for unnamed routes, and the selected source', () => {
      setRoute({ params: { id: '4' } })
      const ds = useDataSourcesStore()
      setState(ds, 'sources', [{ sourceId: 1, sourceKey: 'SYN' }])
      setState(ds, 'selectedSourceId', 1)

      const res = contextResponse()

      expect(res.route).toEqual({ name: '', params: { id: '4' } })
      expect(res.routeContext).toEqual({ routeName: '', routeParams: { id: '4' }, artifact: null })
      expect(res.sourceKey).toBe('SYN')
      expect(res.cohort).toBeNull()
      expect(res.conceptSet).toBeNull()
    })

    it('reports a null source when none is selected', () => {
      expect(contextResponse().sourceKey).toBeNull()
    })

    it.each([
      [{ PrimaryCriteria: { CriteriaList: [{}, {}] }, InclusionRules: [{}] }, 2, 1],
      [{ PrimaryCriteria: {} }, 0, 0],
      [{}, 0, 0],
      [undefined, 0, 0],
    ])('summarizes the open cohort (%#)', (expression, entryEventCount, inclusionRuleCount) => {
      setState(useCohortStore(), 'currentCohort', { id: 3, name: 'X', description: 'd', expression })

      expect(contextResponse().cohort).toEqual({
        id: 3,
        name: 'X',
        description: 'd',
        entryEventCount,
        inclusionRuleCount,
      })
    })

    it.each([
      [[{}, {}], 2],
      [undefined, 0],
    ])('summarizes the open concept set (%#)', (items, itemCount) => {
      setState(useConceptSetsStore(), 'currentSet', { id: 7, name: 'S', items })
      expect(contextResponse().conceptSet).toEqual({ id: 7, name: 'S', itemCount })
    })
  })

  describe('artifact summary', () => {
    it.each([
      [{ id: 3, name: 'X', description: '  Diabetics  ' }, { kind: 'cohort', id: 3, name: 'X', summary: 'Diabetics' }],
      [{ name: 'X' }, { kind: 'cohort', id: 'draft', name: 'X', summary: 'Cohort: X' }],
    ])('cohort (%#)', (cohort, expected) => {
      setRoute({ name: 'cohort-edit', params: {} })
      setState(useCohortStore(), 'currentCohort', cohort)
      expect(artifact()).toEqual(expected)
    })

    it('cohort route with no cohort open', () => {
      setRoute({ name: 'cohort-new', params: {} })
      expect(artifact()).toBeNull()
    })

    it('concept set without id or items', () => {
      setRoute({ name: 'concept-detail', params: {} })
      setState(useConceptSetsStore(), 'currentSet', { name: 'S' })
      expect(artifact()).toEqual({ kind: 'conceptSet', id: 'draft', name: 'S', summary: '0 item(s).' })
    })

    it.each([
      [{ name: 'F' }, { kind: 'featureAnalysis', id: 'draft', name: 'F', summary: 'Type: unknown.' }],
      [
        { id: 2, name: 'F', type: 'CUSTOM_FE', domain: 'DRUG', description: 'desc' },
        { kind: 'featureAnalysis', id: 2, name: 'F', summary: 'Type: CUSTOM_FE. Domain: DRUG. desc' },
      ],
    ])('feature analysis (%#)', (fa, expected) => {
      setRoute({ name: 'feature-analysis-new', params: {} })
      setState(useFeatureAnalysesStore(), 'currentFA', fa)
      expect(artifact()).toEqual(expected)
    })

    it.each([
      [
        { name: 'C' },
        { kind: 'characterization', id: 'draft', name: 'C', summary: '0 cohort(s), 0 feature analysis(es).' },
      ],
      [
        { id: 9, name: 'C', cohorts: [{}], featureAnalyses: [{}, {}], description: 'desc' },
        { kind: 'characterization', id: 9, name: 'C', summary: '1 cohort(s), 2 feature analysis(es). desc' },
      ],
    ])('characterization (%#)', (ch, expected) => {
      setRoute({ name: 'characterization-new', params: {} })
      setState(useCharacterizationStore(), 'currentCharacterization', ch)
      expect(artifact()).toEqual(expected)
    })

    it.each([
      [{ name: 'P' }, { kind: 'pathway', id: 'draft', name: 'P', summary: '0 target cohort(s), 0 event cohort(s).' }],
      [
        { id: 4, name: 'P', targetCohorts: [{}], eventCohorts: [{}, {}], description: 'desc' },
        { kind: 'pathway', id: 4, name: 'P', summary: '1 target cohort(s), 2 event cohort(s). desc' },
      ],
    ])('pathway (%#)', (p, expected) => {
      setRoute({ name: 'pathway-new', params: {} })
      setState(usePathwayStore(), 'currentPathway', p)
      expect(artifact()).toEqual(expected)
    })

    it.each([
      [{ name: 'I' }, { kind: 'incidenceRate', id: 'draft', name: 'I', summary: '0 target(s), 0 outcome(s).' }],
      [{ name: 'I', expression: {} }, { kind: 'incidenceRate', id: 'draft', name: 'I', summary: '0 target(s), 0 outcome(s).' }],
      [
        { id: 6, name: 'I', expression: { targetIds: [1], outcomeIds: [2, 3] }, description: 'desc' },
        { kind: 'incidenceRate', id: 6, name: 'I', summary: '1 target(s), 2 outcome(s). desc' },
      ],
    ])('incidence rate (%#)', (ir, expected) => {
      setRoute({ name: 'incidence-rate-new', params: {} })
      setState(useIncidenceRateStore(), 'currentIR', ir)
      expect(artifact()).toEqual(expected)
    })
  })

  describe.each([
    {
      kind: 'updateConceptSet',
      label: 'concept set',
      title: 'Concept set',
      route: 'concepts',
      push: { name: 'concepts' },
      store: () => useConceptSetsStore() as object,
      current: 'currentSet',
      loader: 'fetchOne',
    },
    {
      kind: 'updateFeatureAnalysis',
      label: 'feature analysis',
      title: 'Feature analysis',
      route: 'feature-analysis-edit',
      push: { name: 'feature-analysis-edit', params: { id: '5' } },
      store: () => useFeatureAnalysesStore() as object,
      current: 'currentFA',
      loader: 'fetchOne',
    },
    {
      kind: 'updateCharacterization',
      label: 'characterization',
      title: 'Characterization',
      route: 'characterization-edit',
      push: { name: 'characterization-edit', params: { id: '5' } },
      store: () => useCharacterizationStore() as object,
      current: 'currentCharacterization',
      loader: 'fetchOne',
    },
    {
      kind: 'updatePathway',
      label: 'pathway',
      title: 'Pathway',
      route: 'pathway-edit',
      push: { name: 'pathway-edit', params: { id: '5' } },
      store: () => usePathwayStore() as object,
      current: 'currentPathway',
      loader: 'loadPathway',
    },
    {
      kind: 'updateIncidenceRate',
      label: 'incidence rate',
      title: 'Incidence rate',
      route: 'incidence-rate-edit',
      push: { name: 'incidence-rate-edit', params: { id: '5' } },
      store: () => useIncidenceRateStore() as object,
      current: 'currentIR',
      loader: 'loadIR',
    },
  ])('$kind', ({ kind, label, title, route, push, store, current, loader }) => {
    const update = (payload: unknown) => apply({ kind, payload })

    function loaded(applied: boolean) {
      const s = store()
      setState(s, current, { id: 5, name: 'Art' })
      const load = spy(s, loader).mockResolvedValue(undefined)
      const applySpy = spy(s, 'applyProposal').mockReturnValue(applied)
      return { load, applySpy }
    }

    it('refuses a payload without a numeric id', async () => {
      const load = spy(store(), loader).mockResolvedValue(undefined)
      expect(await update({ name: 'x' })).toEqual({ applied: false })
      expect(await update(undefined)).toEqual({ applied: false })
      expect(load).not.toHaveBeenCalled()
      expect(notes()).toEqual([
        { severity: 'danger', title: `Update ${label} is missing an id` },
        { severity: 'danger', title: `Update ${label} is missing an id` },
      ])
    })

    it('reports an artifact that cannot be loaded', async () => {
      const load = spy(store(), loader).mockResolvedValue(undefined)
      expect(await update({ id: 5 })).toEqual({ applied: false })
      expect(load).toHaveBeenCalledWith(5)
      expect(notes()).toEqual([{ severity: 'danger', title: `Could not load ${label} for editing` }])
    })

    it('applies to the already-loaded artifact and opens its editor', async () => {
      const { load, applySpy } = loaded(true)

      expect(await update({ id: 5, name: 'New' })).toEqual({ applied: true })
      expect(load).not.toHaveBeenCalled()
      expect(applySpy).toHaveBeenCalledOnce()
      expect(router.push).toHaveBeenCalledWith(push)
      expect(notes()).toEqual([{ severity: 'success', title: `${title} "Art" updated — review and Save` }])
    })

    it('reloads when a different artifact is loaded', async () => {
      const { load } = loaded(true)
      await update({ id: 6 })
      expect(load).toHaveBeenCalledWith(6)
    })

    it('does not navigate when its editor is already open', async () => {
      loaded(true)
      setRoute({ name: route, params: { id: '5' } })
      await update({ id: 5 })
      expect(router.push).not.toHaveBeenCalled()
    })

    it('still succeeds when opening the editor fails', async () => {
      loaded(true)
      vi.mocked(router.push).mockRejectedValue(new Error('nav'))
      expect(await update({ id: 5 })).toEqual({ applied: true })
    })

    it('reports an update that changed nothing', async () => {
      loaded(false)
      expect(await update({ id: 5 })).toEqual({ applied: false })
      expect(router.push).not.toHaveBeenCalled()
      expect(notes()).toEqual([{ severity: 'info', title: 'No changes to apply' }])
    })

    it('reports an update that throws', async () => {
      const { applySpy } = loaded(true)
      applySpy.mockImplementation(() => {
        throw new Error('kaput')
      })
      expect(await update({ id: 5 })).toEqual({ applied: false })
      expect(notes()).toEqual([{ severity: 'danger', title: `Failed to update ${label}: kaput` }])
    })
  })

  describe('update payload translation', () => {
    it('updateConceptSet expands items into the editor shape', async () => {
      const s = useConceptSetsStore()
      setState(s, 'currentSet', { id: 5, name: 'Art' })
      const applySpy = spy(s, 'applyProposal').mockReturnValue(true)

      await apply({
        kind: 'updateConceptSet',
        payload: {
          id: 5,
          name: 'N',
          items: [{ conceptId: 1, conceptName: 'A', domain: 'Drug', isExcluded: true, includeDescendants: false }],
          itemsToAdd: [{ conceptId: 2, conceptName: 'B' }],
        },
      })

      const base = { conceptCode: '', vocabularyId: '', conceptClassId: '', standardConcept: 'S', invalidReason: null, includeMapped: false }
      expect(applySpy).toHaveBeenCalledWith({
        name: 'N',
        description: undefined,
        items: [{ ...base, conceptId: 1, conceptName: 'A', domainId: 'Drug', isExcluded: true, includeDescendants: false }],
        itemsToAdd: [{ ...base, conceptId: 2, conceptName: 'B', domainId: '', isExcluded: false, includeDescendants: true }],
      })
    })

    it('updateConceptSet leaves absent item lists undefined', async () => {
      const s = useConceptSetsStore()
      setState(s, 'currentSet', { id: 5, name: 'Art' })
      const applySpy = spy(s, 'applyProposal').mockReturnValue(true)

      await apply({ kind: 'updateConceptSet', payload: { id: 5, name: 'N' } })

      expect(applySpy).toHaveBeenCalledWith({ name: 'N', description: undefined, items: undefined, itemsToAdd: undefined })
    })

    it('updateCharacterization accepts a payload without feature analyses', async () => {
      const s = useCharacterizationStore()
      setState(s, 'currentCharacterization', { id: 5, name: 'Art' })
      const applySpy = spy(s, 'applyProposal').mockReturnValue(true)

      expect(await apply({ kind: 'updateCharacterization', payload: { id: 5, name: 'N' } })).toEqual({ applied: true })
      expect(applySpy).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'N', featureAnalyses: undefined, featureAnalysesToAdd: undefined }),
      )
    })

    it('updateCharacterization fills missing feature analysis names', async () => {
      const s = useCharacterizationStore()
      setState(s, 'currentCharacterization', { id: 5, name: 'Art' })
      const applySpy = spy(s, 'applyProposal').mockReturnValue(true)

      await apply({
        kind: 'updateCharacterization',
        payload: { id: 5, featureAnalyses: [{ id: 1 }], featureAnalysesToAdd: [{ id: 2, name: 'B' }, { id: 3 }] },
      })

      expect(applySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          featureAnalyses: [{ id: 1, name: '' }],
          featureAnalysesToAdd: [{ id: 2, name: 'B' }, { id: 3, name: '' }],
        }),
      )
    })
  })
})
