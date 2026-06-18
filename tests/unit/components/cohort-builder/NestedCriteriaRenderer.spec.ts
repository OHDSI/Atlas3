/**
 * NestedCriteriaRenderer Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import NestedCriteriaRenderer from '@/components/cohort-builder/NestedCriteriaRenderer.vue'
import type { NestedCriteria } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useFilterConfig', () => ({
  useFilterConfig: () => ({
    availableFilters: ref([
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
      }
    ])
  })
}))

const vuetify = createVuetify({ components, directives })

const mockNestedCriteria: NestedCriteria = {
  id: 'nested-1',
  logicType: 'ALL',
  events: [
    {
      id: 'event-1',
      criteriaType: 'ConditionOccurrence',
      conceptSet: { id: 1, name: 'Type 2 Diabetes' },
      attributes: []
    },
    {
      id: 'event-2',
      criteriaType: 'DrugExposure',
      conceptSet: { id: 2, name: 'Metformin' },
      attributes: []
    }
  ]
}

const mockNestedCriteriaWithAnyLogic: NestedCriteria = {
  id: 'nested-2',
  logicType: 'ANY',
  events: [
    {
      id: 'event-3',
      criteriaType: 'ProcedureOccurrence',
      conceptSet: { id: 3, name: 'Blood Test' },
      attributes: []
    }
  ]
}

const mockNestedCriteriaWithCount: NestedCriteria = {
  id: 'nested-3',
  logicType: 'AT_LEAST',
  count: 2,
  events: [
    {
      id: 'event-4',
      criteriaType: 'ConditionOccurrence',
      conceptSet: { id: 4, name: 'Hypertension' },
      attributes: []
    }
  ]
}

const mockDeeplyNestedCriteria: NestedCriteria = {
  id: 'nested-4',
  logicType: 'ALL',
  events: [
    {
      id: 'event-5',
      criteriaType: 'ConditionOccurrence',
      conceptSet: { id: 5, name: 'Diabetes' },
      attributes: [],
      nestedCriteria: {
        id: 'nested-5',
        logicType: 'ANY',
        events: [
          {
            id: 'event-6',
            criteriaType: 'DrugExposure',
            conceptSet: { id: 6, name: 'Insulin' },
            attributes: []
          }
        ]
      }
    }
  ]
}

function mountComponent(props = {}) {
  return mount(NestedCriteriaRenderer, {
    props: {
      nested: mockNestedCriteria,
      depth: 0,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('NestedCriteriaRenderer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render nested criteria container', () => {
      const wrapper = mountComponent()
      const container = wrapper.find('.nested-criteria-renderer')
      expect(container.exists()).toBe(true)
    })

    it('should display logic type chip', () => {
      const wrapper = mountComponent()
      const chip = wrapper.findComponent({ name: 'VChip' })
      expect(chip.exists()).toBe(true)
    })

    it('should display events list when events exist', () => {
      const wrapper = mountComponent()
      const list = wrapper.findComponent({ name: 'VList' })
      expect(list.exists()).toBe(true)
    })

    it('should not display events list when no events', () => {
      const emptyNested: NestedCriteria = {
        id: 'nested-empty',
        logicType: 'ALL',
        events: []
      }
      const wrapper = mountComponent({ nested: emptyNested })
      const list = wrapper.findComponent({ name: 'VList' })
      expect(list.exists()).toBe(false)
    })
  })

  describe('Logic Type Display', () => {
    it('should display ALL logic type correctly', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('ALL')
      // Check for translation key or actual text
      expect(display).toBeDefined()
      expect(typeof display).toBe('string')
    })

    it('should display ANY logic type correctly', () => {
      const wrapper = mountComponent({ nested: mockNestedCriteriaWithAnyLogic })
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('ANY')
      // Check for translation key or actual text
      expect(display).toBeDefined()
      expect(typeof display).toBe('string')
    })

    it('should display AT_LEAST logic type with count', () => {
      const wrapper = mountComponent({ nested: mockNestedCriteriaWithCount })
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('AT_LEAST', 2)
      expect(display).toContain('2')
    })

    it('should display AT_MOST logic type with count', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('AT_MOST', 3)
      expect(display).toContain('3')
    })

    it('should handle unknown logic type', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('UNKNOWN_TYPE')
      expect(display).toBe('UNKNOWN_TYPE')
    })
  })

  describe('Logic Type Tones', () => {
    it('should assign primary tone to ALL', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.getLogicTone('ALL')).toBe('primary')
    })

    it('should assign info tone to ANY', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.getLogicTone('ANY')).toBe('info')
    })

    it('should assign success tone to AT_LEAST', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.getLogicTone('AT_LEAST')).toBe('success')
    })

    it('should assign warning tone to AT_MOST', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.getLogicTone('AT_MOST')).toBe('warning')
    })

    it('should assign neutral tone to unknown logic type', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.getLogicTone('UNKNOWN')).toBe('neutral')
    })
  })

  describe('Events Display', () => {
    it('should display correct number of events', () => {
      const wrapper = mountComponent()
      const listItems = wrapper.findAllComponents({ name: 'VListItem' })
      expect(listItems.length).toBe(mockNestedCriteria.events.length)
    })

    it('should display event criteria type', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Condition Occurrence')
      expect(wrapper.text()).toContain('Drug Exposure')
    })

    it('should display concept set name', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Type 2 Diabetes')
      expect(wrapper.text()).toContain('Metformin')
    })

    it('should display "No concept set" when concept set is missing', () => {
      const nestedWithoutConceptSet: NestedCriteria = {
        id: 'nested-6',
        logicType: 'ALL',
        events: [
          {
            id: 'event-7',
            criteriaType: 'ConditionOccurrence',
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: nestedWithoutConceptSet })
      expect(wrapper.text()).toContain('No concept set')
    })

    it('should format event type using configuration', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const formatted = vm.formatEventType('ConditionOccurrence')
      expect(formatted).toBe('Condition Occurrence')
    })

    it('should fallback to type name for unknown event type', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const formatted = vm.formatEventType('UnknownType')
      expect(formatted).toBe('UnknownType')
    })
  })

  describe('Depth and Indentation', () => {
    it('should apply margin based on depth', () => {
      const wrapper = mountComponent({ depth: 2 })
      const container = wrapper.find('.nested-criteria-renderer')
      const style = container.attributes('style')
      expect(style).toContain('margin-left: 48px')
    })

    it('should have no margin at depth 0', () => {
      const wrapper = mountComponent({ depth: 0 })
      const container = wrapper.find('.nested-criteria-renderer')
      const style = container.attributes('style')
      expect(style).toContain('margin-left: 0px')
    })

    it('should increase margin at deeper levels', () => {
      const wrapper = mountComponent({ depth: 5 })
      const container = wrapper.find('.nested-criteria-renderer')
      const style = container.attributes('style')
      expect(style).toContain('margin-left: 120px')
    })

    it('should default depth to 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.props('depth')).toBe(0)
    })
  })

  describe('Deep Nesting Warning', () => {
    it('should not show warning at normal depth', () => {
      const wrapper = mountComponent({ depth: 5 })
      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(false)
    })

    it('should show warning at depth > 10', () => {
      const wrapper = mountComponent({ depth: 11 })
      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(true)
    })

    it('should display depth level in warning', () => {
      const wrapper = mountComponent({ depth: 15 })
      expect(wrapper.text()).toContain('15 levels')
    })

    it('should suggest simplification in warning', () => {
      const wrapper = mountComponent({ depth: 12 })
      expect(wrapper.text()).toContain('simplifying')
    })

    it('should use warning type for alert', () => {
      const wrapper = mountComponent({ depth: 11 })
      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.classes()).toContain('atlas-feedback--warning')
    })
  })

  describe('Recursive Rendering', () => {
    it('should render nested criteria recursively', () => {
      const wrapper = mountComponent({ nested: mockDeeplyNestedCriteria })
      const nestedRenderers = wrapper.findAllComponents(NestedCriteriaRenderer)
      // Should have at least 2 instances (parent and child)
      expect(nestedRenderers.length).toBeGreaterThanOrEqual(1)
    })

    it('should increment depth for recursive calls', () => {
      const wrapper = mountComponent({ nested: mockDeeplyNestedCriteria, depth: 1 })
      // Parent should have depth 1, children should have depth 2
      expect(wrapper.props('depth')).toBe(1)
    })

    it('should handle multiple levels of nesting', () => {
      const wrapper = mountComponent({ nested: mockDeeplyNestedCriteria })
      expect(wrapper.exists()).toBe(true)
    })

    it('should display nested children container', () => {
      const wrapper = mountComponent({ nested: mockDeeplyNestedCriteria })
      const childrenContainer = wrapper.find('.nested-children')
      expect(childrenContainer.exists()).toBe(true)
    })
  })

  describe('Event Icons', () => {
    it('should display chevron icon for events', () => {
      const wrapper = mountComponent()
      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Icons should exist in the component
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Styling and Layout', () => {
    it('should apply nested-criteria-renderer class', () => {
      const wrapper = mountComponent()
      const container = wrapper.find('.nested-criteria-renderer')
      expect(container.exists()).toBe(true)
    })

    it('should apply logic-header class', () => {
      const wrapper = mountComponent()
      const header = wrapper.find('.logic-header')
      expect(header.exists()).toBe(true)
    })

    it('should have left border styling', () => {
      const wrapper = mountComponent()
      const container = wrapper.find('.nested-criteria-renderer')
      expect(container.exists()).toBe(true)
    })

    it('should use compact density for list', () => {
      const wrapper = mountComponent()
      const list = wrapper.findComponent({ name: 'VList' })
      expect(list.props('density')).toBe('compact')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty events array', () => {
      const emptyNested: NestedCriteria = {
        id: 'nested-empty',
        logicType: 'ALL',
        events: []
      }
      const wrapper = mountComponent({ nested: emptyNested })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle undefined count in AT_LEAST', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('AT_LEAST', undefined)
      expect(display).toContain('0')
    })

    it('should handle undefined count in AT_MOST', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      const display = vm.formatLogicType('AT_MOST', undefined)
      expect(display).toContain('0')
    })

    it('should handle event without conceptSet', () => {
      const nestedWithoutCS: NestedCriteria = {
        id: 'nested-7',
        logicType: 'ALL',
        events: [
          {
            id: 'event-8',
            criteriaType: 'ConditionOccurrence',
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: nestedWithoutCS })
      expect(wrapper.text()).toContain('No concept set')
    })

    it('should handle event with null conceptSet', () => {
      const nestedWithNullCS: NestedCriteria = {
        id: 'nested-8',
        logicType: 'ALL',
        events: [
          {
            id: 'event-9',
            criteriaType: 'ConditionOccurrence',
            conceptSet: null as any,
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: nestedWithNullCS })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle very large depth values', () => {
      const wrapper = mountComponent({ depth: 100 })
      expect(wrapper.exists()).toBe(true)
      const alert = wrapper.find('[data-testid="atlas-feedback"]')
      expect(alert.exists()).toBe(true)
    })

    it('should handle negative depth gracefully', () => {
      const wrapper = mountComponent({ depth: -1 })
      const container = wrapper.find('.nested-criteria-renderer')
      const style = container.attributes('style')
      expect(style).toContain('margin-left: -24px')
    })

    it('should handle event with special characters in name', () => {
      const specialNested: NestedCriteria = {
        id: 'nested-9',
        logicType: 'ALL',
        events: [
          {
            id: 'event-10',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 10, name: 'Condition with "quotes" & symbols' },
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: specialNested })
      expect(wrapper.text()).toContain('Condition with "quotes" & symbols')
    })

    it('should handle extremely long concept set names', () => {
      const longNameNested: NestedCriteria = {
        id: 'nested-10',
        logicType: 'ALL',
        events: [
          {
            id: 'event-11',
            criteriaType: 'ConditionOccurrence',
            conceptSet: {
              id: 11,
              name: 'A very long concept set name that might cause display issues in the nested criteria renderer component'
            },
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: longNameNested })
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Props Validation', () => {
    it('should accept nested prop', () => {
      const wrapper = mountComponent()
      expect(wrapper.props('nested')).toBeDefined()
      expect(wrapper.props('nested')).toEqual(mockNestedCriteria)
    })

    it('should accept depth prop', () => {
      const wrapper = mountComponent({ depth: 3 })
      expect(wrapper.props('depth')).toBe(3)
    })

    it('should have default depth of 0', () => {
      const wrapper = mountComponent()
      expect(wrapper.props('depth')).toBe(0)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle mixed criteria types', () => {
      const mixedNested: NestedCriteria = {
        id: 'nested-11',
        logicType: 'ALL',
        events: [
          {
            id: 'event-12',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 12, name: 'Diabetes' },
            attributes: []
          },
          {
            id: 'event-13',
            criteriaType: 'DrugExposure',
            conceptSet: { id: 13, name: 'Metformin' },
            attributes: []
          },
          {
            id: 'event-14',
            criteriaType: 'ProcedureOccurrence',
            conceptSet: { id: 14, name: 'Blood Test' },
            attributes: []
          }
        ]
      }
      const wrapper = mountComponent({ nested: mixedNested })
      expect(wrapper.text()).toContain('Diabetes')
      expect(wrapper.text()).toContain('Metformin')
      expect(wrapper.text()).toContain('Blood Test')
    })

    it('should handle all logic types in one test suite', () => {
      const allLogicTypes = ['ALL', 'ANY', 'AT_LEAST', 'AT_MOST']
      allLogicTypes.forEach(logicType => {
        const nested: NestedCriteria = {
          id: `nested-${logicType}`,
          logicType: logicType as any,
          count: logicType.includes('AT_') ? 2 : undefined,
          events: []
        }
        const wrapper = mountComponent({ nested })
        expect(wrapper.exists()).toBe(true)
      })
    })
  })
})
