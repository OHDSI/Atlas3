import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Ref, ShallowRef } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { Router } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationWorkbench from '@/components/characterization/CharacterizationWorkbench.vue'
import { useCharacterizationStore } from '@/stores/characterization'
import { getCharacterizationDesignSnapshot } from '@/services/characterization.service'
import { getCohortGenerationInfo } from '@/services/cohort-definition.service'
import { exportCharacterizationResults } from '@/components/characterization/characterization-export'
import type {
  CharacterizationDefinition,
  CharacterizationExecution,
  PrevalenceStat,
} from '@/models/characterization.types'
import { tr } from '../../helpers/i18n-mock'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

interface ResultsState {
  execution: Ref<CharacterizationExecution | null>
  resultCount: Ref<number>
  prevalence: ShallowRef<PrevalenceStat[]>
  distribution: ShallowRef<unknown[]>
  strataCounts: ShallowRef<Record<string, Record<string, number>>>
  loading: Ref<boolean>
  error: Ref<string | null>
}

const results = vi.hoisted(() => ({
  state: null as unknown as ResultsState,
  load: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('@/composables/useCharacterizationResults', async () => {
  const { ref, shallowRef } = await import('vue')
  return {
    useCharacterizationResults: () => {
      results.state = {
        execution: ref(null),
        resultCount: ref(0),
        prevalence: shallowRef([]),
        distribution: shallowRef([]),
        strataCounts: shallowRef({}),
        loading: ref(false),
        error: ref(null),
      }
      return { ...results.state, load: results.load, reset: results.reset }
    },
  }
})

const sources = vi.hoisted(() => ({
  store: {
    sources: [] as Array<{ sourceId: number; sourceKey: string; sourceName?: string }>,
    isLoading: false,
    fetchDataSources: vi.fn(),
  },
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => sources.store,
}))

vi.mock('@/services/characterization.service', () => ({
  getCharacterizationExecution: vi.fn(),
  getCharacterizationDesignSnapshot: vi.fn(),
  getCharacterizationResultCount: vi.fn(),
  getCharacterizationResults: vi.fn(),
  listCharacterizationExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getCharacterizationExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateCharacterization: vi.fn(),
  cancelCharacterizationGeneration: vi.fn(),
  getCharacterization: vi.fn(),
  listCharacterizations: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  copyCharacterization: vi.fn(),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohortGenerationInfo: vi.fn(),
}))

vi.mock('@/components/characterization/characterization-export', () => ({
  exportCharacterizationResults: vi.fn(),
}))

const vuetify = createVuetify({ components, directives })
const stubs = {
  CharacterizationDesignRail: true,
  CharacterizationCanvasToolbar: {
    name: 'CharacterizationCanvasToolbar',
    props: ['configureOpen', 'mode', 'activeRun', 'threshold', 'hasResults'],
    template: '<div><slot name="configure-panel" /></div>',
  },
  CharacterizationRunMeta: true,
  CharacterizationPersonCounts: true,
  ResultsFilterPanel: true,
  CharacterizationTable1View: true,
  CharacterizationPerAnalysisView: true,
  CharacterizationDashboardView: true,
  CharacterizationEmptyState: true,
  ConfigureInspector: true,
  DataSourceRunTable: true,
  PreviousRunsDialog: true,
  AtlasSwitch: { name: 'AtlasSwitch', props: ['modelValue', 'label'], template: '<div />' },
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/characterizations/new', component: { template: '<div/>' } },
      { path: '/characterizations/:id', component: { template: '<div/>' } },
    ],
  })
}

function design(overrides: Partial<CharacterizationDefinition> = {}): CharacterizationDefinition {
  return {
    id: 5,
    name: 'X',
    description: '',
    cohorts: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    featureAnalyses: [],
    stratas: [],
    ...overrides,
  }
}

function exec(id: number, status: string, extra: Partial<CharacterizationExecution> = {}): CharacterizationExecution {
  return { id, sourceKey: 'CCAE', status, startTime: 0, ...extra } as CharacterizationExecution
}

function prevalenceRow(overrides: Partial<PrevalenceStat> = {}): PrevalenceStat {
  return {
    analysisId: 1,
    analysisName: 'Analysis A',
    covariateId: 11,
    covariateName: 'Cov',
    conceptId: 0,
    cohorts: [{ id: 1, name: 'A' }],
    strataNames: {},
    count: {},
    pct: {},
    ...overrides,
  }
}

let executionsToLoad: CharacterizationExecution[]
let loadedExecution: (id: number) => CharacterizationExecution
let nextPrevalence: PrevalenceStat[]

function setupStore() {
  const store = useCharacterizationStore()
  const loadExecutions = vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
    store.executions = executionsToLoad.map(e => ({ ...e }))
  })
  const pollExecution = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
  const dispose = vi.spyOn(store, 'dispose')
  return { store, loadExecutions, pollExecution, dispose }
}

async function mountWorkbench(
  path: string,
  props: Partial<{ modelValue: CharacterizationDefinition; characterizationId: number | null }> = {},
  router: Router = makeRouter(),
) {
  await router.push(path)
  const w = mount(CharacterizationWorkbench, {
    global: { plugins: [router, vuetify], stubs },
    props: {
      modelValue: design(),
      characterizationId: 5,
      availableCohorts: [],
      availableFeatureAnalyses: [],
      ...props,
    },
  })
  await flushPromises()
  return { w, router }
}

const find = (w: VueWrapper, name: string) => w.findComponent({ name })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  sources.store.sources = [{ sourceId: 12, sourceKey: 'CCAE', sourceName: 'Commercial Claims' }]
  sources.store.fetchDataSources.mockResolvedValue(undefined)
  executionsToLoad = [exec(7, 'COMPLETED')]
  loadedExecution = id => exec(id, 'COMPLETED')
  nextPrevalence = []
  results.load.mockImplementation(async (id: number) => {
    results.state.execution.value = loadedExecution(id)
    results.state.prevalence.value = nextPrevalence
    return true
  })
  results.reset.mockImplementation(() => {
    results.state.execution.value = null
    results.state.prevalence.value = []
  })
  vi.mocked(getCharacterizationDesignSnapshot).mockResolvedValue({ success: false, error: new Error('none') } as never)
  vi.mocked(getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] } as never)
})

describe('CharacterizationWorkbench: initial state', () => {
  it('collapses the design rail for a saved design and toggles it', async () => {
    setupStore()
    const { w } = await mountWorkbench('/characterizations/5')
    expect(w.classes()).toContain('char-workbench--rail-collapsed')
    expect(w.get('.rail-toggle').text()).toBe('▸ ' + tr('components.workbench.showAnalysisDesign'))
    await w.get('.rail-toggle').trigger('click')
    expect(w.classes()).not.toContain('char-workbench--rail-collapsed')
    expect(w.get('.rail-toggle').text()).toBe('◂ ' + tr('components.workbench.hideAnalysisDesign'))
  })

  it('opens the design rail for a new design', async () => {
    setupStore()
    const { w } = await mountWorkbench('/characterizations/new', { characterizationId: null })
    expect(w.classes()).not.toContain('char-workbench--rail-collapsed')
  })

  it('starts in the per-analysis view with history closed and all sources listed', async () => {
    setupStore()
    sources.store.sources = [
      { sourceId: 12, sourceKey: 'CCAE', sourceName: 'Commercial Claims' },
      { sourceId: 13, sourceKey: 'MDCD' },
    ]
    executionsToLoad = [exec(7, 'COMPLETED', { endTime: null, duration: 4 })]
    const { w } = await mountWorkbench('/characterizations/5?run=7')

    expect(find(w, 'CharacterizationCanvasToolbar').props('mode')).toBe('perAnalysis')
    expect(find(w, 'CharacterizationPerAnalysisView').exists()).toBe(true)
    expect(find(w, 'PreviousRunsDialog').props('modelValue')).toBe(false)
    const table = find(w, 'DataSourceRunTable')
    expect(table.props('sources')).toEqual([
      { sourceId: 12, sourceKey: 'CCAE', sourceName: 'Commercial Claims' },
      { sourceId: 13, sourceKey: 'MDCD', sourceName: 'MDCD' },
    ])
    expect(table.props('executions')).toEqual([
      { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, endTime: undefined, duration: 4 },
    ])

    await find(w, 'AtlasSwitch').vm.$emit('update:modelValue', true)
    expect(find(w, 'DataSourceRunTable').props('sources')).toEqual([
      { sourceId: 12, sourceKey: 'CCAE', sourceName: 'Commercial Claims' },
    ])
  })

  it('fetches data sources on mount only when none are loaded', async () => {
    setupStore()
    await mountWorkbench('/characterizations/5?run=7')
    expect(sources.store.fetchDataSources).not.toHaveBeenCalled()

    sources.store.sources = []
    await mountWorkbench('/characterizations/new', { characterizationId: null })
    expect(sources.store.fetchDataSources).toHaveBeenCalledTimes(1)
  })

  it('reports whether the design has strata to the configure inspector', async () => {
    setupStore()
    const { w } = await mountWorkbench('/characterizations/5?run=7', {
      modelValue: design({ stratas: [{ id: 1, name: 'Male' }] as never }),
    })
    expect(find(w, 'ConfigureInspector').props('hasStrata')).toBe(true)
  })

  it('summarises the active run for the toolbar', async () => {
    setupStore()
    results.load.mockImplementation(async (id: number) => {
      results.state.execution.value = exec(id, 'COMPLETED')
      results.state.resultCount.value = 25
      return true
    })
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    expect(find(w, 'CharacterizationCanvasToolbar').props('activeRun')).toEqual({
      id: 7,
      sourceKey: 'CCAE',
      personCount: 25,
    })
  })
})

describe('CharacterizationWorkbench: run gating', () => {
  it('disables running without a saved id and explains why', async () => {
    setupStore()
    const { w } = await mountWorkbench('/characterizations/new', { characterizationId: null })
    const table = find(w, 'DataSourceRunTable')
    expect(table.props('runDisabled')).toBe(true)
    expect(table.props('runDisabledReason')).toBe(tr('characterizations.editor.executions.runDisabledNoId'))
  })

  it('enables running for a clean saved design and disables it once dirty', async () => {
    const { store } = setupStore()
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    expect(find(w, 'DataSourceRunTable').props('runDisabled')).toBe(false)
    expect(find(w, 'DataSourceRunTable').props('runDisabledReason')).toBe('')

    store.isDirty = true
    await flushPromises()
    expect(find(w, 'DataSourceRunTable').props('runDisabled')).toBe(true)
    expect(find(w, 'DataSourceRunTable').props('runDisabledReason')).toBe(tr('components.generation.unsavedChanges'))
  })
})

describe('CharacterizationWorkbench: default execution', () => {
  it('keeps the run already in the query', async () => {
    setupStore()
    executionsToLoad = [exec(21, 'COMPLETED'), exec(7, 'COMPLETED')]
    const router = makeRouter()
    const replace = vi.spyOn(router, 'replace')
    await mountWorkbench('/characterizations/5?run=7', {}, router)
    expect(replace).not.toHaveBeenCalled()
    expect(router.currentRoute.value.query.run).toBe('7')
  })

  it('prefers a completed run over earlier running ones', async () => {
    setupStore()
    executionsToLoad = [exec(1, 'STARTED'), exec(2, 'COMPLETED')]
    const { router } = await mountWorkbench('/characterizations/5')
    expect(router.currentRoute.value.query.run).toBe('2')
  })

  it('falls back to a failed run, skipping running ones', async () => {
    setupStore()
    executionsToLoad = [exec(1, 'STARTED'), exec(3, 'FAILED')]
    const { router } = await mountWorkbench('/characterizations/5')
    expect(router.currentRoute.value.query.run).toBe('3')
  })

  it('selects nothing while every run is still in progress', async () => {
    setupStore()
    executionsToLoad = [exec(1, 'STARTED')]
    const { router } = await mountWorkbench('/characterizations/5')
    expect(router.currentRoute.value.query.run).toBeUndefined()
  })

  it('refreshes the executions when a seeded poll finishes', async () => {
    const { loadExecutions, pollExecution } = setupStore()
    executionsToLoad = [exec(1, 'STARTED')]
    await mountWorkbench('/characterizations/5')
    const onDone = pollExecution.mock.calls[0]![1] as () => void
    loadExecutions.mockClear()
    onDone()
    await flushPromises()
    expect(loadExecutions).toHaveBeenCalledWith(5)
  })
})

describe('CharacterizationWorkbench: characterization id changes', () => {
  it('does not dispose or strip the run query on mount', async () => {
    const { dispose } = setupStore()
    const router = makeRouter()
    const replace = vi.spyOn(router, 'replace')
    await mountWorkbench('/characterizations/5?run=7', {}, router)
    expect(dispose).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalledWith({ query: {} })
  })

  it('disposes when the id is cleared', async () => {
    const { dispose } = setupStore()
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    await w.setProps({ characterizationId: null })
    await flushPromises()
    expect(dispose).toHaveBeenCalled()
  })

  it('does not strip the query on an id change when there is no run in it', async () => {
    setupStore()
    executionsToLoad = []
    const router = makeRouter()
    const { w } = await mountWorkbench('/characterizations/5', {}, router)
    const replace = vi.spyOn(router, 'replace')
    await w.setProps({ characterizationId: 6 })
    await flushPromises()
    expect(replace).not.toHaveBeenCalled()
  })
})

describe('CharacterizationWorkbench: results loading', () => {
  it('loads the selected run on mount with the filter values', async () => {
    setupStore()
    await mountWorkbench('/characterizations/5?run=7')
    expect(results.load).toHaveBeenCalledWith(7, {
      analysisIds: [],
      domainIds: [],
      cohortIds: [],
      thresholdValuePct: 0,
    })
  })

  it('reloads when each filter changes, converting the threshold to a fraction', async () => {
    setupStore()
    nextPrevalence = [prevalenceRow()]
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    const panel = () => find(w, 'ResultsFilterPanel')

    results.load.mockClear()
    await panel().vm.$emit('update:selected-analysis-ids', [1])
    await flushPromises()
    await panel().vm.$emit('update:selected-domains', ['DRUG'])
    await flushPromises()
    await panel().vm.$emit('update:selected-cohort-ids', [1])
    await flushPromises()
    await find(w, 'CharacterizationCanvasToolbar').vm.$emit('update:threshold', 50)
    await flushPromises()

    expect(results.load).toHaveBeenCalledTimes(4)
    expect(results.load).toHaveBeenLastCalledWith(7, {
      analysisIds: [1],
      domainIds: ['DRUG'],
      cohortIds: [1],
      thresholdValuePct: 0.5,
    })
  })

  it('resets results when the run is deselected', async () => {
    setupStore()
    nextPrevalence = [prevalenceRow()]
    const { w, router } = await mountWorkbench('/characterizations/5?run=7')
    expect(find(w, 'ResultsFilterPanel').exists()).toBe(true)

    results.load.mockClear()
    await router.push('/characterizations/5')
    await flushPromises()
    expect(results.reset).toHaveBeenCalled()
    expect(results.load).not.toHaveBeenCalled()
    expect(find(w, 'ResultsFilterPanel').exists()).toBe(false)
  })

  it('shows the results error for a completed run whose results failed', async () => {
    setupStore()
    results.load.mockImplementation(async (id: number) => {
      results.state.execution.value = exec(id, 'COMPLETED')
      results.state.error.value = 'Server exploded'
      return false
    })
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    const empty = find(w, 'CharacterizationEmptyState')
    expect(empty.props('variant')).toBe('results-error')
    expect(empty.props('errorMessage')).toBe('Server exploded')
  })

  it('does not reload while the selected run is still running even if another run finished', async () => {
    const { store } = setupStore()
    executionsToLoad = [exec(9, 'COMPLETED'), exec(7, 'STARTED')]
    loadedExecution = id => exec(id, 'STARTED')
    await mountWorkbench('/characterizations/5?run=7')
    const before = results.load.mock.calls.length

    store.executions = [exec(9, 'COMPLETED'), exec(7, 'STARTED')]
    await flushPromises()
    expect(results.load.mock.calls.length).toBe(before)
  })

  it('reloads at most once per run when the selected run reaches a terminal status', async () => {
    const { store } = setupStore()
    executionsToLoad = [exec(7, 'STARTED')]
    loadedExecution = id => exec(id, 'STARTED')
    await mountWorkbench('/characterizations/5?run=7')
    const before = results.load.mock.calls.length

    store.executions = [exec(7, 'COMPLETED')]
    await flushPromises()
    expect(results.load.mock.calls.length).toBe(before + 1)

    store.executions = [exec(7, 'FAILED')]
    await flushPromises()
    expect(results.load.mock.calls.length).toBe(before + 1)
  })
})

describe('CharacterizationWorkbench: filter options', () => {
  it('derives analyses and sorted domains from results without a generation design', async () => {
    setupStore()
    nextPrevalence = [
      prevalenceRow({ analysisId: 2, analysisName: 'Drugs', domainId: 'DRUG' }),
      prevalenceRow({ analysisId: 1, analysisName: 'Conditions', domainId: 'CONDITION' }),
      prevalenceRow({ analysisId: 3, analysisName: 'Other' }),
    ]
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    const panel = find(w, 'ResultsFilterPanel')
    expect(panel.props('availableAnalyses')).toEqual([
      { id: 2, name: 'Drugs' },
      { id: 1, name: 'Conditions' },
      { id: 3, name: 'Other' },
    ])
    expect(panel.props('availableDomains')).toEqual(['CONDITION', 'DRUG'])
    expect(panel.props('availableCohorts')).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
  })

  it('sorts generation-design domains and skips analyses without one', async () => {
    setupStore()
    nextPrevalence = [prevalenceRow()]
    vi.mocked(getCharacterizationDesignSnapshot).mockResolvedValue({
      success: true,
      data: design({
        featureAnalyses: [
          { id: 20, name: 'Drugs', domain: 'DRUG' },
          { id: 30, name: 'Any' },
          { id: 10, name: 'Conditions', domain: 'CONDITION' },
        ] as never,
      }),
    })
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    expect(find(w, 'ResultsFilterPanel').props('availableDomains')).toEqual(['CONDITION', 'DRUG'])
  })

  it('ignores a generation design that arrives after another run was selected', async () => {
    setupStore()
    executionsToLoad = [exec(7, 'COMPLETED'), exec(8, 'COMPLETED')]
    nextPrevalence = [prevalenceRow({ analysisId: 1, analysisName: 'From results' })]
    let resolveSeven: (value: unknown) => void = () => {}
    vi.mocked(getCharacterizationDesignSnapshot).mockImplementation(id =>
      id === 7
        ? (new Promise(resolve => { resolveSeven = resolve }) as never)
        : Promise.resolve({ success: false, error: new Error('none') } as never)
    )
    const { w, router } = await mountWorkbench('/characterizations/5?run=7')
    await router.push('/characterizations/5?run=8')
    await flushPromises()

    resolveSeven({
      success: true,
      data: design({ featureAnalyses: [{ id: 99, name: 'Stale', domain: 'STALE' }] as never }),
    })
    await flushPromises()
    expect(find(w, 'ResultsFilterPanel').props('availableAnalyses')).toEqual([{ id: 1, name: 'From results' }])
  })
})

describe('CharacterizationWorkbench: comparative time-series note', () => {
  const threeCohorts = [1, 2, 3].map(id => ({ id, name: `C${id}` }))

  it('shows when two of three cohorts are selected and any analysis is annual', async () => {
    setupStore()
    nextPrevalence = [prevalenceRow({ cohorts: threeCohorts })]
    const { w } = await mountWorkbench('/characterizations/5?run=7', {
      modelValue: design({
        cohorts: threeCohorts,
        featureAnalyses: [
          { id: 1, name: 'Plain' },
          { id: 2, name: 'Annual', includeAnnual: true },
        ] as never,
      }),
    })
    expect(w.find('[data-testid="char-results-time-series-note"]').exists()).toBe(false)

    await find(w, 'ResultsFilterPanel').vm.$emit('update:selected-cohort-ids', [1, 2])
    await flushPromises()
    expect(w.find('[data-testid="char-results-time-series-note"]').exists()).toBe(true)
  })
})

describe('CharacterizationWorkbench: cohort sizes for std diff CI', () => {
  async function mountWithCI() {
    setupStore()
    sources.store.sources = [
      { sourceId: 13, sourceKey: 'OTHER', sourceName: 'Other' },
      { sourceId: 12, sourceKey: 'CCAE', sourceName: 'Commercial Claims' },
    ]
    const { w } = await mountWorkbench('/characterizations/5?run=7', {
      modelValue: design({ cohorts: [1, 2, 3, 4].map(id => ({ id, name: `C${id}` })) }),
    })
    await find(w, 'CharacterizationCanvasToolbar').vm.$emit('update:mode', 'table1')
    return w
  }

  async function enableCI(w: VueWrapper) {
    const inspector = find(w, 'ConfigureInspector')
    await inspector.vm.$emit('update:config', { ...inspector.props('config'), showStdDiffCI: true })
    await flushPromises()
  }

  it('does not look up cohort sizes while the CI option is off', async () => {
    const w = await mountWithCI()
    expect(getCohortGenerationInfo).not.toHaveBeenCalled()
    expect(find(w, 'CharacterizationTable1View').props('cohortSizes')).toEqual({})
  })

  it('uses positive person counts from the run source and skips failed lookups', async () => {
    vi.mocked(getCohortGenerationInfo).mockImplementation(async (id: number) => {
      if (id === 1) {
        return {
          success: true,
          data: [
            { id: { sourceId: 13 }, personCount: 999 },
            { id: { sourceId: 12 }, personCount: 123 },
          ],
        } as never
      }
      if (id === 2) return { success: true, data: [{ id: { sourceId: 12 }, personCount: 0 }] } as never
      if (id === 3) return { success: false, error: new Error('no') } as never
      throw new Error('network')
    })
    const w = await mountWithCI()
    await enableCI(w)

    expect(vi.mocked(getCohortGenerationInfo).mock.calls.map(c => c[0])).toEqual([1, 2, 3, 4])
    expect(find(w, 'CharacterizationTable1View').props('cohortSizes')).toEqual({ '1': 123 })
    expect(sources.store.fetchDataSources).not.toHaveBeenCalled()
  })

  it('leaves sizes empty when the run source is unknown', async () => {
    vi.mocked(getCohortGenerationInfo).mockResolvedValue({
      success: true,
      data: [{ id: { sourceId: 12 }, personCount: 50 }],
    } as never)
    loadedExecution = id => exec(id, 'COMPLETED', { sourceKey: 'MISSING' })
    const w = await mountWithCI()
    await enableCI(w)
    expect(getCohortGenerationInfo).not.toHaveBeenCalled()
    expect(find(w, 'CharacterizationTable1View').props('cohortSizes')).toEqual({})
  })
})

describe('CharacterizationWorkbench: run, cancel and history actions', () => {
  it('ignores run and cancel without a saved id', async () => {
    const { store } = setupStore()
    const run = vi.spyOn(store, 'runExecution')
    const cancel = vi.spyOn(store, 'cancelExecution')
    const { w } = await mountWorkbench('/characterizations/new', { characterizationId: null })
    await find(w, 'DataSourceRunTable').vm.$emit('run', 'CCAE')
    await find(w, 'DataSourceRunTable').vm.$emit('cancel', 'CCAE')
    await flushPromises()
    expect(run).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
  })

  it('emits nothing when a run starts no execution', async () => {
    const { store } = setupStore()
    vi.spyOn(store, 'runExecution').mockResolvedValue(null)
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    await find(w, 'DataSourceRunTable').vm.$emit('run', 'CCAE')
    await flushPromises()
    expect(w.emitted('snackbar')).toBeUndefined()
  })

  it('refreshes executions when a started run finishes polling', async () => {
    const { store, loadExecutions, pollExecution } = setupStore()
    vi.spyOn(store, 'runExecution').mockResolvedValue(exec(42, 'PENDING'))
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    pollExecution.mockClear()
    await find(w, 'DataSourceRunTable').vm.$emit('run', 'CCAE')
    await flushPromises()
    const onDone = pollExecution.mock.calls[0]![1] as () => void
    loadExecutions.mockClear()
    onDone()
    expect(loadExecutions).toHaveBeenCalledWith(5)
  })

  it('uses translated messages for non-Error run and cancel failures', async () => {
    const { store } = setupStore()
    vi.spyOn(store, 'runExecution').mockRejectedValue('nope')
    vi.spyOn(store, 'cancelExecution').mockRejectedValue('nope')
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    await find(w, 'DataSourceRunTable').vm.$emit('run', 'CCAE')
    await flushPromises()
    await find(w, 'DataSourceRunTable').vm.$emit('cancel', 'CCAE')
    await flushPromises()
    expect(w.emitted('snackbar')).toEqual([
      [tr('cc.fa.runError'), 'error'],
      [tr('cc.fa.cancelError'), 'error'],
    ])
  })

  it('cancels the newest unfinished run of that source', async () => {
    const { store } = setupStore()
    executionsToLoad = [
      exec(1, 'STARTED', { startTime: 100 }),
      exec(2, 'STARTED', { startTime: 300 }),
      exec(3, 'COMPLETED', { startTime: 500 }),
      exec(4, 'STARTED', { sourceKey: 'OTHER', startTime: 900 }),
    ]
    const cancel = vi.spyOn(store, 'cancelExecution').mockResolvedValue(undefined)
    const { w } = await mountWorkbench('/characterizations/5?run=3')
    await find(w, 'DataSourceRunTable').vm.$emit('cancel', 'CCAE')
    await flushPromises()
    expect(cancel).toHaveBeenCalledWith(5, 'CCAE', 2)
  })

  it('names the history source and closes history after a numeric-string selection', async () => {
    setupStore()
    const router = makeRouter()
    const { w } = await mountWorkbench('/characterizations/5?run=7', {}, router)
    const push = vi.spyOn(router, 'push')

    await find(w, 'DataSourceRunTable').vm.$emit('show-history', 'CCAE')
    expect(find(w, 'PreviousRunsDialog').props('modelValue')).toBe(true)
    expect(find(w, 'PreviousRunsDialog').props('sourceName')).toBe('Commercial Claims')
    expect(find(w, 'PreviousRunsDialog').props('sourceKey')).toBe('CCAE')

    await find(w, 'PreviousRunsDialog').vm.$emit('select', '9')
    expect(push).toHaveBeenCalledWith({ query: { run: '9' } })
    expect(find(w, 'PreviousRunsDialog').props('modelValue')).toBe(false)
  })

  it('ignores an empty history selection', async () => {
    setupStore()
    const router = makeRouter()
    const { w } = await mountWorkbench('/characterizations/5?run=7', {}, router)
    const push = vi.spyOn(router, 'push')
    await find(w, 'DataSourceRunTable').vm.$emit('show-history', 'CCAE')
    await find(w, 'PreviousRunsDialog').vm.$emit('select', undefined)
    expect(push).not.toHaveBeenCalled()
    expect(find(w, 'PreviousRunsDialog').props('modelValue')).toBe(true)
  })
})

describe('CharacterizationWorkbench: explore and export', () => {
  it('re-emits explore rows from the results views', async () => {
    setupStore()
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    const row = prevalenceRow()
    await find(w, 'CharacterizationPerAnalysisView').vm.$emit('explore', row)
    expect(w.emitted('explore')).toEqual([[row]])
  })

  it('exports the current results with the selected run', async () => {
    setupStore()
    nextPrevalence = [prevalenceRow()]
    const { w } = await mountWorkbench('/characterizations/5?run=7')
    await find(w, 'CharacterizationCanvasToolbar').vm.$emit('export')
    expect(exportCharacterizationResults).toHaveBeenCalledWith(expect.objectContaining({
      prevalence: nextPrevalence,
      distribution: [],
      cohorts: [{ id: 1, name: 'A' }],
      selectedExecutionId: 7,
      cohortSizes: {},
    }))
  })
})
