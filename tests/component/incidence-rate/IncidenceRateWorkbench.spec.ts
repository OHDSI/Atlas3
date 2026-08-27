import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateWorkbench from '@/components/incidence-rate/IncidenceRateWorkbench.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { generateIncidenceRate, cancelIncidenceRateGeneration } from '@/services/incidence-rate.service'

const mockGenerate = vi.mocked(generateIncidenceRate)
const mockCancel = vi.mocked(cancelIncidenceRateGeneration)

vi.mock('@/services/incidence-rate.service', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({ success: true, data: null }),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateIncidenceRate: vi.fn().mockResolvedValue({
    success: true,
    data: { id: { analysisId: 42, sourceId: 7 }, status: 'PENDING' },
  }),
  cancelIncidenceRateGeneration: vi.fn().mockResolvedValue({ success: true }),
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
  beforeEach(() => {
    pristinePinia()
    vi.clearAllMocks()
  })

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

  it('routes the eye icon selection back to the run query', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = loadedStore()

    store.setExecutionInfo('CCAE', {
      executionInfo: { id: { analysisId: 42, sourceId: 7 }, status: 'COMPLETED', startTime: 100 },
      summaryList: [],
    })

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })
    const replaceSpy = vi.spyOn(r, 'replace')

    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('select-result', 7)

    expect(replaceSpy).toHaveBeenCalledWith({ query: expect.objectContaining({ run: '7' }) })
  })

  it('runs the selected source when the table emits run', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    loadedStore()

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })

    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('run', 'CCAE')
    await flushPromises()

    expect(mockGenerate).toHaveBeenCalledWith(42, 'CCAE')
  })

  it('cancels the selected source when the table emits cancel', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    loadedStore()

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })

    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('cancel', 'CCAE')
    await flushPromises()

    expect(mockCancel).toHaveBeenCalledWith(42, 'CCAE')
  })

  it('opens the history dialog when the table emits show-history', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    loadedStore()

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })

    const w = mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    await w.findComponent({ name: 'DataSourceRunTable' }).vm.$emit('show-history', 'CCAE')

    expect(w.findComponent({ name: 'PreviousRunsDialog' }).props('modelValue')).toBe(true)
  })

  it('selects the new default run when a different IR design loads', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = loadedStore()

    store.setExecutionInfo('CCAE', {
      executionInfo: { id: { analysisId: 42, sourceId: 11 }, status: 'COMPLETED', startTime: 100 },
      summaryList: [],
    })

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })
    await r.push({ path: '/', query: { run: '999' } })
    await r.isReady()
    const replaceSpy = vi.spyOn(r, 'replace')

    mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ query: { run: '11' } })
  })

  it('leaves no run selected when the design has no generations', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    loadedStore()

    const r = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div/>' } }],
    })
    await r.push({ path: '/', query: { run: '999' } })
    await r.isReady()
    const replaceSpy = vi.spyOn(r, 'replace')

    mount(IncidenceRateWorkbench, {
      global: { plugins: [vuetify, r, pinia], stubs },
    })
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ query: {} })
    expect(replaceSpy).not.toHaveBeenCalledWith({ query: expect.objectContaining({ run: expect.any(String) }) })
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
