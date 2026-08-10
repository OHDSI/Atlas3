/**
 * Component tests: PathwayManagerView
 *
 * Mirrors IncidenceRateManagerView.spec.ts: the route's beforeEnter already
 * loads a version preview, so mounting must not fetch it a second time, and
 * replacing route.params with identical values must not retrigger the load.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import { mount, VueWrapper } from '@vue/test-utils'
import PathwayManagerView from '@/views/PathwayManagerView.vue'

const mockRoute = reactive<{ params: Record<string, string> }>({ params: {} })

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

vi.mock('@/components/pathway/PathwayBuilder.vue', () => ({
  default: {
    name: 'PathwayBuilder',
    template: '<div class="pathway-builder-mock" />',
  },
}))

const store = {
  currentPathway: null as { id: number } | null,
  isPreviewMode: false,
  previewVersion: null as { version: number } | null,
  loadPathway: vi.fn(),
  loadVersionPreview: vi.fn(),
  restoreFromDraft: vi.fn(() => false),
  createNewPathway: vi.fn(),
}

vi.mock('@/stores/pathway', () => ({
  usePathwayStore: () => store,
}))

describe('PathwayManagerView.vue', () => {
  let wrapper: VueWrapper

  // mockRoute is reactive, so a wrapper left mounted would keep watching it
  // and re-run loadFromRoute() during the next test.
  afterEach(() => wrapper.unmount())

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.params = {}
    store.currentPathway = null
    store.isPreviewMode = false
    store.previewVersion = null
    store.loadPathway.mockResolvedValue(true)
    store.loadVersionPreview.mockResolvedValue(true)
    store.restoreFromDraft.mockReturnValue(false)
  })

  async function flushMounted() {
    await wrapper.vm.$nextTick()
    await Promise.resolve()
    await Promise.resolve()
  }

  it('loads the plain pathway when no version param is present', async () => {
    mockRoute.params = { id: '5' }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadPathway).toHaveBeenCalledWith(5)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
  })

  it('loads the version preview instead of the plain pathway when a version param is present', async () => {
    mockRoute.params = { id: '5', version: '3' }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
    expect(store.loadPathway).not.toHaveBeenCalled()
  })

  it('loads the plain pathway when version param is the literal "current"', async () => {
    mockRoute.params = { id: '5', version: 'current' }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadPathway).toHaveBeenCalledWith(5)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
  })

  it('skips the refetch when the store already holds exactly this version preview', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentPathway = { id: 5 }
    store.previewVersion = { version: 3 }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadVersionPreview).not.toHaveBeenCalled()
    expect(store.loadPathway).not.toHaveBeenCalled()
  })

  it('refetches when the store holds a preview of a different version', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentPathway = { id: 5 }
    store.previewVersion = { version: 2 }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('refetches when the store holds a preview of a different pathway', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = true
    store.currentPathway = { id: 9 }
    store.previewVersion = { version: 3 }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('refetches when the store is not in preview mode despite matching id and version', async () => {
    mockRoute.params = { id: '5', version: '3' }
    store.isPreviewMode = false
    store.currentPathway = { id: 5 }
    store.previewVersion = { version: 3 }

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.loadVersionPreview).toHaveBeenCalledWith(5, 3)
  })

  it('restores the draft when the route carries no usable id', async () => {
    mockRoute.params = {}
    store.restoreFromDraft.mockReturnValue(true)

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.restoreFromDraft).toHaveBeenCalled()
    expect(store.createNewPathway).not.toHaveBeenCalled()
  })

  it('creates a new pathway when there is no id and no draft to restore', async () => {
    mockRoute.params = {}
    store.restoreFromDraft.mockReturnValue(false)

    wrapper = mount(PathwayManagerView)
    await flushMounted()

    expect(store.createNewPathway).toHaveBeenCalled()
  })

  it('does not reload when route.params is replaced with identical id and version', async () => {
    mockRoute.params = { id: '5', version: '3' }

    wrapper = mount(PathwayManagerView)
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
