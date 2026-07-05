/**
 * CohortGrid Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortGrid from '@/components/cohort/CohortGrid.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

// Mock dependencies
vi.mock('@/composables/useI18n', () => {
  const interpolate = (template: string, params?: Record<string, unknown>) =>
    params
      ? template.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m))
      : template
  return {
    useI18n: () => ({
      t: (key: string, fallback?: string) => ref(fallback || key),
      tv: (key: string, fallback?: string, params?: Record<string, unknown>) =>
        interpolate(fallback || key, params)
    })
  }
})

const vuetify = createVuetify({ components, directives })

const mockCohorts: CohortDefinitionSummary[] = [
  {
    id: 1,
    name: 'Cohort 1',
    description: 'First cohort',
    createdBy: { name: 'John Doe', login: 'jdoe' },
    createdDate: '2024-01-15T10:00:00Z',
    modifiedDate: '2024-06-01T15:30:00Z',
    tags: [{ id: 1, name: 'Diabetes', color: '#ff5252' }]
  },
  {
    id: 2,
    name: 'Cohort 2',
    description: 'Second cohort',
    createdBy: { name: 'Jane Smith', login: 'jsmith' },
    createdDate: '2024-02-20T10:00:00Z',
    modifiedDate: '2024-06-05T15:30:00Z',
    tags: [{ id: 2, name: 'Heart Disease', color: '#2196f3' }]
  }
]

function mountComponent(props = {}) {
  return mount(CohortGrid, {
    props: {
      cohorts: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedTags: [],
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        CohortCard: {
          name: 'CohortCard',
          template: '<div class="cohort-card-stub">{{ cohort.name }}</div>',
          props: ['cohort', 'selectedTags']
        },
        VTooltip: {
          template: '<div><slot name="activator" :props="{}" /><slot /></div>'
        }
      }
    }
  })
}

describe('CohortGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show skeleton loaders when loading', () => {
      const wrapper = mountComponent({ loading: true })

      const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
      expect(skeletons.length).toBe(12)
    })

    it('should not show cohorts when loading', () => {
      const wrapper = mountComponent({
        loading: true,
        cohorts: mockCohorts
      })

      const cards = wrapper.findAll('.cohort-card-stub')
      expect(cards.length).toBe(0)
    })

    it('should render skeleton loaders in grid container', () => {
      const wrapper = mountComponent({ loading: true })

      const container = wrapper.find('.cohort-grid__container')
      expect(container.exists()).toBe(true)

      const skeletons = container.findAllComponents({ name: 'VSkeletonLoader' })
      expect(skeletons.length).toBe(12)
    })
  })

  describe('Error State', () => {
    it('should show error alert when error exists', () => {
      const error = new Error('Failed to load cohorts')
      const wrapper = mountComponent({ error })

      // AtlasAlert renders AtlasFeedbackBody with data-testid="atlas-feedback"
      // and atlas-feedback--danger class for error/danger severity
      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(true)
      expect(alert.classes()).toContain('atlas-feedback--danger')
    })

    it('should display error message', () => {
      const error = new Error('Custom error message')
      const wrapper = mountComponent({ error })

      expect(wrapper.text()).toContain('Custom error message')
    })

    it('should display default error message when error has no message', () => {
      const error = new Error()
      const wrapper = mountComponent({ error })

      expect(wrapper.text()).toContain('Failed to load cohorts')
    })

    it('should show retry button on error', () => {
      const error = new Error('Failed to load')
      const wrapper = mountComponent({ error })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const retryBtn = buttons.find(btn => btn.text().includes('Retry'))
      expect(retryBtn).toBeDefined()
    })

    it('should emit retry event when retry button is clicked', async () => {
      const error = new Error('Failed to load')
      const wrapper = mountComponent({ error })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const retryBtn = buttons.find(btn => btn.text().includes('Retry'))
      await retryBtn?.trigger('click')

      expect(wrapper.emitted('retry')).toBeTruthy()
    })

    it('should not show cohorts when error exists', () => {
      const error = new Error('Failed to load')
      const wrapper = mountComponent({
        error,
        cohorts: mockCohorts
      })

      const cards = wrapper.findAll('.cohort-card-stub')
      expect(cards.length).toBe(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no cohorts', () => {
      const wrapper = mountComponent({ cohorts: [] })

      const emptyState = wrapper.find('.cohort-grid__empty')
      expect(emptyState.exists()).toBe(true)
    })

    it('should display the bookmark icon in the initial empty state', () => {
      // Refresh: replaced the legacy folder-open icon with the
      // bookmark mark used across modernised empty states.
      const wrapper = mountComponent({ cohorts: [] })

      const emptyState = wrapper.find('.cohort-grid__empty')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.html()).toContain('mdi-bookmark-outline')
    })

    it('should display the empty-state text', () => {
      const wrapper = mountComponent({ cohorts: [] })

      const text = wrapper.find('.cohort-grid__empty-text')
      expect(text.exists()).toBe(true)
      expect(text.text().toLowerCase()).toContain('no cohorts')
    })

    it('should display the initial empty message when no filters are applied', () => {
      const wrapper = mountComponent({ cohorts: [] })

      // Refresh: empty-state copy was tightened.
      expect(wrapper.text()).toContain('No cohorts yet')
    })

    it('should display the filtered-empty message when a search query is set', () => {
      const wrapper = mountComponent({
        cohorts: [],
        searchQuery: 'diabetes'
      })

      expect(wrapper.text()).toContain('No cohorts match "diabetes"')
    })

    it('should show the New cohort button in the initial empty state', () => {
      const wrapper = mountComponent({ cohorts: [] })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createBtn = buttons.find(btn => btn.text().toLowerCase().includes('new cohort'))
      expect(createBtn).toBeDefined()
    })

    it('should emit create-cohort event when create button is clicked', async () => {
      const wrapper = mountComponent({ cohorts: [] })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const createBtn = buttons.find(btn => btn.text().toLowerCase().includes('new cohort'))
      await createBtn?.trigger('click')

      expect(wrapper.emitted('create-cohort')).toBeTruthy()
    })

    it('should emit clear-filters when filtered-empty Clear filters is clicked', async () => {
      const wrapper = mountComponent({ cohorts: [], searchQuery: 'diabetes' })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearBtn = buttons.find(btn => btn.text().toLowerCase().includes('clear filters'))
      await clearBtn?.trigger('click')

      expect(wrapper.emitted('clear-filters')).toBeTruthy()
    })

    it('should not show empty state when loading', () => {
      const wrapper = mountComponent({
        cohorts: [],
        loading: true
      })

      const emptyState = wrapper.find('.cohort-grid__empty')
      expect(emptyState.exists()).toBe(false)
    })

    it('should not show empty state when error exists', () => {
      const error = new Error('Failed')
      const wrapper = mountComponent({
        cohorts: [],
        error
      })

      const emptyState = wrapper.find('.cohort-grid__empty')
      expect(emptyState.exists()).toBe(false)
    })
  })

  describe('Cohorts Display', () => {
    it('should render cohorts in grid', () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const cards = wrapper.findAll('.cohort-card-stub')
      expect(cards.length).toBe(2)
    })

    it('should render cohort cards with correct props', () => {
      const wrapper = mountComponent({
        cohorts: mockCohorts,
        selectedTags: ['Diabetes']
      })

      const cards = wrapper.findAllComponents({ name: 'CohortCard' })
      expect(cards[0].props('cohort')).toEqual(mockCohorts[0])
      expect(cards[0].props('selectedTags')).toEqual(['Diabetes'])
    })

    it('should display cohort names', () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      expect(wrapper.text()).toContain('Cohort 1')
      expect(wrapper.text()).toContain('Cohort 2')
    })

    it('should render cohorts in grid container', () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const container = wrapper.find('.cohort-grid__container')
      expect(container.exists()).toBe(true)

      const cards = container.findAll('.cohort-card-stub')
      expect(cards.length).toBe(2)
    })
  })

  describe('Events', () => {
    // Refresh: Generate was removed from the cohort cards (and the
    // table row) because the overview is for browse/manage; running
    // a cohort happens from the cohort builder instead.

    it('should emit delete event from cohort card', async () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const card = wrapper.findComponent({ name: 'CohortCard' })
      await card.vm.$emit('delete', mockCohorts[0])

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')![0]).toEqual([mockCohorts[0]])
    })

    it('should emit tag-click event from cohort card', async () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const card = wrapper.findComponent({ name: 'CohortCard' })
      await card.vm.$emit('tag-click', 'Diabetes')

      expect(wrapper.emitted('tag-click')).toBeTruthy()
      expect(wrapper.emitted('tag-click')![0]).toEqual(['Diabetes'])
    })

    it('should emit show-info event from cohort card', async () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const card = wrapper.findComponent({ name: 'CohortCard' })
      await card.vm.$emit('show-info', mockCohorts[0])

      expect(wrapper.emitted('show-info')).toBeTruthy()
      expect(wrapper.emitted('show-info')![0]).toEqual([mockCohorts[0]])
    })
  })

  describe('Grid Layout', () => {
    it('should have responsive grid class', () => {
      const wrapper = mountComponent({ cohorts: mockCohorts })

      const container = wrapper.find('.cohort-grid__container')
      expect(container.exists()).toBe(true)
    })
  })
})
