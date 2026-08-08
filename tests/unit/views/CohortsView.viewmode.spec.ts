/**
 * Component Tests: CohortsView – view mode default
 *
 * Verifies that the cohort overview defaults to the table view and that
 * a previously persisted tile choice is honoured.
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
  getCohortPrintFriendly: vi.fn()
}))

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
    props: ['cohorts', 'loading', 'error', 'searchQuery', 'selectedTags']
  }
}))

vi.mock('@/components/cohort/CohortTable.vue', () => ({
  default: {
    name: 'CohortTable',
    template: '<div class="cohort-table-mock"></div>',
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
    template: '<div class="cohort-filters-mock"><slot name="actions" /></div>',
    props: ['filters', 'availableTags', 'availableAuthors', 'activeFilterCount']
  }
}))

// Import after mocks are set up
import CohortsView from '@/views/CohortsView.vue'

import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useCohorts } from '@/composables/useCohorts'
import { usePagination } from '@/composables/usePagination'

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

const mountOptions = {
  global: {
    plugins: [vuetify]
  }
}

// On Node 26, `localStorage` is undefined even in jsdom unless
// --localstorage-file is supplied.  We install a minimal in-memory
// localStorage shim on `globalThis` so the component's
// `typeof localStorage !== 'undefined'` guard works and the
// persistence path can be exercised.
type StorageLike = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

function makeStorageShim(): StorageLike {
  const store: Record<string, string> = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = v },
    removeItem: (k) => { delete store[k] },
  }
}

describe('CohortsView default view mode', () => {
  let wrapper: VueWrapper
  let storageShim: StorageLike

  beforeEach(() => {
    vi.clearAllMocks()
    // Install a fresh shim so each test starts with empty storage.
    storageShim = makeStorageShim()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any).localStorage = storageShim
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    // Restore to whatever it was (undefined on Node 26).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).localStorage
  })

  it('defaults to table when nothing is persisted', () => {
    wrapper = mount(CohortsView, mountOptions)

    // Assert via rendered component presence: CohortTable should be visible.
    expect(wrapper.findComponent({ name: 'CohortTable' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CohortGrid' }).exists()).toBe(false)
  })

  it('honors a persisted tile choice', () => {
    storageShim.setItem('cohorts-view-mode', 'tile')
    wrapper = mount(CohortsView, mountOptions)

    expect(wrapper.findComponent({ name: 'CohortGrid' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CohortTable' }).exists()).toBe(false)
  })
})
