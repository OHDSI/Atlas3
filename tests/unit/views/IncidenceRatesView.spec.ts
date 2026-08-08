/**
 * IncidenceRatesView Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import IncidenceRatesView from '@/views/IncidenceRatesView.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useNotifications } from '@/stores/notifications'
import type { IncidenceRate } from '@/models/incidence-rate.types'
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
vi.mock('@/services/webapi')

import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccessFor } from '@/composables/useEntityAccess'
import { listIncidenceRates, deleteIncidenceRate, copyIncidenceRate } from '@/services/webapi'

const vuetify = createVuetify({ components, directives })

function mkIR(id: number, overrides: Partial<IncidenceRate> = {}): IncidenceRate {
  return {
    id,
    name: `IR ${id}`,
    description: `Description ${id}`,
    expression: {
      ConceptSets: [],
      targetIds: [1],
      outcomeIds: [2, 3],
      timeAtRisk: {
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'EndDate', Offset: 0 },
      },
      strata: [],
    },
    tags: [],
    createdBy: { id: 1, name: 'Alice' },
    modifiedDate: Date.now(),
    ...overrides,
  }
}

function mountView() {
  return mount(IncidenceRatesView, { global: { plugins: [vuetify] } })
}

describe('IncidenceRatesView', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [] })
    vi.mocked(deleteIncidenceRate).mockResolvedValue(true)
    vi.mocked(copyIncidenceRate).mockResolvedValue({ success: true, data: mkIR(99) })
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

    it('should fetch incidence rates on mount', () => {
      wrapper = mountView()
      expect(listIncidenceRates).toHaveBeenCalledTimes(1)
    })

    it('should render the search field and create button', () => {
      wrapper = mountView()
      expect(wrapper.find('[data-testid="incidence-rates-search"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="incidence-rates-create"]').exists()).toBe(true)
    })

    it('should render the incidence rates table', () => {
      wrapper = mountView()
      expect(wrapper.find('[data-testid="incidence-rates-table"]').exists()).toBe(true)
    })

    it('should be loading before the initial fetch resolves', async () => {
      let resolveFetch: (v: unknown) => void = () => {}
      vi.mocked(listIncidenceRates).mockReturnValue(new Promise(resolve => { resolveFetch = resolve }))

      wrapper = mountView()
      expect(wrapper.vm.loading).toBe(true)

      resolveFetch({ success: true, data: [] })
      await flushPromises()
      expect(wrapper.vm.loading).toBe(false)
    })
  })

  describe('Row Rendering', () => {
    it('renders target and outcome counts from the expression', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [mkIR(1)] })
      wrapper = mountView()
      await flushPromises()

      const text = wrapper.find('[data-testid="incidence-rates-table"]').text()
      expect(text).toContain('IR 1')
      expect(text).toContain('1') // targetIds.length
      expect(text).toContain('2') // outcomeIds.length
    })

    it('falls back to 0 when the expression is missing', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({
        success: true,
        data: [mkIR(1, { expression: undefined })],
      })
      wrapper = mountView()
      await flushPromises()

      const nameLink = wrapper.find('[data-testid="incidence-rates-table-row-name"]')
      expect(nameLink.exists()).toBe(true)
      const row = nameLink.element.closest('tr')
      expect(row?.textContent).toContain('0')
    })

    it('shows the error banner when the fetch fails', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({
        success: false,
        error: new ApiError('boom', 0, null),
      })
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.find('[data-testid="incidence-rates-error"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="incidence-rates-error"]').text()).toContain('boom')
    })
  })

  describe('Search', () => {
    it('updates filters.searchQuery and resets the page when typing', async () => {
      wrapper = mountView()
      wrapper.vm.page = 2

      const input = wrapper.find('[data-testid="incidence-rates-search"] input')
      await input.setValue('mortality')

      expect(wrapper.vm.searchInput).toBe('mortality')
      expect(wrapper.vm.filters.searchQuery).toBe('mortality')
      expect(wrapper.vm.page).toBe(0)
    })

    it('clears the query when the field emits a null value', async () => {
      wrapper = mountView()
      wrapper.vm.searchInput = 'mortality'
      wrapper.vm.filters.searchQuery = 'mortality'

      const field = wrapper.findComponent({ name: 'AtlasTextField' })
      await field.vm.$emit('update:modelValue', null)

      expect(wrapper.vm.searchInput).toBe('')
      expect(wrapper.vm.filters.searchQuery).toBe('')
    })
  })

  describe('Create Action', () => {
    it('creates a new incidence rate and navigates to it', async () => {
      wrapper = mountView()
      const store = useIncidenceRateStore()

      await wrapper.find('[data-testid="incidence-rates-create"]').trigger('click')

      expect(store.currentIR?.name).toBe('')
      expect(mockPush).toHaveBeenCalledWith('/incidence-rates/new')
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
      const button = wrapper.find('[data-testid="incidence-rates-create"]')
      expect(button.attributes('disabled')).toBeDefined()
    })
  })

  describe('Row Open', () => {
    it('navigates to the incidence rate detail page when the row name is clicked', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [mkIR(7)] })
      wrapper = mountView()
      await flushPromises()

      await wrapper.find('[data-testid="incidence-rates-table-row-name"]').trigger('click')

      expect(mockPush).toHaveBeenCalledWith('/incidence-rates/7')
    })

    it('does not navigate when the incidence rate has no id', () => {
      wrapper = mountView()
      wrapper.vm.handleOpen({} as IncidenceRate)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Copy Action', () => {
    it('copies the incidence rate and navigates to the new copy on success', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [mkIR(1)] })
      vi.mocked(copyIncidenceRate).mockResolvedValue({ success: true, data: mkIR(99) })
      wrapper = mountView()
      await flushPromises()
      const notifications = useNotifications()

      const copyButton = wrapper.find('button[aria-label="Copy"]')
      await copyButton.trigger('click')
      await flushPromises()

      expect(copyIncidenceRate).toHaveBeenCalledWith(1)
      expect(mockPush).toHaveBeenCalledWith('/incidence-rates/99')
      expect(notifications.items.at(-1)).toMatchObject({ severity: 'success', title: 'Incidence rate copied' })
    })

    it('shows an error and logs when the copy fails', async () => {
      vi.mocked(copyIncidenceRate).mockResolvedValue({
        success: false,
        error: new ApiError('copy failed', 0, null),
      })
      wrapper = mountView()
      const notifications = useNotifications()

      await wrapper.vm.handleCopy(mkIR(1))

      expect(notifications.items.at(-1)).toMatchObject({ severity: 'danger', title: 'Copy failed' })
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('does nothing when the incidence rate has no id', async () => {
      wrapper = mountView()
      await wrapper.vm.handleCopy({} as IncidenceRate)
      expect(copyIncidenceRate).not.toHaveBeenCalled()
    })
  })

  describe('Delete Flow', () => {
    it('opens the confirmation dialog with the target id', async () => {
      wrapper = mountView()
      const ir = mkIR(5)

      wrapper.vm.handleRemove(ir)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDelete).toBe(true)
      expect(wrapper.vm.deleteTarget).toBe(5)
    })

    it('ignores removal requests for incidence rates without an id', () => {
      wrapper = mountView()
      wrapper.vm.handleRemove({} as IncidenceRate)
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

    it('deletes the incidence rate, refreshes the list, and shows success feedback', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [mkIR(5)] })
      vi.mocked(deleteIncidenceRate).mockResolvedValue(true)
      wrapper = mountView()
      await flushPromises()
      const notifications = useNotifications()

      wrapper.vm.deleteTarget = 5
      wrapper.vm.showDelete = true
      await wrapper.vm.confirmDelete()

      expect(deleteIncidenceRate).toHaveBeenCalledWith(5)
      expect(listIncidenceRates).toHaveBeenCalledTimes(2)
      expect(notifications.items.at(-1)).toMatchObject({ severity: 'success', title: 'Incidence rate deleted' })
      expect(wrapper.vm.showDelete).toBe(false)
      expect(wrapper.vm.deleteTarget).toBeNull()
    })

    it('shows error feedback when delete fails', async () => {
      vi.mocked(deleteIncidenceRate).mockResolvedValue(false)
      wrapper = mountView()
      const notifications = useNotifications()

      wrapper.vm.deleteTarget = 5
      wrapper.vm.showDelete = true
      await wrapper.vm.confirmDelete()

      expect(notifications.items.at(-1)).toMatchObject({ severity: 'danger', title: 'Delete failed' })
    })

    it('does nothing when there is no delete target', async () => {
      wrapper = mountView()
      await wrapper.vm.confirmDelete()
      expect(deleteIncidenceRate).not.toHaveBeenCalled()
    })
  })

  describe('Pagination', () => {
    it('renders pagination controls and paginates across pages', async () => {
      const data = Array.from({ length: 30 }, (_, i) => mkIR(i + 1))
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data })
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
      const data = Array.from({ length: 30 }, (_, i) => mkIR(i + 1))
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data })
      wrapper = mountView()
      await flushPromises()

      wrapper.vm.updatePage(-5)
      expect(wrapper.vm.page).toBe(0)

      wrapper.vm.updatePage(50)
      expect(wrapper.vm.page).toBe(1)
    })

    it('does not render pagination controls for a single page', async () => {
      vi.mocked(listIncidenceRates).mockResolvedValue({ success: true, data: [mkIR(1)] })
      wrapper = mountView()
      await flushPromises()

      expect(wrapper.text()).not.toContain('1 / 1')
    })
  })
})
