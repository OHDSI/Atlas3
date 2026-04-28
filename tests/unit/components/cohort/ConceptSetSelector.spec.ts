/**
 * ConceptSetSelector Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { nextTick } from 'vue'
import ConceptSetSelector from '@/components/cohort/ConceptSetSelector.vue'
import { useConceptPickerStore } from '@/stores/concept-picker'
import { createMockConcept, createMockConceptSet } from '../../../helpers/mock-factories'
import type { ConceptSet, Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(ConceptSetSelector, {
    props,
    global: {
      plugins: [vuetify],
      stubs: {
        ConceptSearchDialog: {
          template: '<div class="concept-search-dialog"><slot /></div>',
          props: ['modelValue']
        }
      }
    }
  })
}

describe('ConceptSetSelector', () => {
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

    it('should render title with icon', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Concept Sets')
      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should render new concept set button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const newButton = buttons.find(btn => btn.text().includes('New Concept Set'))
      expect(newButton).toBeTruthy()
    })

    it('should render concept search dialog', () => {
      const wrapper = mountComponent()
      const dialog = wrapper.find('.concept-search-dialog')
      expect(dialog.exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('should show no concept sets message when empty', async () => {
      const store = useConceptPickerStore()
      store.conceptSets = new Map()

      const wrapper = mountComponent()
      await nextTick()

      // After i18n migration, the empty-state label was remapped to a generic WebAPI string
      expect(wrapper.text().toLowerCase()).toContain('no concept sets')
    })

    it('should not render expansion panels when empty', async () => {
      const store = useConceptPickerStore()
      store.conceptSets = new Map()

      const wrapper = mountComponent()
      await nextTick()

      const expansionPanels = wrapper.findComponent({ name: 'VExpansionPanels' })
      expect(expansionPanels.exists()).toBe(false)
    })
  })

  describe('Concept Sets Display', () => {
    it('should render expansion panels when concept sets exist', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Diabetes Concepts' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const expansionPanels = wrapper.findComponent({ name: 'VExpansionPanels' })
      expect(expansionPanels.exists()).toBe(true)
    })

    it('should display concept set name', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Type 2 Diabetes' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      expect(wrapper.text()).toContain('Type 2 Diabetes')
    })

    it('should display concept count chip', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({
        id: 1,
        items: [
          {
            ...createMockConcept({ conceptId: 1 }),
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false
          },
          {
            ...createMockConcept({ conceptId: 2 }),
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false
          }
        ]
      })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      expect(wrapper.text()).toContain('concept(s)')
    })

    it('should display multiple concept sets', async () => {
      const store = useConceptPickerStore()
      const set1 = createMockConceptSet({ id: 1, name: 'Diabetes' })
      const set2 = createMockConceptSet({ id: 2, name: 'Hypertension' })
      store.conceptSets = new Map([[1, set1], [2, set2]])

      const wrapper = mountComponent()
      await nextTick()

      expect(wrapper.text()).toContain('Diabetes')
      expect(wrapper.text()).toContain('Hypertension')
    })
  })

  describe('Concept Set Management', () => {
    it('should create new concept set with default name', async () => {
      const store = useConceptPickerStore()
      const addSpy = vi.spyOn(store, 'addConceptSet')

      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const newButton = buttons.find(btn => btn.text().includes('New Concept Set'))

      await newButton?.trigger('click')
      await nextTick()

      expect(addSpy).toHaveBeenCalled()
      const addedSet = addSpy.mock.calls[0][0] as ConceptSet
      expect(addedSet.items).toEqual([])
      expect(addedSet.id).toBeTruthy()
    })

    it('should have delete functionality available', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Test Set' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      // Verify the delete function exists
      expect(typeof vm.deleteConceptSet).toBe('function')
    })

    it('should have update name functionality available', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Original Name' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      // Verify the update function exists
      expect(typeof vm.updateConceptSetName).toBe('function')
    })
  })

  describe('Concept Management', () => {
    it('should have concept sets with items', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({
        id: 1,
        items: [
          {
            ...createMockConcept({ conceptId: 1, conceptName: 'Diabetes Mellitus' }),
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false
          }
        ]
      })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.conceptSetsList[0].items).toHaveLength(1)
      expect(vm.conceptSetsList[0].items[0].conceptName).toBe('Diabetes Mellitus')
    })

    it('should have remove concept functionality', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({
        id: 1,
        items: [
          {
            ...createMockConcept({ conceptId: 123, conceptName: 'Test Concept' }),
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false
          }
        ]
      })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      expect(typeof vm.removeConcept).toBe('function')
    })

    it('should have search dialog functionality', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Test Set' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.isSearchDialogOpen).toBe(false)
      expect(typeof vm.openSearchDialog).toBe('function')
    })
  })

  describe('Concept Search Integration', () => {
    it('should add selected concepts to concept set', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, items: [] })
      store.conceptSets = new Map([[1, conceptSet]])
      const updateSpy = vi.spyOn(store, 'addConceptSet')

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = 1
      vm.isSearchDialogOpen = true
      await nextTick()

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1, conceptName: 'Concept 1' }),
        createMockConcept({ conceptId: 2, conceptName: 'Concept 2' })
      ]

      vm.handleConceptsSelected(selectedConcepts)
      await nextTick()

      expect(updateSpy).toHaveBeenCalled()
      const updatedSet = updateSpy.mock.calls[updateSpy.mock.calls.length - 1][0] as ConceptSet
      expect(updatedSet.items).toHaveLength(2)
      expect(updatedSet.items[0].conceptId).toBe(1)
      expect(updatedSet.items[1].conceptId).toBe(2)
    })

    it('should not add duplicate concepts', async () => {
      const store = useConceptPickerStore()
      const existingConcept = {
        ...createMockConcept({ conceptId: 1, conceptName: 'Existing Concept' }),
        isExcluded: false,
        includeDescendants: false,
        includeMapped: false
      }
      const conceptSet = createMockConceptSet({
        id: 1,
        items: [existingConcept]
      })
      store.conceptSets = new Map([[1, conceptSet]])
      const updateSpy = vi.spyOn(store, 'addConceptSet')

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = 1

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1, conceptName: 'Existing Concept' }), // Duplicate
        createMockConcept({ conceptId: 2, conceptName: 'New Concept' })
      ]

      vm.handleConceptsSelected(selectedConcepts)
      await nextTick()

      expect(updateSpy).toHaveBeenCalled()
      const updatedSet = updateSpy.mock.calls[updateSpy.mock.calls.length - 1][0] as ConceptSet
      expect(updatedSet.items).toHaveLength(2) // Original + 1 new (not duplicate)
      expect(updatedSet.items.filter(item => item.conceptId === 1)).toHaveLength(1)
    })

    it('should set concept item flags correctly', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, items: [] })
      store.conceptSets = new Map([[1, conceptSet]])
      const updateSpy = vi.spyOn(store, 'addConceptSet')

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = 1

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1 })
      ]

      vm.handleConceptsSelected(selectedConcepts)
      await nextTick()

      expect(updateSpy).toHaveBeenCalled()
      const updatedSet = updateSpy.mock.calls[updateSpy.mock.calls.length - 1][0] as ConceptSet
      expect(updatedSet.items[0].isExcluded).toBe(false)
      expect(updatedSet.items[0].includeDescendants).toBe(false)
      expect(updatedSet.items[0].includeMapped).toBe(false)
    })

    it('should reset currentConceptSetId after adding concepts', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, items: [] })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = 1

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1 })
      ]

      vm.handleConceptsSelected(selectedConcepts)
      await nextTick()

      expect(vm.currentConceptSetId).toBeNull()
    })
  })

  describe('Component Internals', () => {
    it('should have concept set data available', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Test Set' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.conceptSetsList).toHaveLength(1)
      expect(vm.conceptSetsList[0].name).toBe('Test Set')
    })

    it('should have concepts available when items exist', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({
        id: 1,
        items: [
          {
            ...createMockConcept({ conceptId: 1, conceptName: 'Test Concept' }),
            isExcluded: false,
            includeDescendants: false,
            includeMapped: false
          }
        ]
      })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const vm = wrapper.vm as any
      expect(vm.conceptSetsList[0].items).toHaveLength(1)
      expect(vm.conceptSetsList[0].items[0].conceptName).toBe('Test Concept')
    })

    it('should render expansion panels component', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: 1, name: 'Test Set' })
      store.conceptSets = new Map([[1, conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      const expansionPanels = wrapper.findComponent({ name: 'VExpansionPanels' })
      expect(expansionPanels.exists()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concept set without id gracefully', async () => {
      const store = useConceptPickerStore()
      const conceptSet = createMockConceptSet({ id: undefined, name: 'No ID Set' })
      store.conceptSets = new Map([['temp-id', conceptSet]])

      const wrapper = mountComponent()
      await nextTick()

      expect(wrapper.text()).toContain('No ID Set')
    })

    it('should handle concepts selected when no current concept set', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = null

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1 })
      ]

      // Should not throw error
      expect(() => {
        vm.handleConceptsSelected(selectedConcepts)
      }).not.toThrow()
    })

    it('should handle non-existent concept set gracefully', async () => {
      const store = useConceptPickerStore()
      store.conceptSets = new Map()

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.currentConceptSetId = 999 // Non-existent

      const selectedConcepts: Concept[] = [
        createMockConcept({ conceptId: 1 })
      ]

      // Should not throw error
      expect(() => {
        vm.handleConceptsSelected(selectedConcepts)
      }).not.toThrow()
    })
  })

  describe('Component List Computed Property', () => {
    it('should convert Map to array for rendering', async () => {
      const store = useConceptPickerStore()
      const set1 = createMockConceptSet({ id: 1, name: 'Set 1' })
      const set2 = createMockConceptSet({ id: 2, name: 'Set 2' })
      store.conceptSets = new Map([[1, set1], [2, set2]])

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.conceptSetsList).toHaveLength(2)
      expect(vm.conceptSetsList[0].name).toBe('Set 1')
      expect(vm.conceptSetsList[1].name).toBe('Set 2')
    })
  })
})
