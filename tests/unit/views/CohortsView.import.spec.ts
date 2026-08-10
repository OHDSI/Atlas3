/**
 * Component Tests: CohortsView cohort JSON import flow
 *
 * `confirmImport` parses JSON, validates shape, saves, navigates and
 * handles four distinct failure paths. This file exercises those paths
 * directly (as opposed to CohortsView.spec.ts's "Import Dialog" describe
 * block, which only checks that the dialog opens and closes).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
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

import { ApiError } from '@/services/api-error'

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
import { saveCohortDefinition } from '@/services/cohort-definition.service'

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

describe('CohortsView cohort import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('rejects malformed JSON with an invalid-JSON message and does not save', async () => {
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{ not json'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Expression JSON is not valid JSON.')
    expect(saveCohortDefinition).not.toHaveBeenCalled()
  })

  it('rejects a JSON scalar with a shape message and does not save', async () => {
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '42'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Expression must be a JSON object.')
    expect(saveCohortDefinition).not.toHaveBeenCalled()
  })

  it('rejects JSON null with a shape message and does not save', async () => {
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = 'null'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Expression must be a JSON object.')
    expect(saveCohortDefinition).not.toHaveBeenCalled()
  })

  it('saves a valid object with the trimmed name and SIMPLE_EXPRESSION type', async () => {
    vi.mocked(saveCohortDefinition).mockResolvedValue({
      success: true,
      data: { id: 77, name: 'My Cohort' },
    })
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = '  My Cohort  '
    wrapper.vm.importJson = '{"ConceptSets":[],"PrimaryCriteria":{"CriteriaList":[]}}'

    await wrapper.vm.confirmImport()

    expect(saveCohortDefinition).toHaveBeenCalledWith({
      name: 'My Cohort',
      expressionType: 'SIMPLE_EXPRESSION',
      expression: { ConceptSets: [], PrimaryCriteria: { CriteriaList: [] } },
    })
    expect(wrapper.vm.importError).toBeNull()
  })

  it('navigates to the new cohort and refreshes the list on success', async () => {
    vi.mocked(saveCohortDefinition).mockResolvedValue({
      success: true,
      data: { id: 77, name: 'My Cohort' },
    })
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.handleImportCohort()
    expect(wrapper.vm.showImportDialog).toBe(true)
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{"ConceptSets":[]}'

    await wrapper.vm.confirmImport()

    expect(mockFetchCohorts).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith('/cohorts/77')
    expect(wrapper.vm.showImportDialog).toBe(false)
  })

  it('reports failure and stays on the dialog when the save returns an error result', async () => {
    vi.mocked(saveCohortDefinition).mockResolvedValue({
      success: false,
      error: new ApiError('boom', 500, null),
    })
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.handleImportCohort()
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{"ConceptSets":[]}'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Import failed. Check the JSON and try again.')
    expect(wrapper.vm.showImportDialog).toBe(true)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('reports failure when the save resolves without an id', async () => {
    vi.mocked(saveCohortDefinition).mockResolvedValue({
      success: true,
      data: { name: 'My Cohort' },
    })
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{"ConceptSets":[]}'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Import failed. Check the JSON and try again.')
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('clears the importing flag after a thrown save', async () => {
    vi.mocked(saveCohortDefinition).mockRejectedValue(new Error('network'))
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{"ConceptSets":[]}'

    await wrapper.vm.confirmImport()

    expect(wrapper.vm.importError).toBe('Import failed. Check the JSON and try again.')
    expect(wrapper.vm.importing).toBe(false)
  })

  it('sets importing while the save is in flight and clears it after', async () => {
    let resolveSave: (value: unknown) => void = () => {}
    vi.mocked(saveCohortDefinition).mockImplementation(
      () => new Promise(resolve => { resolveSave = resolve })
    )
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })
    wrapper.vm.importName = 'My Cohort'
    wrapper.vm.importJson = '{"ConceptSets":[]}'

    const importPromise = wrapper.vm.confirmImport()
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.importing).toBe(true)

    resolveSave({ success: true, data: { id: 77, name: 'My Cohort' } })
    await importPromise

    expect(wrapper.vm.importing).toBe(false)
  })

  it('disables import until both name and JSON are non-blank', async () => {
    const wrapper = mount(CohortsView, { global: { plugins: [vuetify] } })

    wrapper.vm.importName = '   '
    wrapper.vm.importJson = '{}'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canImport).toBe(false)

    wrapper.vm.importName = 'Name'
    wrapper.vm.importJson = '   '
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canImport).toBe(false)

    wrapper.vm.importName = 'Name'
    wrapper.vm.importJson = '{}'
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.canImport).toBe(true)
  })
})
