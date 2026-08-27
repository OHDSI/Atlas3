import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationWorkbench from '@/components/characterization/CharacterizationWorkbench.vue'
import { useCharacterizationStore } from '@/stores/characterization'
import {
  getCharacterizationExecution,
  getCharacterizationResultCount,
  getCharacterizationResults,
} from '@/services/characterization.service'

const mockResultCount = vi.mocked(getCharacterizationResultCount)
const mockResults = vi.mocked(getCharacterizationResults)
const mockDataSources = {
  sources: [{ sourceId: 12, sourceKey: 'CCAE', sourceName: 'CCAE' }],
  isLoading: false,
  fetchDataSources: vi.fn().mockResolvedValue(undefined),
}

// vi.mock factories are hoisted above imports, so the ApiResult shape is
// inlined here rather than built via the `success()` helper.
vi.mock('@/services/characterization.service', () => ({
  getCharacterizationExecution: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
  }),
  getCharacterizationResultCount: vi.fn().mockResolvedValue({ success: true, data: 0 }),
  getCharacterizationResults: vi.fn().mockResolvedValue({ success: true, data: [] }),
  listCharacterizationExecutions: vi.fn().mockResolvedValue({
    success: true,
    data: [{ id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 }],
  }),
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

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => mockDataSources,
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohortGenerationInfo: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: { sourceId: 12 }, personCount: 123 },
    ],
  }),
}))

const vuetify = createVuetify({ components, directives })
const stubs = [
  'CharacterizationDesignRail', 'CharacterizationCanvasToolbar',
  'CharacterizationRunMeta', 'ResultsFilterPanel',
  'CharacterizationTable1View', 'CharacterizationPerAnalysisView',
  'CharacterizationEmptyState', 'ConfigureInspector',
  'DataSourceRunTable', 'PreviousRunsDialog',
]

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/characterizations/:id', name: 'characterization-edit', component: { template: '<div/>' } }],
  })
}

const baseDraft = () => ({
  id: 5, name: 'X', description: '', cohorts: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
  featureAnalyses: [], stratas: [],
})

describe('CharacterizationWorkbench', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockDataSources.sources = [{ sourceId: 12, sourceKey: 'CCAE', sourceName: 'CCAE' }]
    mockDataSources.fetchDataSources.mockClear()
    mockResultCount.mockReset()
    mockResultCount.mockResolvedValue({ success: true, data: 0 })
    mockResults.mockReset()
    mockResults.mockResolvedValue({ success: true, data: [] })
    vi.mocked(getCharacterizationExecution).mockResolvedValue({
      success: true,
      data: { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
    })
  })

  it('shows no-id empty state when characterizationId is null', () => {
    const router = makeRouter()
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: { name: '', description: '', cohorts: [], featureAnalyses: [], stratas: [] },
               characterizationId: null, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    const empty = w.findComponent({ name: 'CharacterizationEmptyState' })
    expect(empty.exists()).toBe(true)
    expect(empty.props('variant')).toBe('no-id')
  })

  it('switches to per-analysis view on toolbar mode change', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    const toolbar = w.findComponent({ name: 'CharacterizationCanvasToolbar' })
    await toolbar.vm.$emit('update:mode', 'perAnalysis')
    expect(w.findComponent({ name: 'CharacterizationPerAnalysisView' }).exists()).toBe(true)
  })

  it('parses invalid run ids as null when no executions are loaded', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5?run=abc')
    const store = useCharacterizationStore()
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [] as never
    })
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    expect(w.findComponent({ name: 'CharacterizationEmptyState' }).props('variant')).toBe('no-runs')
    expect(w.findComponent({ name: 'DataSourceRunTable' }).props('selectedExecutionId')).toBeNull()
  })

  it('shows pending and failed empty variants from the selected execution status', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5?run=7')
    vi.mocked(getCharacterizationExecution).mockResolvedValueOnce({
      success: true,
      data: { id: 7, sourceKey: 'CCAE', status: 'PENDING', startTime: 0, executionDuration: 0 },
    })
    const pending = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    expect(pending.findComponent({ name: 'CharacterizationEmptyState' }).props('variant')).toBe('run-pending')

    vi.mocked(getCharacterizationExecution).mockResolvedValueOnce({
      success: true,
      data: { id: 7, sourceKey: 'CCAE', status: 'FAILED', startTime: 0, executionDuration: 0 },
    })
    const failed = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    expect(failed.findComponent({ name: 'CharacterizationEmptyState' }).props('variant')).toBe('run-failed')
  })

  it('clears a stale run query when the characterization id changes', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5?run=7')
    const store = useCharacterizationStore()
    const disposeSpy = vi.spyOn(store, 'dispose')
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [
        { id: 7, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
      ] as never
    })
    const replaceSpy = vi.spyOn(router, 'replace')
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    await w.setProps({ characterizationId: 6 })
    await flushPromises()

    expect(disposeSpy).toHaveBeenCalled()
    expect(replaceSpy).toHaveBeenCalledWith({ query: {} })
  })

  it('fetches cohort sizes when std diff is enabled and sources start empty', async () => {
    mockDataSources.sources = []
    const router = makeRouter()
    await router.push('/characterizations/5')
    mockResults.mockResolvedValue({ success: true, data: [
      {
        analysisId: 1,
        analysisName: 'Analysis A',
        covariateId: 11,
        covariateName: 'Cov A',
        conceptId: 0,
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 10,
        pct: 5,
        resultType: 'PREVALENCE',
      },
    ] })
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5, availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    await w.findComponent({ name: 'CharacterizationCanvasToolbar' }).vm.$emit('open-configure')
    await w.findComponent({ name: 'ConfigureInspector' }).vm.$emit('update:config', {
      ...w.findComponent({ name: 'ConfigureInspector' }).props('config'),
      showStdDiffCI: true,
    })
    await flushPromises()

    expect(mockDataSources.fetchDataSources).toHaveBeenCalled()
  })

  it('opens and closes the configure inspector', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(false)
    await w.findComponent({ name: 'CharacterizationCanvasToolbar' }).vm.$emit('open-configure')
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(true)
    await w.findComponent({ name: 'ConfigureInspector' }).vm.$emit('close')
    expect(w.findComponent({ name: 'ConfigureInspector' }).props('open')).toBe(false)
  })

  it('wires the toolbar, filters, design rail, history, and cohort-size watcher branches', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')

    mockResultCount.mockResolvedValue({ success: true, data: 1 })
    mockResults.mockResolvedValue({ success: true, data: [
      {
        analysisId: 1,
        analysisName: 'Analysis A',
        covariateId: 11,
        covariateName: 'Cov A',
        conceptId: 0,
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 10,
        pct: 5,
        resultType: 'PREVALENCE',
      },
      {
        analysisId: 2,
        analysisName: 'Analysis B',
        covariateId: 22,
        covariateName: 'Cov B',
        conceptId: 0,
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 3,
        pct: 2,
        resultType: 'DISTRIBUTION',
      },
    ] })

    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: {
        modelValue: baseDraft(),
        characterizationId: 5,
        availableCohorts: [],
        availableFeatureAnalyses: []
      },
    })
    await flushPromises()

    const toolbar = w.findComponent({ name: 'CharacterizationCanvasToolbar' })
    await toolbar.vm.$emit('update:mode', 'table1')
    await toolbar.vm.$emit('update:threshold', 0.2)
    await toolbar.vm.$emit('open-configure')
    await toolbar.vm.$emit('export')
    await w.findComponent({ name: 'CharacterizationDesignRail' }).vm.$emit('update:modelValue', baseDraft())

    const filtersPanel = w.findComponent({ name: 'ResultsFilterPanel' })
    await filtersPanel.vm.$emit('update:selected-analysis-ids', [1])
    await filtersPanel.vm.$emit('update:selected-domains', ['D1'])
    await filtersPanel.vm.$emit('update:selected-cohort-id', 1)

    const inspector = w.findComponent({ name: 'ConfigureInspector' })
    await inspector.vm.$emit('update:config', { ...inspector.props('config'), showStdDiffCI: true })
    await inspector.vm.$emit('close')
    await flushPromises()

    await w.findComponent({ name: 'CharacterizationTable1View' }).vm.$emit('explore', {
      analysisId: 1,
      analysisName: 'Analysis A',
      covariateId: 11,
      covariateName: 'Cov A',
      cohortId: 1,
      cohortName: 'Cohort A',
      count: 10,
      pct: 5,
      resultType: 'PREVALENCE',
    })

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('show-history', 'CCAE')
    expect(w.findComponent({ name: 'PreviousRunsDialog' }).props('modelValue')).toBe(true)
    expect(w.findComponent({ name: 'CharacterizationTable1View' }).exists()).toBe(true)
  })

  it('run with a returned execution pins the run query and starts polling', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const runSpy = vi.spyOn(store, 'runExecution').mockResolvedValue({
      id: 42, sourceKey: 'CCAE', status: 'PENDING', startTime: 0, executionDuration: 0,
    })
    const pollSpy = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    // Spy only after the mount-time watchers have finished replacing the query.
    const replaceSpy = vi.spyOn(router, 'replace')
    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('run', 'CCAE')
    await flushPromises()

    expect(runSpy).toHaveBeenCalledWith(5, 'CCAE')
    expect(replaceSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '42' }) })
    expect(pollSpy).toHaveBeenCalledWith(42, expect.any(Function))
  })

  it('run that resolves null neither pins the run query nor starts polling', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const runSpy = vi.spyOn(store, 'runExecution').mockResolvedValue(null)
    const pollSpy = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    const replaceSpy = vi.spyOn(router, 'replace')
    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('run', 'CCAE')
    await flushPromises()

    expect(runSpy).toHaveBeenCalledWith(5, 'CCAE')
    expect(replaceSpy).not.toHaveBeenCalled()
    expect(pollSpy).not.toHaveBeenCalled()
  })

  it('selects a completed execution by default when executions load', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [
        { id: 21, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
      ] as never
    })
    vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const replaceSpy = vi.spyOn(router, 'replace')

    mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: {
        modelValue: baseDraft(),
        characterizationId: 5,
        availableCohorts: [],
        availableFeatureAnalyses: []
      },
    })

    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '21' }) })
  })

  it('falls back to a failed execution when no completed run exists', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [
        { id: 33, sourceKey: 'CCAE', status: 'FAILED', startTime: 0, executionDuration: 0 },
      ] as never
    })
    vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const replaceSpy = vi.spyOn(router, 'replace')

    mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: {
        modelValue: baseDraft(),
        characterizationId: 5,
        availableCohorts: [],
        availableFeatureAnalyses: []
      },
    })

    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '33' }) })
  })

  it('shows the no-runs state when there are no executions to select', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [] as never
    })
    vi.spyOn(store, 'pollExecution').mockImplementation(() => {})

    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: {
        modelValue: baseDraft(),
        characterizationId: 5,
        availableCohorts: [],
        availableFeatureAnalyses: []
      },
    })

    await flushPromises()

    const empty = w.findComponent({ name: 'CharacterizationEmptyState' })
    expect(empty.exists()).toBe(true)
    expect(empty.props('variant')).toBe('no-runs')
  })

  it('seeds polling for running executions loaded on mount and disposes on teardown', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const pollSpy = vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const disposeSpy = vi.spyOn(store, 'dispose').mockImplementation(() => {})
    vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [
        { id: 7, sourceKey: 'CCAE', status: 'RUNNING', startTime: 0, executionDuration: 0 },
        { id: 8, sourceKey: 'CCAE', status: 'COMPLETED', startTime: 0, executionDuration: 0 },
      ] as never
    })

    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    expect(pollSpy).toHaveBeenCalledWith(7, expect.any(Function))
    expect(pollSpy).not.toHaveBeenCalledWith(8, expect.any(Function))

    w.unmount()
    expect(disposeSpy).toHaveBeenCalled()
  })

  it('cancels the latest execution for a source and refreshes the list', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const store = useCharacterizationStore()
    const loadSpy = vi.spyOn(store, 'loadExecutions').mockImplementation(async () => {
      store.executions = [
        { id: 7, sourceKey: 'CCAE', status: 'RUNNING', startTime: 0, executionDuration: 0 },
      ] as never
    })
    vi.spyOn(store, 'pollExecution').mockImplementation(() => {})
    const cancelSpy = vi.spyOn(store, 'cancelExecution').mockResolvedValue(undefined)
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('cancel', 'CCAE')

    expect(cancelSpy).toHaveBeenCalledWith(5, 'CCAE', 7)
    expect(loadSpy).toHaveBeenCalled()
  })

  it('select-result from the main table changes the selected execution', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const pushSpy = vi.spyOn(router, 'push')
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('select-result', 7)

    expect(pushSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '7' }) })
  })

  it('ignores invalid history selections', async () => {
    const router = makeRouter()
    await router.push('/characterizations/5')
    const pushSpy = vi.spyOn(router, 'push')
    const w = mount(CharacterizationWorkbench, {
      global: { plugins: [router, vuetify], stubs },
      props: { modelValue: baseDraft(), characterizationId: 5,
               availableCohorts: [], availableFeatureAnalyses: [] },
    })
    await flushPromises()

    await w.findComponent({ name: 'PreviousRunsDialog' }).vm.$emit('select', 'not-a-number')

    expect(pushSpy).not.toHaveBeenCalled()
  })
})
