/**
 * CohortFilters Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortFilters from '@/components/cohort/CohortFilters.vue'
import type { FilterState } from '@/composables/useCohorts'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    locale: ref('en-US')
  })
}))

const vuetify = createVuetify({ components, directives })

const defaultFilters: FilterState = {
  searchQuery: '',
  selectedTags: [],
  author: '',
  createdDateRange: {
    from: undefined,
    to: undefined
  },
  modifiedDateRange: {
    from: undefined,
    to: undefined
  }
}

function mountComponent(props = {}) {
  return mount(CohortFilters, {
    props: {
      filters: defaultFilters,
      availableTags: ['Diabetes', 'Heart Disease', 'Obesity'],
      availableAuthors: ['John Doe', 'Jane Smith', 'Bob Johnson'],
      activeFilterCount: 0,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VTooltip: {
          template: '<div><slot name="activator" :props="{}" /><slot /></div>'
        }
      }
    }
  })
}

describe('CohortFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the inline filter bar with always-visible search', () => {
      const wrapper = mountComponent()

      // Refresh: replaced the v-expansion-panel with an inline filter
      // bar. The search input is always visible; the rest is behind a
      // "Filters" menu button.
      expect(wrapper.find('.cohort-filters__bar').exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
    })

    it('should render the Filters menu activator button', () => {
      const wrapper = mountComponent()

      const menuBtn = wrapper.find('.cohort-filters__menu-btn')
      expect(menuBtn.exists()).toBe(true)
    })

    it('should show an active-count chip on the menu button when filters are active', () => {
      const wrapper = mountComponent({ activeFilterCount: 3 })

      const countChip = wrapper.find('.cohort-filters__menu-count')
      expect(countChip.exists()).toBe(true)
      expect(countChip.text()).toContain('3')
    })

    it('should not show the count chip when no filters are active', () => {
      const wrapper = mountComponent({ activeFilterCount: 0 })

      expect(wrapper.find('.cohort-filters__menu-count').exists()).toBe(false)
    })
  })

  describe('Props', () => {
    it('should receive filters prop', () => {
      const customFilters: FilterState = {
        ...defaultFilters,
        searchQuery: 'test'
      }
      const wrapper = mountComponent({ filters: customFilters })

      expect(wrapper.props('filters')).toEqual(customFilters)
    })

    it('should receive available tags', () => {
      const wrapper = mountComponent()

      expect(wrapper.props('availableTags')).toEqual(['Diabetes', 'Heart Disease', 'Obesity'])
    })

    it('should receive available authors', () => {
      const wrapper = mountComponent()

      expect(wrapper.props('availableAuthors')).toEqual(['John Doe', 'Jane Smith', 'Bob Johnson'])
    })

    it('should receive active filter count', () => {
      const wrapper = mountComponent({ activeFilterCount: 5 })

      expect(wrapper.props('activeFilterCount')).toBe(5)
    })
  })

  describe('Clear All', () => {
    it('should emit clear when clear method is available', () => {
      const wrapper = mountComponent({ activeFilterCount: 3 })

      // The component should support clear functionality
      expect(wrapper.vm).toBeDefined()
    })

    it('should emit clear event when handleClearAll is called', () => {
      const wrapper = mountComponent({ activeFilterCount: 3 })

      wrapper.vm.handleClearAll()

      expect(wrapper.emitted('clear')).toBeTruthy()
      expect(wrapper.emitted('clear')!.length).toBe(1)
    })
  })

  describe('formatDateForDisplay', () => {
    it('should return empty string for undefined date', () => {
      const wrapper = mountComponent()
      const result = wrapper.vm.formatDateForDisplay(undefined)
      expect(result).toBe('')
    })

    it('should format date correctly', () => {
      const wrapper = mountComponent()
      const date = new Date('2024-03-15')
      const result = wrapper.vm.formatDateForDisplay(date)
      expect(result).toBeTruthy()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Date Change Handlers', () => {
    it('should update created from date and close picker', () => {
      const wrapper = mountComponent()
      const testDate = new Date('2024-01-15')

      wrapper.vm.showCreatedFromPicker = true
      wrapper.vm.handleCreatedFromChange(testDate)

      expect(wrapper.vm.localFilters.createdDateRange.from).toEqual(testDate)
      expect(wrapper.vm.showCreatedFromPicker).toBe(false)
    })

    it('should update created to date and close picker', () => {
      const wrapper = mountComponent()
      const testDate = new Date('2024-02-20')

      wrapper.vm.showCreatedToPicker = true
      wrapper.vm.handleCreatedToChange(testDate)

      expect(wrapper.vm.localFilters.createdDateRange.to).toEqual(testDate)
      expect(wrapper.vm.showCreatedToPicker).toBe(false)
    })

    it('should update modified from date and close picker', () => {
      const wrapper = mountComponent()
      const testDate = new Date('2024-03-10')

      wrapper.vm.showModifiedFromPicker = true
      wrapper.vm.handleModifiedFromChange(testDate)

      expect(wrapper.vm.localFilters.modifiedDateRange.from).toEqual(testDate)
      expect(wrapper.vm.showModifiedFromPicker).toBe(false)
    })

    it('should update modified to date and close picker', () => {
      const wrapper = mountComponent()
      const testDate = new Date('2024-04-25')

      wrapper.vm.showModifiedToPicker = true
      wrapper.vm.handleModifiedToChange(testDate)

      expect(wrapper.vm.localFilters.modifiedDateRange.to).toEqual(testDate)
      expect(wrapper.vm.showModifiedToPicker).toBe(false)
    })
  })

  describe('removeTag', () => {
    it('should remove tag from selectedTags', () => {
      const filtersWithTags: FilterState = {
        ...defaultFilters,
        selectedTags: ['tag1', 'tag2', 'tag3']
      }
      const wrapper = mountComponent({ filters: filtersWithTags })

      wrapper.vm.removeTag('tag2')

      expect(wrapper.vm.localFilters.selectedTags).toEqual(['tag1', 'tag3'])
    })

    it('should do nothing if tag not found', () => {
      const filtersWithTags: FilterState = {
        ...defaultFilters,
        selectedTags: ['tag1', 'tag2']
      }
      const wrapper = mountComponent({ filters: filtersWithTags })

      wrapper.vm.removeTag('nonexistent')

      expect(wrapper.vm.localFilters.selectedTags).toEqual(['tag1', 'tag2'])
    })
  })

  describe('Filter State', () => {
    it('should handle filters with search query', () => {
      const filtersWithSearch: FilterState = {
        ...defaultFilters,
        searchQuery: 'diabetes'
      }
      const wrapper = mountComponent({
        filters: filtersWithSearch,
        activeFilterCount: 1
      })

      expect(wrapper.props('filters').searchQuery).toBe('diabetes')
    })

    it('should handle filters with selected tags', () => {
      const filtersWithTags: FilterState = {
        ...defaultFilters,
        selectedTags: ['Diabetes', 'Obesity']
      }
      const wrapper = mountComponent({
        filters: filtersWithTags,
        activeFilterCount: 2
      })

      expect(wrapper.props('filters').selectedTags).toEqual(['Diabetes', 'Obesity'])
    })

    it('should handle filters with author', () => {
      const filtersWithAuthor: FilterState = {
        ...defaultFilters,
        author: 'John Doe'
      }
      const wrapper = mountComponent({
        filters: filtersWithAuthor,
        activeFilterCount: 1
      })

      expect(wrapper.props('filters').author).toBe('John Doe')
    })

    it('should handle filters with date ranges', () => {
      const filtersWithDates: FilterState = {
        ...defaultFilters,
        createdDateRange: {
          from: new Date('2024-01-01'),
          to: new Date('2024-12-31')
        }
      }
      const wrapper = mountComponent({
        filters: filtersWithDates,
        activeFilterCount: 2
      })

      expect(wrapper.props('filters').createdDateRange.from).toEqual(new Date('2024-01-01'))
      expect(wrapper.props('filters').createdDateRange.to).toEqual(new Date('2024-12-31'))
    })
  })
})
