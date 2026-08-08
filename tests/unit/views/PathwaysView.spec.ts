/**
 * PathwaysView Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import PathwaysView from '@/views/PathwaysView.vue'
import { usePathwayStore } from '@/stores/pathway'
import type { Pathway } from '@/models/pathway.types'
import { ApiError } from '@/services/api-error'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (_key: string, fallback: string) => ref(fallback),
    tv: (_key: string, fallback: string) => fallback,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/composables/usePermissions', () => ({ usePermissions: vi.fn() }))
vi.mock('@/composables/useEntityAccess', () => ({ useEntityAccessFor: vi.fn() }))
vi.mock('@/services/pathway.service')

import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { listPathways, deletePathway, copyPathway } from '@/services/pathway.service'

const vuetify = createVuetify({ components, directives })

function mkPathway(id: number, overrides: Partial<Pathway> = {}): Pathway {
  return {
    id,
    name: `Pathway ${id}`,
    description: `Description ${id}`,
    targetCohorts: [{ id: 1, name: 'Target A' }],
    eventCohorts: [{ id: 2, name: 'Event A' }, { id: 3, name: 'Event B' }],
    combinationWindow: 30,
    minCellCount: 5,
    maxDepth: 5,
    allowRepeats: false,
    tags: [],
    createdBy: { id: 1, name: 'Alice' },
    modifiedDate: Date.now(),
    ...overrides,
  }
}

function mountView() {
  return mount(PathwaysView, { global: { plugins: [vuetify] } })
}

describe('PathwaysView', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(listPathways).mockResolvedValue({ success: true, data: [] })
    vi.mocked(deletePathway).mockResolvedValue({ success: true, data: undefined })
    vi.mocked(copyPathway).mockResolvedValue({ success: true, data: mkPathway(99) })
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: () => true,
      hasAnyPermission: () => true,
      hasAllPermissions: () => true,
      cacheHitRate: ref(0),
      clearCache: vi.fn(),
    })
    vi.mocked(useEntityAccessFor).mockReturnValue({
      canRead: () => true,
      canWrite: () => true,
      canDelete: () => true,
      isOwner: () => true,
    } as ReturnType<typeof useEntityAccessFor>)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      wrapper = mountView()
      expect(wrapper.exists()).toBe(true)
    })

    it('should fetch pathways on mount', () => {
      wrapper = mountView()
      expect(listPathways).toHaveBeenCalledTimes(1)
    })

    it('should render the search field and create button', () => {
      wrapper = mountView()
      expect(wrapper.find('[data-testid="pathways-search"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="pathways-create"]').exists()).toBe(true)
    })

    it('should render the pathways table', () => {
      wrapper = mountView()
      expect(wrapper.find('[data-testid="pathways-table"]').exists()).toBe(true)
    })

    it('should be loading before the initial fetch resolves', async () => {
      let resolveFetch: (v: unknown) => void = () => {}
      vi.mocked(listPathways).mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

      wrapper = mountView()
      expect(wrapper.vm.loading).toBe(true)

      resolveFetch({ success: true, data: [] })
      await flushPromises()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Row Rendering', () => {
    it('renders target and event counts from the pathway data', async () => {
      vi.mocked(listPathways).mockResolvedValue({
        success: true,
        data: [mkPathway(1)],
      })
      wrapper = mountView()
      await flushPromises()

      const text = wrapper.find('[data-testid="pathways-table"]').text()
      expect(text).toContain('Pathway 1')
      expect(text).toContain('1') // targetCohorts.length
      expect(text).toContain('2') // eventCohorts.length
    })

    it('falls back to 0 when targetCohorts/eventCohorts are missing', async () => {
      vi.mocked(listPathways).mockResolvedValue({
        success: true,
        data: [mkPathway(1, { targetCohorts: undefined, eventCohorts: undefined })],
      })
      wrapper = mountView()
      await flushPromises()

      const nameLink = wrapper.find('[data-testid="pathways-table-row-name"]')
      expect(nameLink.exists()).toBe(true)
      const row = nameLink.element.closest('tr')
      expect(row?.textContent).toContain('0')
    })

    it('shows the error banner when the fetch fails', async () => {
      vi.mocked(listPathways).mockResolvedValue({
        success: false,
        error: new ApiError('boom', 0, null),
      })
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-testid="pathways-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="pathways-error"]').text()).toContain('boom')
    })
  })

  describe('Search', () => {
    it('updates filters.searchQuery and resets the page when typing', async () => {
      wrapper = mountView()
      wrapper.vm.page = 2

      const input = wrapper.find('[data-testid="pathways-search"] input')
      await input.setValue('diabetes')

      expect(wrapper.vm.searchInput).toBe('diabetes')
      expect(wrapper.vm.filters.searchQuery).toBe('diabetes')
      expect(wrapper.vm.page).toBe(0)
    })

    it('clears the query when the field emits a null value', async () => {
      wrapper = mountView()
      wrapper.vm.searchInput = 'diabetes'
      wrapper.vm.filters.searchQuery = 'diabetes'

      const field = wrapper.findComponent({ name: 'AtlasTextField' })
      await field.vm.$emit('update:modelValue', null)

      expect(wrapper.vm.searchInput).toBe('')
      expect(wrapper.vm.filters.searchQuery).toBe('')
    })
  })

  describe('Create Action', () => {
    it('creates a new pathway and navigates to it', async () => {
      wrapper = mountView()
      const store = usePathwayStore()

      await wrapper.find('[data-testid="pathways-create"]').trigger('click')

      expect(store.currentPathway?.name).toBe('')
      expect(store.currentPathway?.targetCohorts).toEqual([])
      expect(mockPush).toHaveBeenCalledWith('/pathways/new')
    })

    it('disables the create button when the user lacks permission', () => {
      vi.mocked(usePermissions).mockReturnValue({
        hasPermission: () => false,
        hasAnyPermission: () => false,
        hasAllPermissions: () => false,
        cacheHitRate: ref(0),
        clearCache: vi.fn(),
      })

      wrapper = mountView()
      const button = wrapper.find('[data-testid="pathways-create"]')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Row Open', () => {
    it('navigates to the pathway detail page when the row name is clicked', async () => {
      vi.mocked(listPathways).mockResolvedValue({ success: true, data: [mkPathway(7)] })
      wrapper = mountView()
      await flushPromises()

      await wrapper.find('[data-testid="pathways-table-row-name"]').trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/pathways/7')
    })

    it('does not navigate when the pathway has no id', () => {
      wrapper = mountView()
      wrapper.vm.handleOpen({} as Pathway)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Copy Action', () => {
    it('copies the pathway and navigates to the new copy on success', async () => {
      vi.mocked(listPathways).mockResolvedValue({ success: true, data: [mkPathway(1)] })
      vi.mocked(copyPathway).mockResolvedValue({ success: true, data: mkPathway(99) })
      wrapper = mountView()
      await flushPromises()

      const copyButton = wrapper.find('button[aria-label="Copy"]')
      await copyButton.trigger('click')
      await flushPromises()

      expect(copyPathway).toHaveBeenCalledWith(1)
      expect(mockPush).toHaveBeenCalledWith('/pathways/99')
      expect(wrapper.vm.feedback).toEqual({ message: 'Pathway copied', color: 'success' })
    })

    it('shows an error and logs when the copy fails', async () => {
      vi.mocked(listPathways).mockResolvedValue({ success: true, data: [mkPathway(1)] })
      vi.mocked(copyPathway).mockResolvedValue({
        success: false,
        error: new ApiError('copy failed', 0, null),
      })
      wrapper = mountView()
      await flushPromises()

      await wrapper.vm.handleCopy(mkPathway(1))

      expect(wrapper.vm.feedback).toEqual({ message: 'Copy failed', color: 'error' })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('does nothing when the pathway has no id', async () => {
      wrapper = mountView()
      await wrapper.vm.handleCopy({} as Pathway)
      expect(copyPathway).not.toHaveBeenCalled()
    })
  })

  describe('Delete Flow', () => {
    it('opens the confirmation dialog with the target id', async () => {
      wrapper = mountView()
      const pathway = mkPathway(5)

      wrapper.vm.handleRemove(pathway)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDelete).toBe(true)
      expect(wrapper.vm.deleteTarget).toBe(5)
    })

    it('ignores removal requests for pathways without an id', () => {
      wrapper = mountView()
      wrapper.vm.handleRemove({} as Pathway)
      expect(wrapper.vm.showDelete).toBe(false)
    })

    it('closes the dialog when cancel is clicked', async () => {
      wrapper = mountView()
      wrapper.vm.showDelete = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
      const cancelButton = buttons.find(b => b.text().includes('Cancel'))
      await cancelButton?.trigger('click')

      expect(wrapper.vm.showDelete).toBe(false)
    })

    it('deletes the pathway, refreshes the list, and shows success feedback', async () => {
      vi.mocked(listPathways).mockResolvedValue({ success: true, data: [mkPathway(5)] })
      vi.mocked(deletePathway).mockResolvedValue({ success: true, data: undefined })
      wrapper = mountView()
      await flushPromises()

      wrapper.vm.deleteTarget = 5
      wrapper.vm.showDelete = true
      await wrapper.vm.confirmDelete()

      expect(deletePathway).toHaveBeenCalledWith(5)
      expect(listPathways).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.feedback).toEqual({ message: 'Pathway deleted', color: 'success' })
      expect(wrapper.vm.showDelete).toBe(false)
      expect(wrapper.vm.deleteTarget).toBeNull()
    })

    it('shows error feedback when delete fails', async () => {
      vi.mocked(deletePathway).mockResolvedValue({
        success: false,
        error: new ApiError('referenced by a generation', 409, null),
      })
      wrapper = mountView()

      wrapper.vm.deleteTarget = 5
      wrapper.vm.showDelete = true
      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.feedback).toEqual({
        message: 'referenced by a generation',
        color: 'error',
      })
    })

    it('does nothing when there is no delete target', async () => {
      wrapper = mountView()
      await wrapper.vm.confirmDelete()
      expect(deletePathway).not.toHaveBeenCalled()
    })
  })

  describe('Feedback Snackbar', () => {
    it('clears feedback when the snackbar closes', async () => {
      wrapper = mountView()
      wrapper.vm.feedback = { message: 'Pathway deleted', color: 'success' }
      await wrapper.vm.$nextTick()

      const snackbar = wrapper.findComponent({ name: 'AtlasSnackbar' })
      await snackbar.vm.$emit('update:modelValue', false)

      expect(wrapper.vm.feedback).toBeNull()
    })
  })

  describe('Pagination', () => {
    it('renders pagination controls and paginates across pages', async () => {
      const data = Array.from({ length: 30 }, (_, i) => mkPathway(i + 1))
      vi.mocked(listPathways).mockResolvedValue({ success: true, data })
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).toContain('1 / 2')

      const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
      const nextButton = buttons.find(b => b.text().includes('Next'))
      await nextButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.page).toBe(1)
      expect(wrapper.text()).toContain('2 / 2')

      const prevButton = wrapper.findAllComponents({ name: 'AtlasButton' }).find(b => b.text().includes('Previous'))
      await prevButton?.trigger('click')
      expect(wrapper.vm.page).toBe(0)
    })

    it('clamps updatePage to the valid page range', async () => {
      const data = Array.from({ length: 30 }, (_, i) => mkPathway(i + 1))
      vi.mocked(listPathways).mockResolvedValue({ success: true, data })
      wrapper = mountView()
      await flushPromises()

      wrapper.vm.updatePage(-5)
      expect(wrapper.vm.page).toBe(0)

      wrapper.vm.updatePage(50)
      expect(wrapper.vm.page).toBe(1)
    })

    it('does not render pagination controls for a single page', async () => {
      vi.mocked(listPathways).mockResolvedValue({ success: true, data: [mkPathway(1)] })
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('1 / 1')
    })
  })
})
