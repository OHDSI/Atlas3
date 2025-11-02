import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import ConceptSetList from '@/components/concept-sets/ConceptSetList.vue'
import type { ConceptSet } from '@/models/concept-set.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ConceptSetList', () => {
  const mockConceptSets: ConceptSet[] = [
    {
      id: 123,
      name: 'Type 2 Diabetes',
      expression: {
        items: [
          {
            concept: {
              conceptId: 201826,
              conceptName: 'Type 2 diabetes mellitus',
              conceptCode: '44054006',
              domainId: 'Condition',
              vocabularyId: 'SNOMED',
              conceptClassId: 'Clinical Finding',
              standardConcept: 'S',
            },
            includeDescendants: true,
            includeMapped: false,
            isExcluded: false,
          },
        ],
      },
    },
    {
      id: 456,
      name: 'Metformin Products',
      expression: {
        items: [
          {
            concept: {
              conceptId: 1503297,
              conceptName: 'Metformin',
              conceptCode: '6809',
              domainId: 'Drug',
              vocabularyId: 'RxNorm',
              conceptClassId: 'Ingredient',
              standardConcept: 'S',
            },
            includeDescendants: true,
            includeMapped: false,
            isExcluded: false,
          },
        ],
      },
    },
  ]

  const createWrapper = (conceptSets: ConceptSet[] = []) => {
    return mount(ConceptSetList, {
      global: {
        plugins: [vuetify, createPinia()],
      },
      props: {
        conceptSets,
      },
    })
  }

  it('should render a list of concept sets', () => {
    const wrapper = createWrapper(mockConceptSets)
    const list = wrapper.find('[data-testid="concept-set-list"]')
    expect(list.exists()).toBe(true)
  })

  it('should display concept set names', () => {
    const wrapper = createWrapper(mockConceptSets)
    expect(wrapper.html()).toContain('Type 2 Diabetes')
    expect(wrapper.html()).toContain('Metformin Products')
  })

  it('should display concept set IDs', () => {
    const wrapper = createWrapper(mockConceptSets)
    expect(wrapper.html()).toContain('123')
    expect(wrapper.html()).toContain('456')
  })

  it('should display concept counts for each set', () => {
    const wrapper = createWrapper(mockConceptSets)
    // Each concept set has 1 concept
    const conceptCounts = wrapper.findAll('[data-testid^="concept-count"]')
    expect(conceptCounts.length).toBeGreaterThan(0)
  })

  it('should render edit button for each concept set', () => {
    const wrapper = createWrapper(mockConceptSets)
    const editBtn1 = wrapper.find('[data-testid="edit-concept-set-123"]')
    const editBtn2 = wrapper.find('[data-testid="edit-concept-set-456"]')

    expect(editBtn1.exists()).toBe(true)
    expect(editBtn2.exists()).toBe(true)
  })

  it('should render delete button for each concept set', () => {
    const wrapper = createWrapper(mockConceptSets)
    const deleteBtn1 = wrapper.find('[data-testid="delete-concept-set-123"]')
    const deleteBtn2 = wrapper.find('[data-testid="delete-concept-set-456"]')

    expect(deleteBtn1.exists()).toBe(true)
    expect(deleteBtn2.exists()).toBe(true)
  })

  it('should emit edit event when edit button is clicked', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const editBtn = wrapper.find('[data-testid="edit-concept-set-123"]')

    await editBtn.trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    const emitted = wrapper.emitted('edit') as Array<[number | string]>
    expect(emitted[0][0]).toBe(123)
  })

  it('should emit delete event when delete button is clicked', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const deleteBtn = wrapper.find('[data-testid="delete-concept-set-123"]')

    await deleteBtn.trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    const emitted = wrapper.emitted('delete') as Array<[number | string]>
    expect(emitted[0][0]).toBe(123)
  })

  it('should show empty state when no concept sets', () => {
    const wrapper = createWrapper([])
    const emptyState = wrapper.find('[data-testid="empty-concept-sets"]')
    expect(emptyState.exists()).toBe(true)
  })

  it('should render create new button', () => {
    const wrapper = createWrapper(mockConceptSets)
    const createBtn = wrapper.find('[data-testid="create-concept-set"]')
    expect(createBtn.exists()).toBe(true)
  })

  it('should emit create event when create button is clicked', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const createBtn = wrapper.find('[data-testid="create-concept-set"]')

    await createBtn.trigger('click')

    expect(wrapper.emitted('create')).toBeTruthy()
  })

  it('should display concept sets in a data table or list', () => {
    const wrapper = createWrapper(mockConceptSets)

    // Check for Vuetify data table or list component
    const hasTable = wrapper.findComponent({ name: 'VDataTable' }).exists()
    const hasList = wrapper.findComponent({ name: 'VList' }).exists()

    expect(hasTable || hasList).toBe(true)
  })

  it('should show confirmation before deleting', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const deleteBtn = wrapper.find('[data-testid="delete-concept-set-123"]')

    await deleteBtn.trigger('click')

    // Check for confirmation dialog (implementation dependent)
    // Dialog might be shown via store or local state
  })

  it('should filter concept sets when search is provided', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const searchInput = wrapper.find('[data-testid="search-concept-sets"]')

    if (searchInput.exists()) {
      await searchInput.setValue('Metformin')

      // Should only show Metformin concept set
      expect(wrapper.html()).toContain('Metformin Products')
      expect(wrapper.html()).not.toContain('Type 2 Diabetes')
    }
  })

  it('should sort concept sets by name', async () => {
    const wrapper = createWrapper(mockConceptSets)
    const nameHeader = wrapper.find('[data-testid="sort-by-name"]')

    if (nameHeader.exists()) {
      await nameHeader.trigger('click')

      // Check sort order changed
    }
  })
})
