/**
 * ConceptSetPicker Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetPicker from '@/components/cohort-builder/ConceptSetPicker.vue'
import type { ConceptSet, Concept } from '@/models/concept-set.types'
import type { Concept as EventConcept } from '@/models/event.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useConceptSets', () => ({
  useConceptSets: () => ({
    conceptSetsList: { value: mockConceptSets },
    loadAllConceptSets: vi.fn(),
    getConceptSet: vi.fn((id: number | string) => mockConceptSets.find(cs => cs.id === id)),
    createConceptSet: vi.fn(),
    selectedConcepts: { value: [] },
    toggleConceptSelection: vi.fn(),
    clearSelectedConcepts: vi.fn(),
  })
}))

const vuetify = createVuetify({ components, directives })

const mockConceptSets: ConceptSet[] = [
  {
    id: 1,
    name: 'Type 2 Diabetes',
    items: [
      {
        conceptId: 201826,
        conceptName: 'Type 2 Diabetes Mellitus',
        conceptCode: 'E11',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      }
    ]
  },
  {
    id: 2,
    name: 'Hypertension',
    items: [
      {
        conceptId: 316866,
        conceptName: 'Hypertension',
        conceptCode: 'I10',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      }
    ]
  }
]

function mountComponent(props = {}) {
  return mount(ConceptSetPicker, {
    props,
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSearch: {
          template: '<div class="concept-search-stub" />',
          emits: ['select-concept']
        },
        ConceptSetEditor: {
          template: '<div class="concept-set-editor-stub" />',
          props: ['modelValue'],
          emits: ['save', 'cancel', 'add-concepts']
        }
      }
    }
  })
}

describe('ConceptSetPicker', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render card component', () => {
      const wrapper = mountComponent()
      const card = wrapper.findComponent({ name: 'VCard' })
      expect(card.exists()).toBe(true)
    })

    it('should display concept set mode by default', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.exists()).toBe(true)
    })

    it('should display single concept mode when singleSelect is true', () => {
      const wrapper = mountComponent({ singleSelect: true })
      const textField = wrapper.find('[data-testid="single-concept-display"]')
      expect(textField.exists()).toBe(true)
    })
  })

  describe('Concept Set Selection Mode', () => {
    it('should render concept set selector dropdown', () => {
      const wrapper = mountComponent()
      const selector = wrapper.find('[data-testid="concept-set-selector"]')
      expect(selector.exists()).toBe(true)
    })

    it('should display available concept sets in dropdown', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.exists()).toBe(true)
    })

    it('should emit update:modelValue when concept set is selected', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      // Simulate selecting a concept set
      await vm.handleSelect(1)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('should display selected concept set as chip', async () => {
      const wrapper = mountComponent({
        modelValue: { id: 1, name: 'Type 2 Diabetes', conceptCount: 1 }
      })
      await wrapper.vm.$nextTick()

      // Wait for component to load concept set
      await new Promise(resolve => setTimeout(resolve, 100))
      await wrapper.vm.$nextTick()

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const hasConceptSetChip = chips.some(chip => chip.text().includes('Type 2 Diabetes'))
      expect(hasConceptSetChip).toBe(true)
    })

    it('should clear selection when clearable is used', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      await vm.handleSelect(1)
      await wrapper.vm.$nextTick()

      vm.clearSelection()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted[emitted.length - 1][0]).toBeUndefined()
    })

    it('should show search dialog when search option is clicked', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.showSearch = true
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should show create new dialog when create option is clicked', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.showCreateNew = true
      await wrapper.vm.$nextTick()

      const dialogs = wrapper.findAllComponents({ name: 'VDialog' })
      expect(dialogs.length).toBeGreaterThan(0)
    })
  })

  describe('Single Concept Selection Mode', () => {
    it('should render text field for single concept display', () => {
      const wrapper = mountComponent({ singleSelect: true })
      const textField = wrapper.find('[data-testid="single-concept-display"]')
      expect(textField.exists()).toBe(true)
    })

    it('should display selected concept name', async () => {
      const mockConcept: EventConcept = {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 Diabetes Mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: undefined,
      }

      const wrapper = mountComponent({
        singleSelect: true,
        modelValue: mockConcept
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Type 2 Diabetes Mellitus')
    })

    it('should display selected concept as chip with ID', async () => {
      const mockConcept: EventConcept = {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 Diabetes Mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: undefined,
      }

      const wrapper = mountComponent({
        singleSelect: true,
        modelValue: mockConcept
      })
      await wrapper.vm.$nextTick()

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const conceptChip = chips.find(chip => chip.text().includes('201826'))
      expect(conceptChip).toBeDefined()
    })

    it('should show search button', () => {
      const wrapper = mountComponent({ singleSelect: true })
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const searchButton = buttons.some(btn => btn.props('icon') === 'mdi-magnify')
      expect(searchButton).toBe(true)
    })

    it('should show clear button when concept is selected', async () => {
      const mockConcept: EventConcept = {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 Diabetes Mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: undefined,
      }

      const wrapper = mountComponent({
        singleSelect: true,
        modelValue: mockConcept
      })
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearButton = buttons.some(btn => btn.props('icon') === 'mdi-close')
      expect(clearButton).toBe(true)
    })

    it('should clear single concept selection', async () => {
      const mockConcept: EventConcept = {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 Diabetes Mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: undefined,
      }

      const wrapper = mountComponent({
        singleSelect: true,
        modelValue: mockConcept
      })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      vm.clearSingleConceptSelection()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted[emitted.length - 1][0]).toBeUndefined()
    })

    it('should emit update:modelValue when concept is selected from search', async () => {
      const wrapper = mountComponent({ singleSelect: true })
      const vm = wrapper.vm as any

      const mockConcept: Concept = {
        conceptId: 201826,
        conceptName: 'Type 2 Diabetes Mellitus',
        conceptCode: 'E11',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
      }

      vm.handleConceptSelect(mockConcept)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      const emittedConcept = emitted[emitted.length - 1][0] as EventConcept
      expect(emittedConcept.CONCEPT_ID).toBe(201826)
      expect(emittedConcept.CONCEPT_NAME).toBe('Type 2 Diabetes Mellitus')
    })
  })

  describe('Concept Search Dialog', () => {
    it('should have search dialog functionality', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      // Component should have showSearch property
      expect(typeof vm.showSearch).toBe('boolean')
    })

    it('should open search dialog when clicking search button', async () => {
      const wrapper = mountComponent({ singleSelect: true })
      const vm = wrapper.vm as any

      vm.showSearch = true
      await wrapper.vm.$nextTick()

      expect(vm.showSearch).toBe(true)
    })

    it('should close search dialog after concept selection in single mode', async () => {
      const wrapper = mountComponent({ singleSelect: true })
      const vm = wrapper.vm as any

      vm.showSearch = true
      await wrapper.vm.$nextTick()

      const mockConcept: Concept = {
        conceptId: 201826,
        conceptName: 'Type 2 Diabetes Mellitus',
        conceptCode: 'E11',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
      }

      vm.handleConceptSelect(mockConcept)
      await wrapper.vm.$nextTick()

      expect(vm.showSearch).toBe(false)
    })
  })

  describe('Create New Concept Set', () => {
    it('should have create new dialog functionality', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      // Component should have showCreateNew property
      expect(typeof vm.showCreateNew).toBe('boolean')
    })

    it('should open create new dialog', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.showCreateNew = true
      await wrapper.vm.$nextTick()

      expect(vm.showCreateNew).toBe(true)
    })

    it('should open search from editor', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.openSearchFromEditor()
      await wrapper.vm.$nextTick()

      expect(vm.showSearch).toBe(true)
    })
  })

  describe('Watch modelValue changes', () => {
    it('should update selected concept set when modelValue changes in concept set mode', async () => {
      const wrapper = mountComponent()
      const _vm = wrapper.vm as any

      await wrapper.setProps({
        modelValue: { id: 1, name: 'Type 2 Diabetes', conceptCount: 1 }
      })
      await wrapper.vm.$nextTick()

      // Component should receive the prop
      expect(wrapper.props('modelValue')).toBeDefined()
      expect(wrapper.props('modelValue').id).toBe(1)
    })

    it('should update selected concept when modelValue changes in single select mode', async () => {
      const wrapper = mountComponent({ singleSelect: true })

      const mockConcept: EventConcept = {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 Diabetes Mellitus',
        CONCEPT_CODE: 'E11',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'ICD10CM',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: undefined,
      }

      await wrapper.setProps({ modelValue: mockConcept })
      await wrapper.vm.$nextTick()

      const vm = wrapper.vm as any
      expect(vm.selectedConcept).toBeTruthy()
      expect(vm.selectedConcept.CONCEPT_ID).toBe(201826)
    })

    it('should clear selection when modelValue becomes undefined', async () => {
      const wrapper = mountComponent({
        modelValue: { id: 1, name: 'Type 2 Diabetes', conceptCount: 1 }
      })
      const vm = wrapper.vm as any

      await wrapper.setProps({ modelValue: undefined })
      await wrapper.vm.$nextTick()

      expect(vm.selectedConceptSetId).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty concept set list', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle concept set with no items', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const emptyConceptSet: ConceptSet = {
        id: 3,
        name: 'Empty Set',
        items: []
      }

      const count = vm.getConceptCount(emptyConceptSet)
      expect(count).toBe(0)
    })

    it('should handle concept without standard_concept field', async () => {
      const wrapper = mountComponent({ singleSelect: true })
      const vm = wrapper.vm as any

      const mockConcept: Concept = {
        conceptId: 201826,
        conceptName: 'Test Concept',
        conceptCode: 'TEST',
        domainId: 'Condition',
        vocabularyId: 'TEST',
        conceptClassId: 'Test',
        standardConcept: null,
        invalidReason: null,
      }

      vm.handleConceptSelect(mockConcept)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('should handle concept with invalid_reason', async () => {
      const wrapper = mountComponent({ singleSelect: true })
      const vm = wrapper.vm as any

      const mockConcept: Concept = {
        conceptId: 201826,
        conceptName: 'Deprecated Concept',
        conceptCode: 'OLD',
        domainId: 'Condition',
        vocabularyId: 'TEST',
        conceptClassId: 'Test',
        standardConcept: 'S',
        invalidReason: 'D',
      }

      vm.handleConceptSelect(mockConcept)
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue') as any[]
      const emittedConcept = emitted[emitted.length - 1][0] as EventConcept
      expect(emittedConcept.INVALID_REASON).toBe('D')
    })
  })
})
