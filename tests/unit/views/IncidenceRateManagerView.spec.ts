/**
 * Component tests: IncidenceRateManagerView
 *
 * Guards against the version-preview-unreachable regression: mounting on
 * the /incidence-rates/:id/version/:version route must call
 * store.loadVersionPreview and must never call store.loadIR (which nulls
 * previewVersion and wipes the preview - see PathwayManagerView for the
 * pattern this mirrors).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, VueWrapper } from '@vue/test-utils'
import IncidenceRateManagerView from '@/views/IncidenceRateManagerView.vue'

const mockRoute: { params: Record<string, string> } = { params: {} }

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (_key: string, fallback: string) => ref(fallback),
    tv: (_key: string, fallback: string) => fallback,
  }),
}))

vi.mock('@/components/incidence-rate/IncidenceRateBuilder.vue', () => ({
  default: {
    name: 'IncidenceRateBuilder',
    template: '<div class="ir-builder-mock" />',
  },
}))

const store = {
  currentIR: null as { id: number } | null,
  loadIR: vi.fn(),
  loadVersionPreview: vi.fn(),
  restoreFromDraft: vi.fn(() => false),
  createNewIR: vi.fn(),
  startAutoSave: vi.fn(),
  stopAutoSave: vi.fn(),
}

vi.mock('@/stores/incidence-rate', () => ({
  useIncidenceRateStore: () => store,
}))

describe('IncidenceRateManagerView.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.params = {}
    store.currentIR = null
    store.loadIR.mockResolvedValue(true)
    store.loadVersionPreview.mockResolvedValue(true)
  })

  async function flushMounted() {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await Promise.resolve()
  }

  it('loads the plain IR when no version param is present', async () => {
    mockRoute.params = { id: '5' }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadIR).toHaveBeenCalledWith(5)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
  })

  it('loads the version preview instead of the plain IR when a version param is present', async () => {
    mockRoute.params = { id: '5', version: '3' }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
    expect(store.loadIR).not.toHaveBeenCalled()
  })

  it('loads the plain IR when version param is the literal "current"', async () => {
    mockRoute.params = { id: '5', version: 'current' }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadIR).toHaveBeenCalledWith(5)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
  })
})
