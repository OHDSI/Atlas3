import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import ConceptSetEditor from '@/components/concept-sets/ConceptSetEditor.vue'
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

describe('ConceptSetEditor', () => {
  const mockConceptSet: ConceptSet = {
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
  }

  const createWrapper = (conceptSet?: ConceptSet) => {
    return mount(ConceptSetEditor, {
      global: {
        plugins: [vuetify, createPinia()],
      },
      props: {
        modelValue: conceptSet,
      },
    })
  }

  it('should render concept set name input', () => {
    const wrapper = createWrapper()
    const nameInput = wrapper.find('[data-testid="concept-set-name"]')
    expect(nameInput.exists()).toBe(true)
  })

  it('should display provided concept set name', () => {
    const wrapper = createWrapper(mockConceptSet)
    const nameInput = wrapper.find('[data-testid="concept-set-name"]')
    expect(nameInput.element.value).toBe('Type 2 Diabetes')
  })

  it('should render concept list', () => {
    const wrapper = createWrapper(mockConceptSet)
    const conceptList = wrapper.find('[data-testid="concept-list"]')
    expect(conceptList.exists()).toBe(true)
  })

  it('should display all concepts in the concept set', () => {
    const wrapper = createWrapper(mockConceptSet)
    expect(wrapper.html()).toContain('Type 2 diabetes mellitus')
    expect(wrapper.html()).toContain('201826')
  })

  it('should render add concept button', () => {
    const wrapper = createWrapper()
    const addBtn = wrapper.find('[data-testid="add-concept-btn"]')
    expect(addBtn.exists()).toBe(true)
  })

  it('should emit update when concept set name changes', async () => {
    const wrapper = createWrapper(mockConceptSet)
    const nameInput = wrapper.find('[data-testid="concept-set-name"]')

    await nameInput.setValue('Type 2 Diabetes - Updated')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ConceptSet]>
    expect(emitted[0][0].name).toBe('Type 2 Diabetes - Updated')
  })

  it('should show remove button for each concept', () => {
    const wrapper = createWrapper(mockConceptSet)
    const removeBtn = wrapper.find('[data-testid="remove-concept-0"]')
    expect(removeBtn.exists()).toBe(true)
  })

  it('should emit update when concept is removed', async () => {
    const wrapper = createWrapper(mockConceptSet)
    const removeBtn = wrapper.find('[data-testid="remove-concept-0"]')

    await removeBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ConceptSet]>
    expect(emitted[0][0].expression.items).toHaveLength(0)
  })

  it('should render include descendants checkbox for each concept', () => {
    const wrapper = createWrapper(mockConceptSet)
    const checkbox = wrapper.find('[data-testid="include-descendants-0"]')
    expect(checkbox.exists()).toBe(true)
  })

  it('should show checked state for include descendants when true', () => {
    const wrapper = createWrapper(mockConceptSet)
    const checkbox = wrapper.find('[data-testid="include-descendants-0"]')

    // Vuetify checkbox implementation
    expect(checkbox.element.checked || wrapper.html().includes('mdi-checkbox-marked')).toBeTruthy()
  })

  it('should emit update when include descendants is toggled', async () => {
    const wrapper = createWrapper(mockConceptSet)
    const checkbox = wrapper.find('[data-testid="include-descendants-0"]')

    await checkbox.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should display concept domain and vocabulary info', () => {
    const wrapper = createWrapper(mockConceptSet)

    expect(wrapper.html()).toContain('SNOMED')
    expect(wrapper.html()).toContain('Condition')
  })

  it('should show save button', () => {
    const wrapper = createWrapper(mockConceptSet)
    const saveBtn = wrapper.find('[data-testid="save-concept-set"]')
    expect(saveBtn.exists()).toBe(true)
  })

  it('should emit save event when save button is clicked', async () => {
    const wrapper = createWrapper(mockConceptSet)
    const saveBtn = wrapper.find('[data-testid="save-concept-set"]')

    await saveBtn.trigger('click')

    expect(wrapper.emitted('save')).toBeTruthy()
  })

  it('should show cancel button', () => {
    const wrapper = createWrapper(mockConceptSet)
    const cancelBtn = wrapper.find('[data-testid="cancel-edit"]')
    expect(cancelBtn.exists()).toBe(true)
  })

  it('should emit cancel event when cancel button is clicked', async () => {
    const wrapper = createWrapper(mockConceptSet)
    const cancelBtn = wrapper.find('[data-testid="cancel-edit"]')

    await cancelBtn.trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
  })

  it('should handle empty concept set', () => {
    const emptyConceptSet: ConceptSet = {
      id: 'new',
      name: '',
      expression: {
        items: [],
      },
    }

    const wrapper = createWrapper(emptyConceptSet)
    expect(wrapper.find('[data-testid="concept-set-name"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="concept-list"]').exists()).toBe(true)
  })
})
