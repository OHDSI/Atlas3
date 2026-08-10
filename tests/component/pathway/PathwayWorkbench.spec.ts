import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import PathwayWorkbench from '@/components/pathway/PathwayWorkbench.vue'
import { usePathwayStore } from '@/stores/pathway'
import { listPathwayExecutions } from '@/services/pathway.service'

const vuetify = createVuetify({ components, directives })

vi.mock('@/services/pathway.service', () => ({
  listPathwayExecutions: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getPathwayExecution: vi.fn(),
  getPathwayDesignByGeneration: vi.fn(),
  getPathwayResults: vi.fn(),
  generatePathway: vi.fn(),
  cancelPathwayGeneration: vi.fn(),
}))

vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => ({ sources: [], isLoading: false, fetchDataSources: vi.fn() }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
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
  beforeEach(() => setActivePinia(createPinia()))

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
})
