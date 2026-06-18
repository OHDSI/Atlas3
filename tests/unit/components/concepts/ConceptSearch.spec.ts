/**
 * ConceptSearch Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import ConceptSearch from '@/components/concepts/ConceptSearch.vue'
import { useConceptSearchStore } from '@/stores/concept-search'
import { createMockConcept } from '@/../tests/helpers/mock-factories'

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback),
  }),
}))

// Mock concept search service
const mockSearchConcepts = vi.fn()
const mockGetConceptRecordCounts = vi.fn()

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: (sourceKey: string, term: string) => mockSearchConcepts(sourceKey, term),
  getConceptRecordCounts: (sourceKey: string, conceptIds: number[]) => mockGetConceptRecordCounts(sourceKey, conceptIds),
}))

// Mock webapi config
vi.mock('@/config/webapi', () => ({
  getSourceKey: () => 'SYNPUF1K',
}))

// Mock webapi store to avoid localStorage dependency (Node 26 compat)
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({
    getValidVocabularySource: () => 'SYNPUF1K',
    sources: [],
    selectedSource: null,
    vocabularySources: [],
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock ConceptTable component
vi.mock('@/components/concepts/ConceptTable.vue', () => ({
  default: {
    name: 'ConceptTable',
    template: '<div class="concept-table-mock"></div>',
    props: ['concepts', 'loading', 'loadingRecordCounts', 'totalItems', 'page', 'itemsPerPage'],
    emits: ['update:page', 'update:itemsPerPage'],
  },
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(ConceptSearch, {
    global: {
      plugins: [vuetify],
    },
    ...options,
  })
}

describe('ConceptSearch', () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useConceptSearchStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useConceptSearchStore()
    vi.clearAllMocks()
    mockSearchConcepts.mockResolvedValue({ concepts: [] })
    mockGetConceptRecordCounts.mockResolvedValue(new Map())
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render the concept search container', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.concept-search').exists()).toBe(true)
    })

    it('should render the hero search container', () => {
      wrapper = mountComponent()
      // Refresh dropped the inner v-card wrapper — the search input now
      // sits in a plain hero container directly on the page card.
      expect(wrapper.find('.concept-search__hero').exists()).toBe(true)
    })

    it('should render search input field', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
    })

    it('should render ConceptTable component', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'ConceptTable' }).exists()).toBe(true)
    })

    it('should render search hint text', () => {
      wrapper = mountComponent()
      const hint = wrapper.find('.concept-search__hint')
      expect(hint.exists()).toBe(true)
      expect(hint.text()).toMatch(/SNOMED|3 characters/)
    })
  })

  describe('Search Input Field', () => {
    it('should have a placeholder describing the action', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      // Refresh dropped the floating label in favour of an inline
      // placeholder + hint line below the input.
      expect(textField.props('placeholder')).toBeTruthy()
      expect(textField.props('placeholder')).toMatch(/Search|Enter/)
    })

    it('should have search icon', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('prependInnerIcon')).toBe('mdi-magnify')
    })

    it('should be clearable', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('clearable')).toBe(true)
    })

    it('should have outlined variant', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('variant')).toBe('outlined')
    })

    it('should have compact density (Atlas locks compact)', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('density')).toBe('compact')
    })
  })

  describe('Search Validation', () => {
    it('should show validation error for input less than 3 characters', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'ab'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.validationError).toBe('Please enter at least 3 characters')
    })

    it('should not show validation error for input with 3 or more characters', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'abc'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.validationError).toBeUndefined()
    })

    it('should not show validation error for empty input', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = ''
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.validationError).toBeUndefined()
    })

    it('should mark search as invalid when input is less than 3 characters', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'ab'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isSearchValid).toBe(false)
    })

    it('should mark search as valid when input is 3 or more characters', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isSearchValid).toBe(true)
    })
  })

  describe('Search Functionality', () => {
    it('should call search when user clicks search button with valid input', async () => {
      const mockConcept = createMockConcept({ conceptName: 'Diabetes' })
      mockSearchConcepts.mockResolvedValue({ concepts: [mockConcept] })

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.$nextTick()

      await wrapper.vm.onSearch()
      await flushPromises()

      expect(mockSearchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'diabetes')
    })

    it('should not call search when button clicked with invalid input', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'ab'
      await wrapper.vm.$nextTick()

      await wrapper.vm.onSearch()

      expect(mockSearchConcepts).not.toHaveBeenCalled()
    })

    it('should trim whitespace from search input', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = '  diabetes  '
      await wrapper.vm.$nextTick()

      await wrapper.vm.onSearch()
      await flushPromises()

      expect(mockSearchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'diabetes')
    })

    it('should clear search results when input is cleared', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.$nextTick()
      await wrapper.vm.onSearch()
      await flushPromises()

      wrapper.vm.onClear()

      expect(wrapper.vm.searchInput).toBe('')
      expect(store.concepts.length).toBe(0)
    })

    it('should fetch record counts after search completes', async () => {
      const mockConcept = createMockConcept({ conceptId: 123, conceptName: 'Diabetes' })
      mockSearchConcepts.mockResolvedValue({ concepts: [mockConcept] })
      mockGetConceptRecordCounts.mockResolvedValue(new Map([[123, { recordCount: 100 }]]))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.$nextTick()

      await wrapper.vm.onSearch()
      await flushPromises()

      expect(mockGetConceptRecordCounts).toHaveBeenCalledWith('SYNPUF1K', [123])
    })
  })

  describe('Clear Functionality', () => {
    it('should clear search when onClear is called', () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      wrapper.vm.onClear()

      expect(wrapper.vm.searchInput).toBe('')
    })

    it('should clear store state when onClear is called', async () => {
      wrapper = mountComponent()

      // Set up store with results
      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.onSearch()
      await flushPromises()

      // Clear
      wrapper.vm.onClear()

      expect(store.searchTerm).toBe('')
      expect(store.allConcepts.length).toBe(0)
    })
  })

  describe('Loading States', () => {
    it('should disable input when loading', async () => {
      let resolveSearch: (value: any) => void
      mockSearchConcepts.mockReturnValue(new Promise(resolve => { resolveSearch = resolve }))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('disabled')).toBe(true)

      resolveSearch!({ concepts: [] })
      await flushPromises()
    })

    it('should show loading state on search button', async () => {
      let resolveSearch: (value: any) => void
      mockSearchConcepts.mockReturnValue(new Promise(resolve => { resolveSearch = resolve }))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()

      expect(store.loading).toBe(true)

      resolveSearch!({ concepts: [] })
      await flushPromises()
    })
  })

  describe('Error Display', () => {
    it('should show error alert when error exists', async () => {
      mockSearchConcepts.mockRejectedValue(new Error('Search failed'))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.onSearch()
      await flushPromises()

      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(true)
      expect(alert.text()).toContain('Search failed')
    })

    it('should have error type alert', async () => {
      mockSearchConcepts.mockRejectedValue(new Error('Search failed'))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.onSearch()
      await flushPromises()

      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.classes()).toContain('atlas-feedback--danger')
    })

    it('should be closable', async () => {
      mockSearchConcepts.mockRejectedValue(new Error('Search failed'))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.onSearch()
      await flushPromises()

      const closeButton = wrapper.find('[data-testid="atlas-feedback-close"]')
      expect(closeButton.exists()).toBe(true)
    })

    it('should not show error alert when no error', () => {
      wrapper = mountComponent()

      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(false)
    })
  })

  describe('ConceptTable Integration', () => {
    it('should pass concepts to ConceptTable', async () => {
      const mockConcepts = [createMockConcept()]
      mockSearchConcepts.mockResolvedValue({ concepts: mockConcepts })

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.onSearch()
      await flushPromises()

      const table = wrapper.findComponent({ name: 'ConceptTable' })
      expect(table.props('concepts').length).toBeGreaterThan(0)
    })

    it('should pass loading state to ConceptTable', async () => {
      wrapper = mountComponent()

      const table = wrapper.findComponent({ name: 'ConceptTable' })
      expect(table.props('loading')).toBe(store.loading)
    })

    it('should pass totalItems to ConceptTable', () => {
      wrapper = mountComponent()

      const table = wrapper.findComponent({ name: 'ConceptTable' })
      expect(table.props('totalItems')).toBe(store.totalCount)
    })

    it('should pass page to ConceptTable', () => {
      wrapper = mountComponent()

      const table = wrapper.findComponent({ name: 'ConceptTable' })
      expect(table.props('page')).toBe(store.page)
    })

    it('should pass itemsPerPage to ConceptTable', () => {
      wrapper = mountComponent()

      const table = wrapper.findComponent({ name: 'ConceptTable' })
      expect(table.props('itemsPerPage')).toBe(store.itemsPerPage)
    })
  })

  describe('Pagination Handling', () => {
    it('should update pagination when page changes', async () => {
      wrapper = mountComponent()

      await wrapper.vm.onPageChange(3)

      expect(store.page).toBe(3)
    })

    it('should update pagination when items per page changes', async () => {
      wrapper = mountComponent()

      await wrapper.vm.onItemsPerPageChange(50)

      expect(store.page).toBe(1)
      expect(store.itemsPerPage).toBe(50)
    })
  })

  describe('Computed Properties', () => {
    it('should compute isSearchValid correctly for valid input', () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'

      expect(wrapper.vm.isSearchValid).toBe(true)
    })

    it('should compute isSearchValid correctly for invalid input', () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'ab'

      expect(wrapper.vm.isSearchValid).toBe(false)
    })

    it('should compute isSearchValid correctly for empty input', () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = ''

      expect(wrapper.vm.isSearchValid).toBe(false)
    })

    it('should trim whitespace when validating', () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = '  diabetes  '

      expect(wrapper.vm.isSearchValid).toBe(true)
    })

    it('should compute loading from store', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.loading).toBe(store.loading)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null search input', async () => {
      wrapper = mountComponent()

      await wrapper.vm.onSearchInput(null)

      expect(store.allConcepts.length).toBe(0)
    })

    it('should handle special characters in search', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'test-123'
      await wrapper.vm.onSearch()
      await flushPromises()

      expect(mockSearchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'test-123')
    })

    it('should handle unicode characters in search', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'café'
      await wrapper.vm.onSearch()
      await flushPromises()

      expect(mockSearchConcepts).toHaveBeenCalledWith('SYNPUF1K', 'café')
    })

    it('should handle empty search results', async () => {
      mockSearchConcepts.mockResolvedValue({ concepts: [] })

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'nonexistent'
      await wrapper.vm.onSearch()
      await flushPromises()

      expect(store.concepts.length).toBe(0)
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply concept-search class', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.concept-search').exists()).toBe(true)
    })

    it('should render the hint with the dedicated hint class', () => {
      wrapper = mountComponent()
      // Refresh swapped Vuetify text-caption + text-grey utilities for a
      // scoped class so the hint can carry its own typography.
      expect(wrapper.find('.concept-search__hint').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have placeholder text for guidance', () => {
      wrapper = mountComponent()
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('placeholder')).toBeTruthy()
    })

    it('should surface validation guidance via the hint area', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'ab'
      await wrapper.vm.$nextTick()

      // Validation now flows through the hint line under the input
      // rather than the v-text-field error-messages slot.
      expect(wrapper.vm.validationError).toBe('Please enter at least 3 characters')
      const hint = wrapper.find('.concept-search__hint')
      expect(hint.text()).toContain('Please enter at least 3 characters')
    })

    it('should disable interactive elements when loading', async () => {
      let resolveSearch: (value: any) => void
      mockSearchConcepts.mockReturnValue(new Promise(resolve => { resolveSearch = resolve }))

      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      wrapper.vm.onSearch()
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('disabled')).toBe(true)

      resolveSearch!({ concepts: [] })
      await flushPromises()
    })
  })

  describe('Component Lifecycle', () => {
    it('should initialize with empty search input', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.searchInput).toBe('')
    })

    it('should maintain search input across updates', async () => {
      wrapper = mountComponent()

      wrapper.vm.searchInput = 'diabetes'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.searchInput).toBe('diabetes')
    })
  })
})
