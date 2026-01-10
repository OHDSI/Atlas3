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
vi.mock('@/services/webapi', () => ({
  deleteCohort: vi.fn(),
  getCohortDefinition: vi.fn(),
  getCohortPrintFriendly: vi.fn()
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock child components
vi.mock('@/components/cohort/CohortGrid.vue', () => ({
  default: {
    name: 'CohortGrid',
    template: '<div class="cohort-grid-mock"></div>',
    props: ['cohorts', 'loading', 'error', 'searchQuery', 'selectedTags']
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
    template: '<div class="cohort-filters-mock"></div>',
    props: ['filters', 'availableTags', 'availableAuthors', 'activeFilterCount']
  }
}))

vi.mock('@/components/cohort/GenerationPanel.vue', () => ({
  default: {
    name: 'GenerationPanel',
    template: '<div class="generation-panel-mock"></div>',
    props: ['modelValue', 'cohortId']
  }
}))

// Import after mocks are set up
import CohortsView from '@/views/CohortsView.vue'

// Now we can import the mocked modules to access their mocks
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'
import { deleteCohort, getCohortDefinition, getCohortPrintFriendly } from '@/services/webapi'

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

    it('should render "New Cohort" button', () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const newCohortButton = buttons.find(btn => btn.text().includes('New Cohort'))

      expect(newCohortButton).toBeDefined()
    })

    it('should render "Import" button', () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const importButton = buttons.find(btn => btn.text().includes('Import'))

      expect(importButton).toBeDefined()
    })

    it('should open new cohort dialog when "New Cohort" clicked', async () => {
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const newCohortButton = buttons.find(btn => btn.text().includes('New Cohort'))

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

    it('should render CohortGrid component', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      expect(grid.exists()).toBe(true)
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

    it('should render GenerationPanel component', () => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const panel = wrapper.findComponent({ name: 'GenerationPanel' })
      expect(panel.exists()).toBe(true)
    })

    it('should pass correct props to CohortGrid', () => {
      mockLoading.value = true

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      expect(grid.props('loading')).toBe(true)
      expect(grid.props('cohorts')).toBeDefined()
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

    it('should close import dialog when close button clicked', async () => {
      wrapper.vm.showImportDialog = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const closeButton = buttons.find(btn => btn.text().includes('Close'))

      await closeButton?.trigger('click')
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
      vi.mocked(deleteCohort).mockResolvedValue(undefined)
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()

      await wrapper.vm.confirmDelete()

      expect(deleteCohort).toHaveBeenCalledWith(mockCohort.id)
    })

    it('should refresh cohorts after successful delete', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(undefined)
      wrapper.vm.selectedCohort = mockCohort
      wrapper.vm.showDeleteDialog = true
      await wrapper.vm.$nextTick()

      await wrapper.vm.confirmDelete()

      expect(mockFetchCohorts).toHaveBeenCalled()
    })

    it('should close dialog after successful delete', async () => {
      vi.mocked(deleteCohort).mockResolvedValue(undefined)
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

    it('should handle delete errors gracefully', async () => {
      const error = new Error('Delete failed')
      vi.mocked(deleteCohort).mockRejectedValue(error)
      wrapper.vm.selectedCohort = mockCohort

      await wrapper.vm.confirmDelete()

      expect(wrapper.vm.deleting).toBe(false)
    })
  })

  describe('Generation Panel', () => {
    const mockCohort = createMockCohort(1)

    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should open generation panel when handleGenerate is called', async () => {
      await wrapper.vm.handleGenerate(mockCohort)
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showGenerationPanel).toBe(true)
      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
    })

    it('should pass cohort ID to GenerationPanel', async () => {
      await wrapper.vm.handleGenerate(mockCohort)
      await wrapper.vm.$nextTick()

      const panel = wrapper.findComponent({ name: 'GenerationPanel' })
      expect(panel.props('cohortId')).toBe(mockCohort.id)
    })
  })

  describe('Cohort Info Dialog', () => {
    const mockCohort = createMockCohort(1)
    const mockAtlasDefinition = { id: 1, name: 'Test' }
    const mockHtml = '<h1>Test Cohort Info</h1>'

    beforeEach(() => {
      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })
    })

    it('should open cohort info dialog when handleShowInfo is called', async () => {
      vi.mocked(getCohortDefinition).mockResolvedValue(mockAtlasDefinition)
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(mockHtml)

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
      vi.mocked(getCohortDefinition).mockResolvedValue(mockAtlasDefinition)
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(mockHtml)

      await wrapper.vm.handleShowInfo(mockCohort)
      await wrapper.vm.$nextTick()

      expect(getCohortDefinition).toHaveBeenCalledWith(mockCohort.id)
      expect(getCohortPrintFriendly).toHaveBeenCalledWith(mockAtlasDefinition)
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
      vi.mocked(getCohortDefinition).mockResolvedValue(mockAtlasDefinition)
      vi.mocked(getCohortPrintFriendly).mockResolvedValue(mockHtml)

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
    it('should pass error to CohortGrid when error exists', () => {
      const testError = new Error('Failed to fetch cohorts')
      mockError.value = testError

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      expect(grid.props('error')).toEqual(testError)
    })

    it('should allow retry when error occurs', async () => {
      mockError.value = new Error('Failed to fetch')

      wrapper = mount(CohortsView, {
        global: {
          plugins: [vuetify]
        }
      })

      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      await grid.vm.$emit('retry')

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

    it('should handle create cohort action from grid', async () => {
      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      await grid.vm.$emit('create-cohort')

      expect(wrapper.vm.showNewCohortDialog).toBe(true)
    })

    it('should handle generate action from grid', async () => {
      const mockCohort = createMockCohort(1)
      const grid = wrapper.findComponent({ name: 'CohortGrid' })

      await grid.vm.$emit('generate', mockCohort)

      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
      expect(wrapper.vm.showGenerationPanel).toBe(true)
    })

    it('should handle delete action from grid', async () => {
      const mockCohort = createMockCohort(1)
      const grid = wrapper.findComponent({ name: 'CohortGrid' })

      await grid.vm.$emit('delete', mockCohort)

      expect(wrapper.vm.selectedCohort).toEqual(mockCohort)
      expect(wrapper.vm.showDeleteDialog).toBe(true)
    })

    it('should handle tag click from grid', async () => {
      const grid = wrapper.findComponent({ name: 'CohortGrid' })

      await grid.vm.$emit('tag-click', 'Diabetes')

      expect(mockFilters.value.selectedTags).toContain('Diabetes')
    })

    it('should handle show info action from grid', async () => {
      const mockCohort = createMockCohort(1)
      vi.mocked(getCohortDefinition).mockResolvedValue({ id: 1 } as any)
      vi.mocked(getCohortPrintFriendly).mockResolvedValue('<h1>Info</h1>')

      const grid = wrapper.findComponent({ name: 'CohortGrid' })
      await grid.vm.$emit('show-info', mockCohort)

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
      expect(wrapper.vm.showGenerationPanel).toBe(false)
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
