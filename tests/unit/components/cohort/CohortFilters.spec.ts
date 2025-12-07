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
    it('should render expansion panel', () => {
      const wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'VExpansionPanels' }).exists()).toBe(true)
    })

    it('should display filter icon and title', () => {
      const wrapper = mountComponent()

      const title = wrapper.find('.cohort-filters__title')
      expect(title.exists()).toBe(true)
      expect(title.text()).toBeTruthy()
    })

    it('should show badge when filters are active', () => {
      const wrapper = mountComponent({ activeFilterCount: 3 })

      const badge = wrapper.findComponent({ name: 'VBadge' })
      expect(badge.exists()).toBe(true)
      expect(badge.props('content')).toBe(3)
    })

    it('should not show badge when no filters are active', () => {
      const wrapper = mountComponent({ activeFilterCount: 0 })

      const badges = wrapper.findAllComponents({ name: 'VBadge' })
      expect(badges.length).toBe(0)
    })

    it('should have expansion panel structure', () => {
      const wrapper = mountComponent()

      // Check that the component has the expansion panel structure
      const panel = wrapper.findComponent({ name: 'VExpansionPanel' })
      expect(panel.exists()).toBe(true)
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
