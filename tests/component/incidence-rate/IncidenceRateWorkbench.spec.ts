import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateWorkbench from '@/components/incidence-rate/IncidenceRateWorkbench.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

vi.mock('@/services/incidence-rate.service', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({ success: true, data: null }),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateIncidenceRate: vi.fn(),
  cancelIncidenceRateGeneration: vi.fn(),
}))


vi.mock('@/stores/datasources', () => ({
  useDataSourcesStore: () => ({ sources: [], isLoading: false, fetchDataSources: vi.fn() }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

const stubs = [
  'IncidenceRateDesignRail',
  'IncidenceRateCanvasToolbar',
  'IncidenceRateRunMeta',
  'IncidenceRateTreemap',
  'IncidenceRateRatesTable',
  'IncidenceRateInsightsRail',
  'IncidenceRateEmptyState',
  'IncidenceRateStratifyInspector',
  'DataSourceRunTable',
  'PreviousRunsDialog',
]

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }] })

describe('IncidenceRateWorkbench', () => {
  beforeEach(() => pristinePinia())

  function loadedStore() {
    const store = useIncidenceRateStore()
    store.createNewIR()
    if (store.currentIR) store.currentIR.id = 42
    return store
  }

  it('renders the workbench shell when there is no IR (no-id empty state)', () => {
    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, router], stubs },
    })
    expect(w.find('[data-testid="ir-workbench"]').exists()).toBe(true)
  })

  it('renders all three lanes when an IR is loaded', async () => {
    loadedStore()
    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    expect(w.find('[data-testid="ir-workbench-rail"]').exists()).toBe(true)
    expect(w.find('[data-testid="ir-workbench-canvas"]').exists()).toBe(true)
    expect(w.find('[data-testid="ir-workbench-insights"]').exists()).toBe(true)
  })

  it('auto-selects the latest completed run when no ?run is set', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = loadedStore()

    store.setExecutionInfo('CCAE', {
      executionInfo: { id: { analysisId: 42, sourceId: 7 }, status: 'COMPLETED', startTime: 100 },
      summaryList: [],
    })

    let pushed: unknown = null
    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })
    const origReplace = r.replace.bind(r)
    r.replace = ((to: unknown) => { pushed = to; return origReplace(to as never) }) as typeof r.replace

    mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()
    expect(pushed).toMatchObject({ query: { run: '7' } })
  })

  it('toggles the design rail and fires the strata add/edit handlers', async () => {
    const store = loadedStore()
    const addSpy = vi.spyOn(store, 'addStratifyRule').mockImplementation(() => undefined)
    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()

    await w.get('button.rail-toggle').trigger('click')
    await w.get('button.rail-toggle').trigger('click')
    await w.findComponent({ name: 'IncidenceRateDesignRail' }).vm.$emit('strata:add')
    await w.findComponent({ name: 'IncidenceRateDesignRail' }).vm.$emit('strata:edit', 0)

    expect(addSpy).toHaveBeenCalled()
    expect(w.find('[data-testid="ir-workbench-rail"]').exists()).toBe(true)
  })

  it('routes history selections back to the run query', async () => {
    loadedStore()
    const r = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div/>' } }] })
    const pushSpy = vi.spyOn(r, 'replace')
    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r], stubs },
    })
    await flushPromises()
    await w.findComponent({ name: 'PreviousRunsDialog' }).vm.$emit('select', '7')
    expect(pushSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '7' }) })
  })
})
