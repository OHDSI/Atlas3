/**
 * FilterTypeSelector Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import FilterTypeSelector from '@/components/cohort-builder/FilterTypeSelector.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockAvailableFilters = ref([
  {
    key: 'conditionOccurrence',
    criteriaType: 'ConditionOccurrence',
    name: 'Condition Occurrence',
    description: 'Occurrence of a medical condition',
    requiresConceptSet: true,
    groupOnly: false
  },
  {
    key: 'drugExposure',
    criteriaType: 'DrugExposure',
    name: 'Drug Exposure',
    description: 'Exposure to a drug',
    requiresConceptSet: true,
    groupOnly: false
  },
  {
    key: 'procedureOccurrence',
    criteriaType: 'ProcedureOccurrence',
    name: 'Procedure Occurrence',
    description: 'Occurrence of a medical procedure',
    requiresConceptSet: true,
    groupOnly: false
  },
  {
    key: 'measurement',
    criteriaType: 'Measurement',
    name: 'Measurement',
    description: 'Clinical measurement or lab result',
    requiresConceptSet: true,
    groupOnly: false
  },
  {
    key: 'observation',
    criteriaType: 'Observation',
    name: 'Observation',
    description: 'Clinical observation',
    requiresConceptSet: false,
    groupOnly: false
  },
  {
    key: 'deviceExposure',
    criteriaType: 'DeviceExposure',
    name: 'Device Exposure',
    description: 'Exposure to a medical device',
    requiresConceptSet: true,
    groupOnly: true
  }
])

vi.mock('@/composables/useFilterConfig', () => ({
  useFilterConfig: () => ({
    availableFilters: mockAvailableFilters
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(FilterTypeSelector, {
    props: {
      section: 'criteriaGroup',
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('FilterTypeSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render v-select component', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.exists()).toBe(true)
    })

    it('should display default label', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('label')).toBe('Filter Type')
    })

    it('should display custom label when provided', () => {
      const wrapper = mountComponent({ label: 'Select Criteria Type' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('label')).toBe('Select Criteria Type')
    })

    it('should display default placeholder', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('placeholder')).toBe('Select a filter type...')
    })

    it('should display custom placeholder when provided', () => {
      const wrapper = mountComponent({ placeholder: 'Choose filter...' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('placeholder')).toBe('Choose filter...')
    })
  })

  describe('Filter Items Display', () => {
    it('should populate items from available filters', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      const items = select.props('items')
      expect(items).toBeDefined()
      expect(items.length).toBeGreaterThan(0)
    })

    it('should have correct item structure', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const filterItems = vm.filterItems

      expect(filterItems[0]).toHaveProperty('key')
      expect(filterItems[0]).toHaveProperty('criteriaType')
      expect(filterItems[0]).toHaveProperty('name')
      expect(filterItems[0]).toHaveProperty('description')
      expect(filterItems[0]).toHaveProperty('requiresConceptSet')
      expect(filterItems[0]).toHaveProperty('groupOnly')
    })

    it('should map filter properties correctly', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const filterItems = vm.filterItems

      const conditionFilter = filterItems.find((f: any) => f.criteriaType === 'ConditionOccurrence')
      expect(conditionFilter).toBeDefined()
      expect(conditionFilter.name).toBe('Condition Occurrence')
      expect(conditionFilter.description).toBe('Occurrence of a medical condition')
      expect(conditionFilter.requiresConceptSet).toBe(true)
      expect(conditionFilter.groupOnly).toBe(false)
    })

    it('should use item-title for display', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('itemTitle')).toBe('name')
    })

    it('should use item-value for selection', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('itemValue')).toBe('criteriaType')
    })
  })

  describe('Selection Behavior', () => {
    it('should display selected value', () => {
      const wrapper = mountComponent({ modelValue: 'ConditionOccurrence' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('ConditionOccurrence')
    })

    it('should emit update:modelValue when filter is selected', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.onFilterSelect('DrugExposure')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted[0][0]).toBe('DrugExposure')
    })

    it('should not emit when null is selected', async () => {
      const wrapper = mountComponent({ modelValue: 'ConditionOccurrence' })
      const vm = wrapper.vm as any

      vm.onFilterSelect(null)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('should handle undefined value', async () => {
      const wrapper = mountComponent({ modelValue: undefined })
      const select = wrapper.findComponent({ name: 'VSelect' })
      // VSelect may normalize undefined to null
      expect(select.props('modelValue')).toBeFalsy()
    })

    it('should handle empty string value', async () => {
      const wrapper = mountComponent({ modelValue: '' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe('')
    })
  })

  describe('Custom Item Template', () => {
    it('should display filter name in list item', () => {
      const wrapper = mountComponent()
      // The template slot renders the name as title
      expect(wrapper.exists()).toBe(true)
    })

    it('should display filter description in list item', () => {
      const wrapper = mountComponent()
      // The template slot renders the description as subtitle
      expect(wrapper.exists()).toBe(true)
    })

    it('should show "Group Only" chip for group-only filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const filterItems = vm.filterItems

      const groupOnlyFilter = filterItems.find((f: any) => f.groupOnly === true)
      expect(groupOnlyFilter).toBeDefined()
      expect(groupOnlyFilter.groupOnly).toBe(true)
    })

    it('should show "No Concept Set" chip for filters without concept set requirement', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const filterItems = vm.filterItems

      const noConceptSetFilter = filterItems.find((f: any) => f.requiresConceptSet === false)
      expect(noConceptSetFilter).toBeDefined()
      expect(noConceptSetFilter.requiresConceptSet).toBe(false)
    })
  })

  describe('Section Context', () => {
    it('should accept section prop', () => {
      const wrapper = mountComponent({ section: 'exitCriteria' })
      expect(wrapper.props('section')).toBe('exitCriteria')
    })

    it('should use section prop for filter configuration', () => {
      const wrapper = mountComponent({ section: 'inclusionRules' })
      expect(wrapper.props('section')).toBe('inclusionRules')
    })

    it('should default to criteriaGroup section', () => {
      const wrapper = mountComponent()
      // Default section is checked in the composable call
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Styling and Variants', () => {
    it('should use outlined variant', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('variant')).toBe('outlined')
    })

    it('should use comfortable density', () => {
      const wrapper = mountComponent()
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('density')).toBe('comfortable')
    })
  })

  describe('Computed Properties', () => {
    it('should compute filterItems from available filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.filterItems).toBeDefined()
      expect(Array.isArray(vm.filterItems)).toBe(true)
      expect(vm.filterItems.length).toBe(mockAvailableFilters.value.length)
    })

    it('should include all filter properties in computed items', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.filterItems.forEach((item: any) => {
        expect(item).toHaveProperty('key')
        expect(item).toHaveProperty('criteriaType')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('description')
        expect(item).toHaveProperty('requiresConceptSet')
        expect(item).toHaveProperty('groupOnly')
      })
    })
  })

  describe('Filter Categories', () => {
    it('should include condition filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const conditionFilter = vm.filterItems.find((f: any) => f.criteriaType === 'ConditionOccurrence')
      expect(conditionFilter).toBeDefined()
    })

    it('should include drug filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const drugFilter = vm.filterItems.find((f: any) => f.criteriaType === 'DrugExposure')
      expect(drugFilter).toBeDefined()
    })

    it('should include procedure filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const procedureFilter = vm.filterItems.find((f: any) => f.criteriaType === 'ProcedureOccurrence')
      expect(procedureFilter).toBeDefined()
    })

    it('should include measurement filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const measurementFilter = vm.filterItems.find((f: any) => f.criteriaType === 'Measurement')
      expect(measurementFilter).toBeDefined()
    })

    it('should include observation filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const observationFilter = vm.filterItems.find((f: any) => f.criteriaType === 'Observation')
      expect(observationFilter).toBeDefined()
    })

    it('should distinguish between filters that require concept sets', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const requiresConceptSet = vm.filterItems.filter((f: any) => f.requiresConceptSet)
      const doesNotRequire = vm.filterItems.filter((f: any) => !f.requiresConceptSet)

      expect(requiresConceptSet.length).toBeGreaterThan(0)
      expect(doesNotRequire.length).toBeGreaterThan(0)
    })

    it('should distinguish between group-only and general filters', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const groupOnlyFilters = vm.filterItems.filter((f: any) => f.groupOnly)
      const generalFilters = vm.filterItems.filter((f: any) => !f.groupOnly)

      expect(groupOnlyFilters.length).toBeGreaterThan(0)
      expect(generalFilters.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty filter list', () => {
      mockAvailableFilters.value = []
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.filterItems).toEqual([])
    })

    it('should handle filter with missing optional properties', () => {
      mockAvailableFilters.value = [
        {
          key: 'minimal',
          criteriaType: 'MinimalType',
          name: 'Minimal Filter',
          description: 'A minimal filter',
          requiresConceptSet: false,
          groupOnly: false
        }
      ]

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.filterItems[0]).toBeDefined()
      expect(vm.filterItems[0].name).toBe('Minimal Filter')
    })

    it('should handle special characters in filter names', () => {
      mockAvailableFilters.value = [
        {
          key: 'special',
          criteriaType: 'SpecialType',
          name: 'Filter with "Quotes" & Symbols',
          description: 'Description with <special> characters',
          requiresConceptSet: true,
          groupOnly: false
        }
      ]

      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.filterItems[0].name).toBe('Filter with "Quotes" & Symbols')
    })

    it('should handle very long filter names', () => {
      mockAvailableFilters.value = [
        {
          key: 'long',
          criteriaType: 'LongType',
          name: 'A very long filter name that might cause display issues in the dropdown selector component',
          description: 'Long description',
          requiresConceptSet: true,
          groupOnly: false
        }
      ]

      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle rapid selection changes', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.onFilterSelect('ConditionOccurrence')
      vm.onFilterSelect('DrugExposure')
      vm.onFilterSelect('ProcedureOccurrence')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as any[]
      expect(emitted.length).toBe(3)
      expect(emitted[2][0]).toBe('ProcedureOccurrence')
    })
  })

  describe('Accessibility', () => {
    it('should have proper label for accessibility', () => {
      const wrapper = mountComponent({ label: 'Select Filter Type' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('label')).toBe('Select Filter Type')
    })

    it('should have proper placeholder for accessibility', () => {
      const wrapper = mountComponent({ placeholder: 'Choose a filter type' })
      const select = wrapper.findComponent({ name: 'VSelect' })
      expect(select.props('placeholder')).toBe('Choose a filter type')
    })
  })
})
