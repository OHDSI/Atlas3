/**
 * Component tests: IncidenceRateManagerView
 *
 * Guards against the version-preview-unreachable regression: mounting on
 * the /incidence-rates/:id/version/:version route must call
 * store.loadVersionPreview and must never call store.loadIR (which nulls
 * previewVersion and wipes the preview - see PathwayManagerView for the
 * pattern this mirrors).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive, ref } from 'vue'
import { mount, VueWrapper } from '@vue/test-utils'
import IncidenceRateManagerView from '@/views/IncidenceRateManagerView.vue'

const mockRoute = reactive<{ params: Record<string, string> }>({ params: {} })

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
  isPreviewMode: false,
  previewVersion: null as { version: number } | null,
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

  // mockRoute is reactive, so a wrapper left mounted would keep watching it
  // and re-run load() during the next test.
  afterEach(() => wrapper.unmount())

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.params = {}
    store.currentIR = null
    store.isPreviewMode = false
    store.previewVersion = null
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

  it('skips the refetch when the store already holds exactly this version preview', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentIR = { id: 5 }
    store.previewVersion = { version: 3 }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadVersionPreview).not.toHaveBeenCalled()
    expect(store.loadIR).not.toHaveBeenCalled()
  })

  it('refetches when the store holds a preview of a different version', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentIR = { id: 5 }
    store.previewVersion = { version: 2 }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('refetches when the store holds a preview of a different incidence rate', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentIR = { id: 9 }
    store.previewVersion = { version: 3 }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('refetches when the store is not in preview mode despite matching id and version', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = false
    store.currentIR = { id: 5 }
    store.previewVersion = { version: 3 }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('renders the error state when the version preview fails to load', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.loadVersionPreview.mockResolvedValue(false)

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()
    await wrapper.vm.$nextTick()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
    expect(wrapper.find('.state.error').text()).toBe('Failed to load incidence rate')
  })

  it('reuses an unsaved draft already in the store when navigating to "new"', async () => {
    mockRoute.params = { id: 'new' }
    store.currentIR = { id: undefined as unknown as number }

    wrapper = mount(IncidenceRateManagerView, { props: { id: 'new' } })
    await flushMounted()

    expect(store.restoreFromDraft).not.toHaveBeenCalled()
    expect(store.createNewIR).not.toHaveBeenCalled()
  })

  it('starts a fresh draft when navigating to "new" from a previously loaded saved design (#293)', async () => {
    // A saved design (with results already polled into the store) was left
    // loaded from a prior visit; navigating to "new" must not keep showing it.
    mockRoute.params = { id: 'new' }
    store.currentIR = { id: 5 }

    wrapper = mount(IncidenceRateManagerView, { props: { id: 'new' } })
    await flushMounted()

    expect(store.createNewIR).toHaveBeenCalled()
  })

  it('does not reload when route.params is replaced with identical id and version', async () => {
    mockRoute.params = { id: '5', version: '3' }

    wrapper = mount(IncidenceRateManagerView, { props: { id: '5' } })
    await flushMounted()
    expect(store.loadVersionPreview).toHaveBeenCalledTimes(1)

    mockRoute.params = { id: '5', version: '3' }
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledTimes(1)

    // Sanity check that the watcher is wired at all.
    mockRoute.params = { id: '5', version: '4' }
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledTimes(2)
    expect(store.loadVersionPreview).toHaveBeenLastCalledWith(5, 4)
  })
})
