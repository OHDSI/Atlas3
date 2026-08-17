import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import PathwayWorkbench from '@/components/pathway/PathwayWorkbench.vue'
import { usePathwayStore } from '@/stores/pathway'
import { listPathwayExecutions } from '@/services/pathway.service'

const vuetify = createVuetify({ components, directives })

const composableMocks = vi.hoisted(() => {
  const design = { value: null as any }
  const results = { value: null as any }
  const load = vi.fn()
  const generation = {
    execution: { value: null as any },
    polling: { value: false },
    error: { value: null as string | null },
    start: vi.fn(),
    cancel: vi.fn(),
    stopPolling: vi.fn(),
  }

  return { design, results, load, generation }
})

const pathwayStatsMock = vi.hoisted(() => vi.fn(() => ({
  nodeName: 'Path A',
  count: 12,
  percentage: 55,
})))

vi.mock('@/services/pathway.service', () => ({
  listPathwayExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getPathwayExecution: vi.fn(),
  getPathwayDesignByGeneration: vi.fn(),
  getPathwayResults: vi.fn(),
  generatePathway: vi.fn(),
  cancelPathwayGeneration: vi.fn(),
}))

vi.mock('@/composables/usePathwayResults', () => ({
  usePathwayResults: () => ({
    design: composableMocks.design,
    results: composableMocks.results,
    load: composableMocks.load,
  }),
}))

vi.mock('@/composables/usePathwayGeneration', () => ({
  usePathwayGeneration: () => composableMocks.generation,
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => ({
    sources: [{ sourceKey: 's1', sourceName: 'Primary source' }],
    isLoading: false,
    fetchDataSources: vi.fn(),
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/utils/pathway-path-stats', () => ({
  computePathStats: pathwayStatsMock,
}))

const stubChildren = [
  'PathwayDesignForm',
  'PathwaySunburst',
  'PathwayTableView',
  'PathwayCanvasToolbar',
  'PathwayCoverageStat',
  'PathwayLegend',
  'PathwayPathStats',
  'DataSourceRunTable',
  'PreviousRunsDialog',
]

describe('PathwayWorkbench', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    composableMocks.design.value = null
    composableMocks.results.value = null
    composableMocks.load.mockReset()
    composableMocks.generation.execution.value = null
    composableMocks.generation.polling.value = false
    composableMocks.generation.error.value = null
    composableMocks.generation.start.mockReset()
    composableMocks.generation.cancel.mockReset()
    composableMocks.generation.stopPolling.mockReset()
    pathwayStatsMock.mockClear()
  })

  it('renders the empty-canvas state when no pathwayId is given', () => {
    const w = mount(PathwayWorkbench, {
      props: { pathwayId: null },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    expect(w.find('[data-testid="canvas-empty"]').exists()).toBe(true)
  })

  it('renders the three panes with a loaded pathway and no execution', () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    const w = mount(PathwayWorkbench, {
      props: { pathwayId: 1 },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    expect(w.find('[data-testid="workbench-design-rail"]').exists()).toBe(true)
    expect(w.find('[data-testid="workbench-canvas"]').exists()).toBe(true)
    expect(w.find('[data-testid="workbench-insights-rail"]').exists()).toBe(true)
  })

  // A run the agent starts belongs to no composable on this page, so nothing
  // polled it: the workbench sat on "No runs yet" until a manual reload and a
  // perfectly good generation looked like it had never happened.
  it('polls a run the agent started, and stops once it reaches a terminal state', async () => {
    vi.useFakeTimers()
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    vi.mocked(listPathwayExecutions).mockResolvedValue({
      success: true,
      data: [{ id: 9, status: 'RUNNING' }],
    } as never)

    const w = mount(PathwayWorkbench, {
      props: { pathwayId: 1 },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    await flushPromises()
    const calls = () => vi.mocked(listPathwayExecutions).mock.calls.length
    const atMount = calls()

    store.notifyAgentGeneration()
    await flushPromises()
    expect(calls(), 'the signal should trigger an immediate refresh').toBeGreaterThan(atMount)

    const afterSignal = calls()
    await vi.advanceTimersByTimeAsync(2000)
    expect(calls(), 'polling should continue while the run is RUNNING').toBeGreaterThan(afterSignal)

    vi.mocked(listPathwayExecutions).mockResolvedValue({
      success: true,
      data: [{ id: 9, status: 'COMPLETED' }],
    } as never)
    await vi.advanceTimersByTimeAsync(2000)
    const atTerminal = calls()
    await vi.advanceTimersByTimeAsync(10000)
    expect(calls(), 'polling should stop once the run finishes').toBe(atTerminal)

    w.unmount()
    vi.useRealTimers()
  })

  it('shows the insights empty hint when no path is selected', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    const w = mount(PathwayWorkbench, {
      props: { pathwayId: 1 },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    await flushPromises()
    expect(w.find('[data-testid="insights-empty-hint"]').exists()).toBe(true)
  })

  it('toggles the rail, switches table mode, and reacts to a selected path', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) {
      store.currentPathway.id = 1
      store.currentPathway.targetCohorts = [{ id: 5, name: 'Target' }]
      store.currentPathway.eventCohorts = [{ id: 6, name: 'Event', code: 1 } as never]
    }
    composableMocks.design.value = store.currentPathway
    composableMocks.results.value = {
      pathwayGroups: [{ targetCohortId: 5, totalPathwaysCount: 10, targetCohortCount: 4 }],
      eventCodes: [{ code: 1, isCombo: false }],
    }

    const w = mount(PathwayWorkbench, {
      props: { pathwayId: 1, selectedExecutionId: 2 },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    await flushPromises()

    expect(w.find('[data-testid="workbench-design-rail"]').exists()).toBe(true)
    await w.find('.rail-toggle').trigger('click')

    await w.findComponent({ name: 'PathwayCanvasToolbar' }).vm.$emit('update:mode', 'tabular')
    await nextTick()
    expect(w.findComponent({ name: 'PathwayTableView' }).exists()).toBe(true)

    w.vm.onPathSelect({ code: 1, nodeName: 'Path A', value: 3 })
    await flushPromises()
    expect(w.findComponent({ name: 'PathwayPathStats' }).exists()).toBe(true)
    expect(pathwayStatsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedPath: { path: 'Path A' },
      })
    )
  })

  it('starts, cancels, and opens history from the run table', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 1
    composableMocks.design.value = store.currentPathway
    composableMocks.results.value = {
      pathwayGroups: [{ targetCohortId: 5, totalPathwaysCount: 10, targetCohortCount: 4 }],
      eventCodes: [],
    }
    composableMocks.generation.start.mockResolvedValue(true)
    composableMocks.generation.cancel.mockResolvedValue(true)
    vi.mocked(listPathwayExecutions).mockResolvedValue({
      success: true,
      data: [{ id: 11, sourceKey: 's1', status: 'COMPLETED', executionDate: Date.now() }],
    } as never)

    const w = mount(PathwayWorkbench, {
      props: { pathwayId: 1 },
      global: { plugins: [vuetify], stubs: stubChildren },
    })
    await flushPromises()

    const runTable = w.findComponent({ name: 'DataSourceRunTable' })
    await runTable.vm.$emit('run', 's1')
    await runTable.vm.$emit('cancel', 's1')
    await runTable.vm.$emit('show-history', 's1')
    await flushPromises()

    expect(composableMocks.generation.start).toHaveBeenCalledWith('s1')
    expect(composableMocks.generation.cancel).toHaveBeenCalledWith('s1')
    expect(w.findComponent({ name: 'PreviousRunsDialog' }).props('modelValue')).toBe(true)

    await w.findComponent({ name: 'PreviousRunsDialog' }).vm.$emit('select', 11)
    expect(w.emitted('execution:select')?.at(-1)).toEqual([11])
  })
})
