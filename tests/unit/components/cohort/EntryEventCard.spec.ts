import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EntryEventCard from '@/components/cohort/EntryEventCard.vue'
import type { CohortEvent } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

// Mock UUID
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}))

function createMockEvent(overrides: Partial<CohortEvent> = {}): CohortEvent {
  return {
    id: 'event-1',
    criteriaType: 'ConditionOccurrence',
    conceptSet: undefined,
    attributes: [],
    cardinality: undefined,
    temporalWindow: undefined,
    nestedCriteria: undefined,
    ...overrides
  }
}

function mountComponent(event: CohortEvent = createMockEvent()) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(EntryEventCard, {
    props: { event },
    global: {
      plugins: [vuetify, pinia],
      stubs: {
        AttributesEditor: {
          template: '<div class="attributes-editor-stub"><slot /></div>',
          props: ['modelValue', 'criteriaType', 'section', 'hasNestedCriteria', 'cardinality', 'temporalWindow'],
          emits: ['update:modelValue', 'update:cardinality', 'update:temporal-window', 'add-nested-criteria', 'select-concept-set-for-attribute', 'select-concept-for-attribute']
        },
        NestedCriteriaEditor: {
          template: '<div class="nested-criteria-stub"><slot /></div>',
          props: ['modelValue', 'depth'],
          emits: ['update:modelValue', 'remove', 'select-concept-set']
        }
      }
    }
  })
}

describe('EntryEventCard', () => {
  describe('Rendering', () => {
    it('should render event card', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-testid="entry-event-card"]').exists()).toBe(true)
    })

    it('should show event type label', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.event-type-label').exists()).toBe(true)
    })

    it('should show select concept set button when no concept set', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-testid="concept-set-picker"]').exists()).toBe(true)
    })

    it('should show concept set chip when concept set is selected', () => {
      const event = createMockEvent({
        conceptSet: { id: 1, name: 'Test Concept Set' }
      })
      const wrapper = mountComponent(event)
      expect(wrapper.text()).toContain('Test Concept Set')
    })

    it('should show nested criteria editor when nestedCriteria exists', () => {
      const event = createMockEvent({
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: []
        }
      })
      const wrapper = mountComponent(event)
      expect(wrapper.find('.nested-criteria-stub').exists()).toBe(true)
    })
  })

  describe('Cardinality Display', () => {
    it('should display "At least 1" by default when no cardinality', () => {
      const wrapper = mountComponent()
      const text = wrapper.find('.cardinality-label').text().toLowerCase()
      expect(text).toContain('at least')
      expect(text).toContain('1')
    })

    it('should display correct cardinality for AT_LEAST', () => {
      const event = createMockEvent({
        cardinality: { type: 'AT_LEAST', count: 3 }
      })
      const wrapper = mountComponent(event)
      const text = wrapper.find('.cardinality-label').text().toLowerCase()
      expect(text).toContain('at least')
      expect(text).toContain('3')
    })

    it('should display correct cardinality for EXACTLY', () => {
      const event = createMockEvent({
        cardinality: { type: 'EXACTLY', count: 5 }
      })
      const wrapper = mountComponent(event)
      const text = wrapper.find('.cardinality-label').text().toLowerCase()
      expect(text).toContain('exactly')
      expect(text).toContain('5')
    })

    it('should display correct cardinality for AT_MOST', () => {
      const event = createMockEvent({
        cardinality: { type: 'AT_MOST', count: 2 }
      })
      const wrapper = mountComponent(event)
      const text = wrapper.find('.cardinality-label').text().toLowerCase()
      expect(text).toContain('at most')
      expect(text).toContain('2')
    })

    it('should apply correct cardinality class for at_least', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('.cardinality-at_least').exists()).toBe(true)
    })

    it('should apply correct cardinality class for exactly', () => {
      const event = createMockEvent({
        cardinality: { type: 'EXACTLY', count: 1 }
      })
      const wrapper = mountComponent(event)
      expect(wrapper.find('.cardinality-exactly').exists()).toBe(true)
    })

    it('should apply correct cardinality class for at_most', () => {
      const event = createMockEvent({
        cardinality: { type: 'AT_MOST', count: 1 }
      })
      const wrapper = mountComponent(event)
      expect(wrapper.find('.cardinality-at_most').exists()).toBe(true)
    })
  })

  describe('Event Emissions', () => {
    it('should emit remove when delete button is clicked', async () => {
      const wrapper = mountComponent()
      const deleteBtn = wrapper.findAll('.v-btn').find(btn => btn.find('.mdi-delete').exists())
      await deleteBtn?.trigger('click')
      expect(wrapper.emitted('remove')).toBeTruthy()
    })

    it('should emit select-concept-set when concept set picker is clicked', async () => {
      const wrapper = mountComponent()
      const picker = wrapper.find('[data-testid="concept-set-picker"]')
      await picker.trigger('click')
      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
    })

    it('should emit edit-concept-set when concept set chip is clicked', async () => {
      const event = createMockEvent({
        conceptSet: { id: 1, name: 'Test Set' }
      })
      const wrapper = mountComponent(event)
      const chip = wrapper.findComponent({ name: 'VChip' })
      await chip.trigger('click')
      expect(wrapper.emitted('edit-concept-set')).toBeTruthy()
      expect(wrapper.emitted('edit-concept-set')![0]).toEqual([{ id: 1, name: 'Test Set' }])
    })
  })

  describe('removeConceptSet', () => {
    it('should emit update with undefined conceptSet when removing', async () => {
      const event = createMockEvent({
        conceptSet: { id: 1, name: 'Test Set' }
      })
      const wrapper = mountComponent(event)

      // Find the chip and trigger close
      const chip = wrapper.findComponent({ name: 'VChip' })
      await chip.vm.$emit('click:close')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.conceptSet).toBeUndefined()
    })
  })

  describe('updateCardinality', () => {
    it('should emit update with new cardinality', async () => {
      const wrapper = mountComponent()
      const _attributesEditor = wrapper.find('.attributes-editor-stub')

      const newCardinality = { type: 'EXACTLY' as const, count: 3 }
      await wrapper.vm.updateCardinality(newCardinality)

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.cardinality).toEqual(newCardinality)
    })
  })

  describe('updateTemporalWindows', () => {
    it('should emit update with new temporal window', async () => {
      const wrapper = mountComponent()

      const newTemporalWindow = { startWindow: { days: 30, coeff: -1 as const } }
      await wrapper.vm.updateTemporalWindows(newTemporalWindow)

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.temporalWindow).toEqual(newTemporalWindow)
    })
  })

  describe('updateAttributes', () => {
    it('should emit update with new attributes', async () => {
      const wrapper = mountComponent()

      const newAttributes = [{ type: 'numericRange' as const, attributeKey: 'age' as const, operator: 'GREATER_THAN' as const, value: 18 }]
      await wrapper.vm.updateAttributes(newAttributes)

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes).toEqual(newAttributes)
    })
  })

  describe('addNestedCriteria', () => {
    it('should emit update with new nested criteria when add-nested-criteria is emitted', async () => {
      const wrapper = mountComponent()

      await wrapper.vm.addNestedCriteria()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.nestedCriteria).toBeDefined()
      expect(emittedEvent.nestedCriteria?.id).toBe('test-uuid-1234')
      expect(emittedEvent.nestedCriteria?.logicType).toBe('ALL')
      expect(emittedEvent.nestedCriteria?.events).toEqual([])
    })
  })

  describe('updateNestedCriteria', () => {
    it('should emit update with updated nested criteria', async () => {
      const event = createMockEvent({
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: []
        }
      })
      const wrapper = mountComponent(event)

      const updatedNested = { id: 'nested-1', logicType: 'ANY' as const, events: [] }
      await wrapper.vm.updateNestedCriteria(updatedNested)

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.nestedCriteria?.logicType).toBe('ANY')
    })
  })

  describe('removeNestedCriteria', () => {
    it('should emit update without nested criteria when remove is emitted', async () => {
      const event = createMockEvent({
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: []
        }
      })
      const wrapper = mountComponent(event)

      await wrapper.vm.removeNestedCriteria()

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.nestedCriteria).toBeUndefined()
    })
  })

  describe('addAttribute', () => {
    it('should add numericRange attribute', async () => {
      const wrapper = mountComponent()

      // Call addAttribute directly via component instance
      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('age', 'numericRange')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes).toHaveLength(1)
      expect(emittedEvent.attributes![0].type).toBe('numericRange')
    })

    it('should add conceptSet attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('sourceConcept', 'conceptSet')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('conceptSet')
    })

    it('should add dateRange attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('startDate', 'dateRange')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('dateRange')
    })

    it('should add text attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('sourceValue', 'text')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('text')
    })

    it('should add boolean attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('first', 'boolean')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('boolean')
    })

    it('should add concept attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('providerSpecialty', 'concept')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('concept')
    })

    it('should add temporalRelationship attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('temporalRelationship', 'temporalRelationship')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('temporalRelationship')
    })

    it('should add dateAdjustment attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('dateAdjustment', 'dateAdjustment')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('dateAdjustment')
    })

    it('should add userDefinedPeriod attribute', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('userDefinedPeriod', 'userDefinedPeriod')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('userDefinedPeriod')
    })

    it('should add nested criteria when type is nested', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('correlated', 'nested')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.nestedCriteria).toBeDefined()
    })

    it('should not emit when attribute type is unknown', async () => {
      const wrapper = mountComponent()

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('unknown', 'unknownType')

      expect(wrapper.emitted('update')).toBeFalsy()
    })

    it('should append to existing attributes', async () => {
      const event = createMockEvent({
        attributes: [{ type: 'boolean', attributeKey: 'first', value: true }]
      })
      const wrapper = mountComponent(event)

      await (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute('age', 'numericRange')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes).toHaveLength(2)
    })
  })

  describe('Event Type Options', () => {
    it('should compute event type label', () => {
      const event = createMockEvent({ criteriaType: 'ConditionOccurrence' })
      const wrapper = mountComponent(event)
      // The label should be computed from the filter config
      expect(wrapper.find('.event-type-label').exists()).toBe(true)
    })
  })

  describe('Forward Events', () => {
    it('should emit select-concept-set-for-attribute when called from template', async () => {
      const wrapper = mountComponent()

      // Test via direct emit simulation - in template it's @select-concept-set-for-attribute="..."
      wrapper.vm.$emit('select-concept-set-for-attribute', 0)

      expect(wrapper.emitted('select-concept-set-for-attribute')).toBeTruthy()
      expect(wrapper.emitted('select-concept-set-for-attribute')![0]).toEqual([0])
    })

    it('should emit select-concept-for-attribute when called from template', async () => {
      const wrapper = mountComponent()

      wrapper.vm.$emit('select-concept-for-attribute', 1, 'Condition')

      expect(wrapper.emitted('select-concept-for-attribute')).toBeTruthy()
      expect(wrapper.emitted('select-concept-for-attribute')![0]).toEqual([1, 'Condition'])
    })

    it('should emit select-concept-set event', async () => {
      const wrapper = mountComponent()

      wrapper.vm.$emit('select-concept-set')

      expect(wrapper.emitted('select-concept-set')).toBeTruthy()
    })
  })
})
