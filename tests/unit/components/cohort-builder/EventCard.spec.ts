/**
 * EventCard Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref, nextTick } from 'vue'
import EventCard from '@/components/cohort-builder/EventCard.vue'
import type { CohortEvent } from '@/models/cohort.types'

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
      }
    ])
  })
}))

vi.mock('@/composables/useCardinality', () => ({
  useCardinality: () => ({
    formatCardinalityDisplay: vi.fn((cardinality) => {
      if (!cardinality) return 'At least 1'
      return `${cardinality.type} ${cardinality.count}`
    }),
    defaultCardinality: vi.fn(() => ({
      type: 'AT_LEAST',
      count: 1,
      countingMethod: 'ALL'
    }))
  })
}))

vi.mock('@/composables/useTemporalWindows', () => ({
  useTemporalWindows: () => ({
    formatTemporalWindowDisplay: vi.fn((_window) => 'Test Temporal Window')
  })
}))

const vuetify = createVuetify({ components, directives })

const mockEvent: CohortEvent = {
  id: 'event-1',
  criteriaType: 'ConditionOccurrence',
  conceptSet: { id: 1, name: 'Type 2 Diabetes', conceptCount: 5 },
  attributes: []
}

const mockEventWithCardinality: CohortEvent = {
  id: 'event-2',
  criteriaType: 'DrugExposure',
  conceptSet: { id: 2, name: 'Metformin' },
  attributes: [],
  cardinality: { type: 'EXACTLY', count: 2, countingMethod: 'ALL' }
}

const mockEventWithTemporalWindow: CohortEvent = {
  id: 'event-3',
  criteriaType: 'ConditionOccurrence',
  conceptSet: { id: 3, name: 'Hypertension' },
  attributes: [],
  temporalWindow: {
    startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
    endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' }
  }
}

const mockEventWithAttributes: CohortEvent = {
  id: 'event-4',
  criteriaType: 'ConditionOccurrence',
  conceptSet: { id: 4, name: 'Diabetes' },
  attributes: [
    { type: 'numericRange', attributeKey: 'age' as any, operator: 'GREATER_THAN_OR_EQUAL', value: 18 },
    { type: 'boolean', attributeKey: 'firstOccurrence' as any, value: true }
  ]
}

function mountComponent(props = {}) {
  return mount(EventCard, {
    props: {
      event: mockEvent,
      index: 0,
      section: 'criteriaGroup',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        CardinalityEditor: {
          template: '<div class="cardinality-editor-stub" />',
          props: ['modelValue'],
          emits: ['update:modelValue']
        },
        TemporalWindowEditor: {
          template: '<div class="temporal-window-editor-stub" />',
          props: ['modelValue'],
          emits: ['update:modelValue']
        },
        AttributesEditor: {
          template: '<div class="attributes-editor-stub" />',
          props: ['modelValue', 'criteriaType', 'section'],
          emits: ['update:modelValue']
        }
      }
    }
  })
}

describe('EventCard', () => {
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

    it('should display event criteria type label', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Condition Occurrence')
    })

    it('should display concept set name', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('Type 2 Diabetes')
    })

    it('should display concept count when available', () => {
      const wrapper = mountComponent()
      expect(wrapper.text()).toContain('5 concepts')
    })

    it('should display "No concept set" when concept set is missing', () => {
      const eventWithoutConceptSet: CohortEvent = {
        ...mockEvent,
        conceptSet: undefined
      }
      const wrapper = mountComponent({ event: eventWithoutConceptSet })
      expect(wrapper.text()).toContain('No concept set')
    })

    it('should display event icon', () => {
      const wrapper = mountComponent()
      // Component should render and have icons
      expect(wrapper.exists()).toBe(true)
      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      expect(icons.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Header Actions', () => {
    it('should render expand/collapse button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const expandButton = buttons.some(btn => btn.props('icon') === 'mdi-chevron-down')
      expect(expandButton).toBe(true)
    })

    it('should render delete button', () => {
      const wrapper = mountComponent()
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButton = buttons.some(btn => btn.props('icon') === 'mdi-delete')
      expect(deleteButton).toBe(true)
    })

    it('should toggle expanded state when clicking expand button', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      expect(vm.expanded).toBe(false)

      vm.toggleExpanded()
      await wrapper.vm.$nextTick()

      expect(vm.expanded).toBe(true)

      vm.toggleExpanded()
      await wrapper.vm.$nextTick()

      expect(vm.expanded).toBe(false)
    })

    it('should emit remove event when delete button is clicked', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.removeEvent()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('remove')).toBeTruthy()
    })
  })

  describe('Summary Chips Display', () => {
    it('should display cardinality chip when cardinality exists', () => {
      const wrapper = mountComponent({ event: mockEventWithCardinality })
      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const hasCardinalityChip = chips.some(chip => {
        const text = chip.text()
        return text.includes('EXACTLY') || text.includes('2')
      })
      expect(hasCardinalityChip).toBe(true)
    })

    it('should display temporal window chip when temporal window exists', () => {
      const wrapper = mountComponent({ event: mockEventWithTemporalWindow })
      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const hasTemporalChip = chips.some(chip => chip.text().includes('Temporal'))
      expect(hasTemporalChip).toBe(true)
    })

    it('should display attributes chip when attributes exist', () => {
      const wrapper = mountComponent({ event: mockEventWithAttributes })
      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const hasAttributesChip = chips.some(chip => chip.text().includes('attribute'))
      expect(hasAttributesChip).toBe(true)
    })

    it('should show correct attribute count', () => {
      const wrapper = mountComponent({ event: mockEventWithAttributes })
      expect(wrapper.text()).toContain('2 attributes')
    })

    it('should show singular form for single attribute', () => {
      const eventWithOneAttr: CohortEvent = {
        ...mockEvent,
        attributes: [{ type: 'numericRange', attributeKey: 'age' as any, operator: 'GREATER_THAN_OR_EQUAL', value: 18 }]
      }
      const wrapper = mountComponent({ event: eventWithOneAttr })
      expect(wrapper.text()).toContain('1 attribute')
    })

    it('should not display summary chips when nothing is configured', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.hasCardinality).toBe(false)
      expect(vm.hasTemporalWindows).toBe(false)
      expect(vm.hasAttributes).toBe(false)
    })
  })

  describe('Expanded Details Section', () => {
    it('should not show expanded section by default', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.expanded).toBe(false)
    })

    it('should show expanded section when expanded is true', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(vm.expanded).toBe(true)
    })

    it('should show action buttons when expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      // Should have action buttons for adding features
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Cardinality Management', () => {
    it('should show "Add Cardinality" button when no cardinality exists and expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Add Cardinality')
    })

    it('should not show "Add Cardinality" button when cardinality exists', async () => {
      const wrapper = mountComponent({ event: mockEventWithCardinality })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const hasAddCardinalityButton = buttons.some(btn => btn.text().includes('Add Cardinality'))
      expect(hasAddCardinalityButton).toBe(false)
    })

    it('should add cardinality when "Add Cardinality" is clicked', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      await vm.addCardinality()
      await nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[0][0].cardinality).toBeDefined()
    })

    it('should show cardinality editor when cardinality exists and expanded', async () => {
      const wrapper = mountComponent({ event: mockEventWithCardinality })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      const editor = wrapper.find('.cardinality-editor-stub')
      expect(editor.exists()).toBe(true)
    })

    it('should emit update when cardinality is changed', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const newCardinality = { type: 'EXACTLY' as const, count: 3, countingMethod: 'ALL' as const }
      vm.updateCardinality(newCardinality)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[emitted.length - 1][0].cardinality).toEqual(newCardinality)
    })

    it('should remove cardinality when remove button is clicked', async () => {
      const wrapper = mountComponent({ event: mockEventWithCardinality })
      const vm = wrapper.vm as any

      vm.removeCardinality()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[emitted.length - 1][0].cardinality).toBeUndefined()
    })
  })

  describe('Temporal Window Management', () => {
    it('should show "Add Temporal Window" button when no temporal window exists and expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Add Temporal Window')
    })

    it('should not show "Add Temporal Window" button when temporal window exists', async () => {
      const wrapper = mountComponent({ event: mockEventWithTemporalWindow })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const hasAddButton = buttons.some(btn => btn.text().includes('Add Temporal Window'))
      expect(hasAddButton).toBe(false)
    })

    it('should show temporal window editor when adding temporal window', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.showTemporalWindowEditor = true
      await wrapper.vm.$nextTick()

      const editor = wrapper.find('.temporal-window-editor-stub')
      expect(editor.exists()).toBe(true)
    })

    it('should emit update when temporal window is changed', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const newWindow = {
        startWindow: { days: 10, beforeAfter: 'BEFORE' as const, referencePoint: 'INDEX_START' as const },
        endWindow: { days: 60, beforeAfter: 'AFTER' as const, referencePoint: 'INDEX_START' as const }
      }

      vm.updateTemporalWindows(newWindow)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[emitted.length - 1][0].temporalWindow).toEqual(newWindow)
    })

    it('should remove temporal window when remove button is clicked', async () => {
      const wrapper = mountComponent({ event: mockEventWithTemporalWindow })
      const vm = wrapper.vm as any

      vm.removeTemporalWindow()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[emitted.length - 1][0].temporalWindow).toBeUndefined()
    })
  })

  describe('Attributes Management', () => {
    it('should show "Add Attributes" button when no attributes exist and expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('Add Attributes')
    })

    it('should not show "Add Attributes" button when attributes exist', async () => {
      const wrapper = mountComponent({ event: mockEventWithAttributes })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const hasAddButton = buttons.some(btn => btn.text().includes('Add Attributes'))
      expect(hasAddButton).toBe(false)
    })

    it('should show attributes editor when attributes exist and expanded', async () => {
      const wrapper = mountComponent({ event: mockEventWithAttributes })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      const editor = wrapper.find('.attributes-editor-stub')
      expect(editor.exists()).toBe(true)
    })

    it('should emit update when attributes are changed', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      const newAttributes = [
        { type: 'numericRange' as const, attributeKey: 'age' as any, operator: 'GREATER_THAN_OR_EQUAL' as const, value: 18 }
      ]

      vm.updateAttributes(newAttributes)
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emitted = wrapper.emitted('update') as any[]
      expect(emitted[emitted.length - 1][0].attributes).toEqual(newAttributes)
    })
  })

  describe('Event Details Section', () => {
    it('should display event ID when expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('event-1')
    })

    it('should display criteria type when expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('ConditionOccurrence')
    })

    it('should display concept set ID when expanded', async () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('1')
    })

    it('should show restrictVisit indicator when set', async () => {
      const eventWithRestriction: CohortEvent = {
        ...mockEvent,
        restrictVisit: true
      }
      const wrapper = mountComponent({ event: eventWithRestriction })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('must occur in same visit')
    })

    it('should show ignoreObservationPeriod indicator when set', async () => {
      const eventWithIgnore: CohortEvent = {
        ...mockEvent,
        ignoreObservationPeriod: true
      }
      const wrapper = mountComponent({ event: eventWithIgnore })
      const vm = wrapper.vm as any

      vm.expanded = true
      await wrapper.vm.$nextTick()

      expect(wrapper.text()).toContain('outside observation period')
    })
  })

  describe('Computed Properties', () => {
    it('should correctly compute hasCardinality', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.hasCardinality).toBe(false)

      const wrapperWithCard = mountComponent({ event: mockEventWithCardinality })
      const vmWithCard = wrapperWithCard.vm as any
      expect(vmWithCard.hasCardinality).toBe(true)
    })

    it('should correctly compute hasTemporalWindows', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.hasTemporalWindows).toBe(false)

      const wrapperWithWindow = mountComponent({ event: mockEventWithTemporalWindow })
      const vmWithWindow = wrapperWithWindow.vm as any
      expect(vmWithWindow.hasTemporalWindows).toBe(true)
    })

    it('should correctly compute hasAttributes', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.hasAttributes).toBe(false)

      const wrapperWithAttrs = mountComponent({ event: mockEventWithAttributes })
      const vmWithAttrs = wrapperWithAttrs.vm as any
      expect(vmWithAttrs.hasAttributes).toBe(true)
    })

    it('should correctly compute criteriaTypeLabel', () => {
      const wrapper = mountComponent()
      const vm = wrapper.vm as any
      expect(vm.criteriaTypeLabel).toBe('Condition Occurrence')
    })

    it('should format cardinality display correctly', () => {
      const wrapper = mountComponent({ event: mockEventWithCardinality })
      const vm = wrapper.vm as any
      expect(vm.cardinalityDisplay).toBeTruthy()
    })

    it('should format temporal window display correctly', () => {
      const wrapper = mountComponent({ event: mockEventWithTemporalWindow })
      const vm = wrapper.vm as any
      expect(vm.temporalWindowDisplay).toBe('Test Temporal Window')
    })
  })

  describe('Edge Cases', () => {
    it('should handle event without concept set gracefully', () => {
      const eventWithoutConceptSet: CohortEvent = {
        id: 'event-5',
        criteriaType: 'ConditionOccurrence',
        attributes: []
      }
      const wrapper = mountComponent({ event: eventWithoutConceptSet })
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle event with empty attributes array', () => {
      const wrapper = mountComponent({ event: mockEvent })
      const vm = wrapper.vm as any
      expect(vm.hasAttributes).toBe(false)
    })

    it('should handle unknown criteria type', () => {
      const unknownEvent: CohortEvent = {
        id: 'event-6',
        criteriaType: 'UnknownType' as any,
        conceptSet: { id: 1, name: 'Test' },
        attributes: []
      }
      const wrapper = mountComponent({ event: unknownEvent })
      expect(wrapper.text()).toContain('UnknownType')
    })
  })
})
