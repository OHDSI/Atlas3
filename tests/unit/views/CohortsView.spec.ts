/**
 * Component Tests: CohortsView
 *
 * Tests for the main cohorts listing view component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

// Mock vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn()
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn()
}))

// Mock useCohorts composable
vi.mock('@/composables/useCohorts', () => ({
  useCohorts: vi.fn()
}))

// Mock usePagination composable
vi.mock('@/composables/usePagination', () => ({
  usePagination: vi.fn()
}))

// Mock webapi services
vi.mock('@/services/cohort-definition.service', () => ({
  deleteCohort: vi.fn(),
  getCohortDefinition: vi.fn(),
  getCohortPrintFriendly: vi.fn(),
  saveCohortDefinition: vi.fn()
}))

import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { logger } from '@/utils/logger'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

// usePermissions reads from the auth store (not initialised here); mock as
// a permissive admin so CohortsView's gated buttons stay visible in the tests.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    cacheHitRate: ref(0),
    clearCache: vi.fn(),
  }),
}))

// Mock child components
vi.mock('@/components/cohort/CohortGrid.vue', () => ({
  default: {
    name: 'CohortGrid',
    template: '<div class="cohort-grid-mock"></div>',
    props: ['cohorts', 'loading', 'error', 'searchQuery', 'selectedTags', 'canCopy', 'copyingId']
  }
}))

vi.mock('@/components/cohort/CohortTable.vue', () => ({
  default: {
    name: 'CohortTable',
    template: '<div class="cohort-table-mock"></div>',
    props: ['cohorts', 'loading', 'error', 'searchQuery', 'selectedTags', 'canCopy', 'copyingId']
  }
}))

vi.mock('@/components/cohort/CohortPagination.vue', () => ({
  default: {
    name: 'CohortPagination',
    template: '<div class="cohort-pagination-mock"></div>',
    props: ['page', 'itemsPerPage', 'itemsPerPageOptions', 'totalItems', 'canGoPrevious', 'canGoNext', 'rangeDisplay']
  }
}))

vi.mock('@/components/cohort/CohortFilters.vue', () => ({
  default: {
    name: 'CohortFilters',
    template: '<div class="cohort-filters-mock"><slot name="actions" /></div>',
    props: ['filters', 'availableTags', 'availableAuthors', 'activeFilterCount']
  }
}))

// Import after mocks are set up
import CohortsView from '@/views/CohortsView.vue'

// Now we can import the mocked modules to access their mocks
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { deleteCohort, getCohortDefinition, getCohortPrintFriendly, saveCohortDefinition } from '@/services/cohort-definition.service'

// Create mock implementations
const mockPush = vi.fn()
const mockFetchCohorts = vi.fn()
const mockClearFilters = vi.fn()
const mockCohorts = ref<CohortDefinitionSummary[]>([])
const mockLoading = ref(false)
const mockFiltering = ref(false)
const mockError = ref<Error | null>(null)
const mockSearchQuery = ref('')
const mockFilters = ref({
  searchQuery: '',
  selectedTags: [] as string[],
  author: '',
  createdDateRange: {},
  modifiedDateRange: {}
})
const mockFilteredCohorts = ref<CohortDefinitionSummary[]>([])
const mockAvailableTags = ref<string[]>([])
const mockAvailableAuthors = ref<string[]>([])
const mockActiveFilterCount = ref(0)
const mockPage = ref(1)
const mockItemsPerPage = ref(60)
const mockNextPage = vi.fn()
const mockPreviousPage = vi.fn()
const mockSetItemsPerPage = vi.fn()

// Setup mock implementations
vi.mocked(useRouter).mockReturnValue({
  push: mockPush
} as any)

vi.mocked(useRoute).mockReturnValue({
  query: {}
} as any)

vi.mocked(useI18n).mockReturnValue({
  t: (key: string, fallback?: string) => ref(fallback || key),
  locale: ref('en-US')
} as any)

vi.mocked(useCohorts).mockReturnValue({
  cohorts: mockCohorts,
  loading: mockLoading,
  filtering: mockFiltering,
  error: mockError,
  searchQuery: mockSearchQuery,
  filters: mockFilters,
  filteredCohorts: mockFilteredCohorts,
  availableTags: mockAvailableTags,
  availableAuthors: mockAvailableAuthors,
  activeFilterCount: mockActiveFilterCount,
  fetchCohorts: mockFetchCohorts,
  clearFilters: mockClearFilters
} as any)

vi.mocked(usePagination).mockReturnValue({
  page: mockPage,
  itemsPerPage: mockItemsPerPage,
  itemsPerPageOptions: [60, 120, 240],
  canGoPrevious: ref(false),
  canGoNext: ref(true),
  rangeDisplay: ref('1-60 of 100'),
  nextPage: mockNextPage,
  previousPage: mockPreviousPage,
  setItemsPerPage: mockSetItemsPerPage
} as any)

const vuetify = createVuetify({ components, directives })

// Sample test data
const createMockCohort = (id: number, overrides?: Partial<CohortDefinitionSummary>): CohortDefinitionSummary => ({
  id,
  name: `Test Cohort ${id}`,
  description: `Description for cohort ${id}`,
  createdBy: 'test-user',
  createdDate: Date.now(),
  modifiedBy: 'test-user',
  modifiedDate: Date.now(),
  hasWriteAccess: true,
  hasReadAccess: true,
  tags: [],
  ...overrides
})

describe('CohortsView.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockPush.mockClear()
    mockFetchCohorts.mockClear()
    mockClearFilters.mockClear()
    vi.mocked(deleteCohort).mockClear()
    vi.mocked(getCohortDefinition).mockClear()
    vi.mocked(getCohortPrintFriendly).mockClear()
    vi.mocked(saveCohortDefinition).mockClear()

    // Reset ref values
    mockCohorts.value = []
    mockFilteredCohorts.value = []
    mockLoading.value = false
    mockFiltering.value = false
    mockError.value = null
    mockSearchQuery.value = ''
    mockFilters.value = {
      searchQuery: '',
      selectedTags: [],
      author: '',
      createdDateRange: {},
      modifiedDateRange: {}
    }
    mockAvailableTags.value = []
    mockAvailableAuthors.value = []
    mockActiveFilterCount.value = 0
    mockPage.value = 1
    mockItemsPerPage.value = 60
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should call fetchCohorts on mount', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(mockFetchCohorts).toHaveBeenCalledTimes(1)
    })

    it('should render page wrapper and card', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.find('.page-wrapper').exists()).toBe(true)
      expect(wrapper.find('.page-card').exists()).toBe(true)
    })
  })

  describe('Action Buttons', () => {
    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should render "New cohort" button', () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      // Refresh: button label switched to sentence case ("New cohort")
      // to match the rest of the modernised UI.
      const newCohortButton = buttons.find(btn => btn.text().toLowerCase().includes('new cohort'))

      expect(newCohortButton).toBeDefined()
    })

    it('should render "Import" button', () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const importButton = buttons.find(btn => btn.text().includes('Import'))

      expect(importButton).toBeDefined()
    })

    it('should open new cohort dialog when "New cohort" clicked', async () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const newCohortButton = buttons.find(btn => btn.text().toLowerCase().includes('new cohort'))

      await newCohortButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showNewCohortDialog).toBe(true)
    })

    it('should navigate to /cohorts/new with name when dialog confirmed', async () => {
      wrapper.vm.newCohortName = 'Test Cohort'
      wrapper.vm.confirmCreateCohort()

      expect(mockPush).toHaveBeenCalledWith({ path: '/cohorts/new', query: { name: 'Test Cohort' } })
    })

    it('should open import dialog when "Import" clicked', async () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const importButton = buttons.find(btn => btn.text().includes('Import'))

      await importButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showImportDialog).toBe(true)
    })
  })

  describe('Child Components', () => {
    beforeEach(() => {
      mockFilteredCohorts.value = [
        createMockCohort(1),
        createMockCohort(2),
        createMockCohort(3)
      ]
    })

    it('should render CohortFilters component', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const filters = wrapper.findComponent({ name: 'CohortFilters' })
      expect(filters.exists()).toBe(true)
    })

    it('should render CohortTable component (default view mode is table)', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      // Default view mode is now table, so CohortTable is the active view component.
      const table = wrapper.findComponent({ name: 'CohortTable' })
      expect(table.exists()).toBe(true)
    })

    it('should render CohortPagination when cohorts exist', () => {
      mockLoading.value = false
      mockError.value = null

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const pagination = wrapper.findComponent({ name: 'CohortPagination' })
      expect(pagination.exists()).toBe(true)
    })

    it('should pass correct props to the active view component', () => {
      mockLoading.value = true

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      // Default view mode is table; verify props are forwarded to CohortTable.
      const table = wrapper.findComponent({ name: 'CohortTable' })
      expect(table.props('loading')).toBe(true)
      expect(table.props('cohorts')).toBeDefined()
    })
  })

  describe('Filtering Indicator', () => {
    it('should show filtering indicator when filtering is true', async () => {
      mockFiltering.value = true
      mockCohorts.value = Array.from({ length: 100 }, (_, i) => createMockCohort(i))

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
      await wrapper.vm.$nextTick()

      const filteringDiv = wrapper.find('.cohorts-view__filtering')
      expect(filteringDiv.exists()).toBe(true)
    })

    it('should not show filtering indicator when filtering is false', () => {
      mockFiltering.value = false

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const filteringDiv = wrapper.find('.cohorts-view__filtering')
      expect(filteringDiv.exists()).toBe(false)
    })

    it('should show progress bar when filtering', async () => {
      mockFiltering.value = true
      mockCohorts.value = [createMockCohort(1)]

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
      await wrapper.vm.$nextTick()

      const progressBar = wrapper.findComponent({ name: 'VProgressLinear' })
      expect(progressBar.exists()).toBe(true)
    })
  })

  describe('Import Dialog', () => {
    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should render import dialog', () => {
      const dialogs = wrapper.findAllComponents({ name: 'VDialog' })
      expect(dialogs.length).toBeGreaterThan(0)
    })

    it('should show import dialog when showImportDialog is true', async () => {
      wrapper.vm.showImportDialog = true
      await wrapper.vm.$nextTick()

      const dialogs = wrapper.findAllComponents({ name: 'VDialog' })
      const importDialog = dialogs.find(d => d.props('modelValue') === true)
      expect(importDialog).toBeDefined()
    })

    it('should close import dialog when cancel clicked', async () => {
      // Refresh: import dialog now actually imports a JSON expression
      // — the placeholder "Close" button was replaced with Cancel
      // (and a primary Import button).
      wrapper.vm.showImportDialog = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelButton = buttons.find(btn => btn.text().includes('Cancel'))

      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showImportDialog).toBe(false)
    })
  })

  describe('Delete Dialog', () => {
    const mockCohort = createMockCohort(1, { name: 'Test Delete Cohort' })

    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should open delete dialog when handleDeleteClick is called', async () => {
      await wrapper.vm.handleDeleteClick(mockCohort)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDeleteDialog).toBe(true)
      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
    })

    it('should close delete dialog on cancel', async () => {
      wrapper.vm.showDeleteDialog = true
      wrapper.vm.selectedCohort = mockCohort
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelButton = buttons.find(btn => btn.text().includes('Cancel'))

      await cancelButton?.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDeleteDialog).toBe(false)
    })

    it('should call deleteCohort service on confirm', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(success(undefined))
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()

      await wrapper.vm.confirmDelete()

      expect(deleteCohort).toHaveBeenCalledWith(mockCohort.id)
    })

    it('should refresh cohorts after successful delete', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(success(undefined))
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()

      await wrapper.vm.confirmDelete()

      expect(mockFetchCohorts).toHaveBeenCalled()
    })

    it('should close dialog after successful delete', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(success(undefined))
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true

      await wrapper.vm.confirmDelete()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showDeleteDialog).toBe(false)
      expect(wrapper.vm.selectedCohort).toBeNull()
    })

    it('should show loading state while deleting', async () => {
      vi.mocked(deleteCohort).mockImplementation(() => new Promise(() => {})) // Never resolves
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()

      const _deletePromise = wrapper.vm.confirmDelete()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.deleting).toBe(true)
    })

    it('does not close the dialog or refetch when deleteCohort reports a failure ApiResult', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(failure(new ApiError('Delete failed', 409, null)))
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()
      mockFetchCohorts.mockClear() // clear the call from mount

      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.deleting).toBe(false)
      // A failed delete must not read as a successful one: the dialog stays
      // open, the selection is kept, and the list is not refetched (which
      // would otherwise silently imply the cohort is gone).
      expect(wrapper.vm.showDeleteDialog).toBe(true)
      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
      expect(mockFetchCohorts).not.toHaveBeenCalled()
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        'CohortsView',
        'Failed to delete cohort',
        expect.objectContaining({ message: 'Delete failed' })
      )
    })

    it('handles a thrown/rejected deleteCohort gracefully (defense in depth)', async () => {
      const error = new Error('network down')
      vi.mocked(deleteCohort).mockRejectedValue(error)
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()
      mockFetchCohorts.mockClear() // clear the call from mount

      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.deleting).toBe(false)
      expect(wrapper.vm.showDeleteDialog).toBe(true)
      expect(mockFetchCohorts).not.toHaveBeenCalled()
    })
  })

  describe('Copy Cohort (discussion #124)', () => {
    const mockCohort = createMockCohort(1, { name: 'Diabetes Cohort' })
    const mockExpressionObj = {
      ConceptSets: [{ id: 0, name: 'Diabetes' }],
      PrimaryCriteria: { CriteriaList: [], ObservationWindow: { PriorDays: 0, PostDays: 0 }, PrimaryCriteriaLimit: { Type: 'First' } }
    }
    const mockDefinition = {
      id: 1,
      name: 'Diabetes Cohort',
      description: 'Original description',
      createdBy: 'someone',
      createdDate: 1700000000000,
      modifiedBy: 'someone',
      modifiedDate: 1700000000000,
      tags: [{ id: 1, name: 'chronic' }],
      expression: mockExpressionObj,
      expressionType: 'SIMPLE_EXPRESSION',
    }

    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('fetches the full definition and saves a copy with a "(copy)" name', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockDefinition as any))
      vi.mocked(saveCohortDefinition).mockResolvedValue(success({ id: 99, name: 'Diabetes Cohort (copy)' } as any))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(getCohortDefinition).toHaveBeenCalledWith(mockCohort.id)
      expect(saveCohortDefinition).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Diabetes Cohort (copy)',
          description: 'Original description',
          expressionType: 'SIMPLE_EXPRESSION',
        })
      )
      // The expression must be the parsed object from definition.expression
      const savedPayload = vi.mocked(saveCohortDefinition).mock.calls[0]![0] as any
      expect(savedPayload.expression).toEqual(mockExpressionObj)
    })

    it('navigates to the new cohort and refreshes the list on success', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockDefinition as any))
      vi.mocked(saveCohortDefinition).mockResolvedValue(success({ id: 99, name: 'Diabetes Cohort (copy)' } as any))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(mockFetchCohorts).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/cohorts/99')
    })

    it('avoids name collisions by numbering repeat copies', async () => {
      mockCohorts.value = [
        mockCohort,
        createMockCohort(2, { name: 'Diabetes Cohort (copy)' }),
      ]
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockDefinition as any))
      vi.mocked(saveCohortDefinition).mockResolvedValue(success({ id: 99, name: 'Diabetes Cohort (copy 2)' } as any))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(saveCohortDefinition).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Diabetes Cohort (copy 2)' })
      )
    })

    it('tracks copyingId while the copy is in flight and clears it after', async () => {
      let resolveFetch: (value: unknown) => void = () => {}
      vi.mocked(getCohortDefinition).mockImplementation(
        () => new Promise(resolve => { resolveFetch = resolve })
      )
      vi.mocked(saveCohortDefinition).mockResolvedValue(success({ id: 99, name: 'copy' } as any))

      const copyPromise = wrapper.vm.handleCopyClick(mockCohort)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.copyingId).toBe(mockCohort.id)

      resolveFetch(success(mockDefinition))
      await copyPromise

      expect(wrapper.vm.copyingId).toBeNull()
    })

    it('does not call saveCohortDefinition when the definition fails to load', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(failure(new ApiError('not found', 404, null)))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(saveCohortDefinition).not.toHaveBeenCalled()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('does not navigate when the save fails', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockDefinition as any))
      vi.mocked(saveCohortDefinition).mockResolvedValue(failure(new ApiError('save failed', 500, null)))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('handles a thrown error gracefully and clears copyingId', async () => {
      vi.mocked(getCohortDefinition).mockRejectedValue(new Error('network down'))

      await wrapper.vm.handleCopyClick(mockCohort)

      expect(wrapper.vm.copyingId).toBeNull()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  // The "Generation Panel" group was removed: the cohort overview no
  // longer hosts the Generate flow. Running a cohort happens from the
  // cohort builder page instead, so handleGenerate / showGenerationPanel
  // / GenerationPanel are gone from CohortsView.

  describe('Cohort Info Dialog', () => {
    const mockCohort = createMockCohort(1)
    const mockAtlasDefinition = {
      id: 1,
      name: 'Test',
      expression: { ConceptSets: [], PrimaryCriteria: { CriteriaList: [] } },
    }
    const mockHtml = '<h1>Test Cohort Info</h1>'

    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should open cohort info dialog when handleShowInfo is called', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockAtlasDefinition as any))
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(success(mockHtml))

      await wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showCohortInfoDialog).toBe(true)
      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
    })

    it('should show loading state while fetching cohort info', async () => {
      vi.mocked(getCohortDefinition).mockImplementation(() => new Promise(() => {})) // Never resolves

      const _infoPromise = wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.loadingCohortInfo).toBe(true)
    })

    it('should fetch and display cohort print-friendly HTML', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockAtlasDefinition as any))
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(success(mockHtml))

      await wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      expect(getCohortDefinition).toHaveBeenCalledWith(mockCohort.id)
      expect(getCohortPrintFriendly).toHaveBeenCalledWith(mockAtlasDefinition.expression)
      expect(wrapper.vm.cohortInfoHtml).toBe(mockHtml)
      expect(wrapper.vm.loadingCohortInfo).toBe(false)
    })

    it('should handle errors when fetching cohort info', async () => {
      const error = new Error('Failed to fetch')
      vi.mocked(getCohortDefinition).mockRejectedValue(error)

      await wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.cohortInfoHtml).toBeNull()
      expect(wrapper.vm.loadingCohortInfo).toBe(false)
    })

    it('should close cohort info dialog when close button clicked', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(success(mockAtlasDefinition as any))
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(success(mockHtml))

      await wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      wrapper.vm.showCohortInfoDialog = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showCohortInfoDialog).toBe(false)
    })
  })

  describe('Tag Filtering', () => {
    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should add tag to filters when not selected', async () => {
      mockFilters.value.selectedTags = []

      await wrapper.vm.handleTagClick('Diabetes')

      expect(mockFilters.value.selectedTags).toContain('Diabetes')
    })

    it('should remove tag from filters when already selected', async () => {
      mockFilters.value.selectedTags = ['Diabetes', 'Hypertension']

      await wrapper.vm.handleTagClick('Diabetes')

      expect(mockFilters.value.selectedTags).not.toContain('Diabetes')
      expect(mockFilters.value.selectedTags).toContain('Hypertension')
    })

    it('should toggle tag selection multiple times', async () => {
      mockFilters.value.selectedTags = []

      // Add
      await wrapper.vm.handleTagClick('Diabetes')
      expect(mockFilters.value.selectedTags).toContain('Diabetes')

      // Remove
      await wrapper.vm.handleTagClick('Diabetes')
      expect(mockFilters.value.selectedTags).not.toContain('Diabetes')

      // Add again
      await wrapper.vm.handleTagClick('Diabetes')
      expect(mockFilters.value.selectedTags).toContain('Diabetes')
    })
  })

  describe('Pagination', () => {
    beforeEach(() => {
      // Create more cohorts than fit on one page
      mockFilteredCohorts.value = Array.from({ length: 150 }, (_, i) => createMockCohort(i))
      mockItemsPerPage.value = 60
    })

    it('should compute paginated cohorts correctly', () => {
      mockPage.value = 1

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const paginated = wrapper.vm.paginatedCohorts
      expect(paginated).toHaveLength(60)
      expect(paginated[0].id).toBe(0)
      expect(paginated[59].id).toBe(59)
    })

    it('should compute second page correctly', () => {
      mockPage.value = 2

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const paginated = wrapper.vm.paginatedCohorts
      expect(paginated).toHaveLength(60)
      expect(paginated[0].id).toBe(60)
      expect(paginated[59].id).toBe(119)
    })

    it('should compute last page with remaining items', () => {
      mockPage.value = 3

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const paginated = wrapper.vm.paginatedCohorts
      expect(paginated).toHaveLength(30) // Only 30 items remain
      expect(paginated[0].id).toBe(120)
      expect(paginated[29].id).toBe(149)
    })

    it('should handle empty cohorts list', () => {
      mockFilteredCohorts.value = []
      mockPage.value = 1

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const paginated = wrapper.vm.paginatedCohorts
      expect(paginated).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should pass error to CohortTable when error exists', () => {
      const testError = new Error('Failed to fetch cohorts')
      mockError.value = testError

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      // Default view is table; verify error prop forwarded to CohortTable.
      const table = wrapper.findComponent({ name: 'CohortTable' })
      expect(table.props('error')).toEqual(testError)
    })

    it('should allow retry when error occurs', async () => {
      mockError.value = new Error('Failed to fetch')

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'CohortTable' })
      await table.vm.$emit('retry')

      expect(mockFetchCohorts).toHaveBeenCalled()
    })
  })

  describe('User Interactions', () => {
    beforeEach(() => {
      mockFilteredCohorts.value = [createMockCohort(1), createMockCohort(2)]
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should handle create cohort action from table', async () => {
      // Default view is table; events are wired to CohortTable.
      const table = wrapper.findComponent({ name: 'CohortTable' })
      await table.vm.$emit('create-cohort')

      expect(wrapper.vm.showNewCohortDialog).toBe(true)
    })

    it('should clear filters when table emits clear-filters', async () => {
      const table = wrapper.findComponent({ name: 'CohortTable' })

      await table.vm.$emit('clear-filters')

      expect(mockClearFilters).toHaveBeenCalled()
    })

    it('should handle delete action from table', async () => {
      const mockCohort = createMockCohort(1)
      const table = wrapper.findComponent({ name: 'CohortTable' })

      await table.vm.$emit('delete', mockCohort)

      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
      expect(wrapper.vm.showDeleteDialog).toBe(true)
    })

    it('should handle tag click from table', async () => {
      const table = wrapper.findComponent({ name: 'CohortTable' })

      await table.vm.$emit('tag-click', 'Diabetes')

      expect(mockFilters.value.selectedTags).toContain('Diabetes')
    })

    it('should handle show info action from table', async () => {
      const mockCohort = createMockCohort(1)
      vi.mocked(getCohortDefinition).mockResolvedValue(success({ id: 1 } as any))
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(success('<h1>Info</h1>'))

      const table = wrapper.findComponent({ name: 'CohortTable' })
      await table.vm.$emit('show-info', mockCohort)

      expect(wrapper.vm.showCohortInfoDialog).toBe(true)
    })
  })

  describe('Component State', () => {
    it('should maintain separate state for dialogs', async () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.vm.showImportDialog).toBe(false)
      expect(wrapper.vm.showDeleteDialog).toBe(false)
      // showGenerationPanel removed — Generate flow lives on the
      // cohort builder page now.
      expect(wrapper.vm.showCohortInfoDialog).toBe(false)
    })

    it('should track deleting state', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.vm.deleting).toBe(false)
    })

    it('should track selected cohort', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.vm.selectedCohort).toBeNull()
    })

    it('should track cohort info loading state', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.vm.loadingCohortInfo).toBe(false)
      expect(wrapper.vm.cohortInfoHtml).toBeNull()
    })
  })
})
