import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateBuilder from '@/components/incidence-rate/IncidenceRateBuilder.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

vi.mock('@/composables/useIncidenceRateBuilder', () => ({
  useIncidenceRateBuilder: () => ({
    save: vi.fn(),
    copy: vi.fn(),
    remove: vi.fn(),
    feedback: { value: null },
  }),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/composables/useEntityAccess', () => ({
  useEntityAccess: () => ({ canWrite: { value: true }, canDelete: { value: true } }),
}))

vi.mock('@/services/webapi', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({ success: true, data: null }),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateIncidenceRate: vi.fn(),
  cancelIncidenceRateGeneration: vi.fn(),
  exportIncidenceRate: vi.fn(),
  importIncidenceRate: vi.fn(),
  assignIncidenceRateTag: vi.fn(),
  unassignIncidenceRateTag: vi.fn(),
}))

const stubs = [
  'IncidenceRateWorkbench',
  'IncidenceRateGeneratePopover',
  'TagSelectionDialog',
  'IncidenceRateConceptSetsPanel',
  'IncidenceRateVersionsPanel',
  'AtlasDialog',
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div/>' } }],
})

describe('IncidenceRateBuilder', () => {
  beforeEach(() => pristinePinia())

  it('renders the workbench when an IR is loaded', async () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    if (store.currentIR) store.currentIR.id = 42
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    expect(w.findComponent({ name: 'AnalysisBuilderShell' }).exists()).toBe(true)
    expect(w.findComponent({ name: 'IncidenceRateWorkbench' }).exists()).toBe(true)
  })

  it('renders an inline title input bound to currentIR.name', async () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    if (store.currentIR) {
      store.currentIR.id = 42
      store.currentIR.name = 'Foo'
    }
    const w = mount(IncidenceRateBuilder, {
      global: { plugins: [vuetify, router], stubs },
    })
    await flushPromises()
    const inp = w.find('[data-testid="ir-builder-name"]').element as HTMLInputElement
    expect(inp.value).toBe('Foo')
  })
})
