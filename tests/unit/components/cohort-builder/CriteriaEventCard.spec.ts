import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CriteriaEventCard from '@/components/cohort-builder/CriteriaEventCard.vue'
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

function mountComponent(event: CohortEvent = createMockEvent(), props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(CriteriaEventCard, {
    props: { event, ...props },
    global: {
      plugins: [vuetify, pinia],
      stubs: {
        AttributesEditor: {
          template: '<div class="attributes-editor-stub"><slot /></div>',
          props: ['modelValue', 'criteriaType', 'section', 'hasNestedCriteria'],
          emits: ['update:modelValue', 'add-nested-criteria', 'select-concept-set-for-attribute', 'select-concept-for-attribute']
        },
        GroupCriteriaUI: {
          name: 'GroupCriteriaUI',
          template: '<div class="nested-criteria-stub"><slot /></div>',
          props: ['modelValue', 'depth'],
          emits: ['update:modelValue', 'remove', 'select-concept-set']
        }
      }
    }
  })
}

describe('CriteriaEventCard', () => {
  describe('Rendering', () => {
    it('should render event card', () => {
      const wrapper = mountComponent()
      expect(wrapper.find('[data-testid="criteria-event-card"]').exists()).toBe(true)
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

    it('renders the concept-set picker inside the card header', () => {
      const wrapper = mountComponent()
      const header = wrapper.find('.event-header')
      expect(header.find('[data-testid="event-concept-set-field"]').exists()).toBe(true)
    })

    it('should render GroupCriteriaUI when nestedCriteria exists', () => {
      const event = createMockEvent({
        nestedCriteria: {
          id: 'nested-1',
          logicType: 'ALL',
          events: []
        }
      })
      const wrapper = mountComponent(event)
      expect(wrapper.findComponent({ name: 'GroupCriteriaUI' }).exists()).toBe(true)
    })

    it('forwards a nested GroupCriteriaUI select-concept-set (number payload) as select-concept-set-nested', () => {
      const event = createMockEvent({
        nestedCriteria: { id: 'nested-1', logicType: 'ALL', events: [] },
      })
      const wrapper = mountComponent(event)
      const group = wrapper.findComponent({ name: 'GroupCriteriaUI' })
      group.vm.$emit('select-concept-set', 2)
      expect(wrapper.emitted('select-concept-set-nested')![0]).toEqual([2])
    })

    it('forwards a nested GroupCriteriaUI select-concept-set (object payload) using eventIndex', () => {
      const event = createMockEvent({
        nestedCriteria: { id: 'nested-1', logicType: 'ALL', events: [] },
      })
      const wrapper = mountComponent(event)
      const group = wrapper.findComponent({ name: 'GroupCriteriaUI' })
      group.vm.$emit('select-concept-set', { eventIndex: 3, nestedEventIndex: 1 })
      expect(wrapper.emitted('select-concept-set-nested')![0]).toEqual([3])
    })

    it('hides the cardinality sidebar by default and shows it when enabled', () => {
      expect(mountComponent().find('.cardinality-sidebar').exists()).toBe(false)
      const withCardinality = mountComponent(createMockEvent(), { showCardinality: true })
      expect(withCardinality.find('.cardinality-sidebar').exists()).toBe(true)
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

  describe('cardinality', () => {
    it('emits update with the chosen cardinality type', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.setCardinalityType('EXACTLY')

      expect(wrapper.emitted('update')).toBeTruthy()
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.cardinality?.type).toBe('EXACTLY')
      expect(emittedEvent.cardinality?.count).toBe(1)
    })

    it('emits update with the chosen cardinality count', async () => {
      const wrapper = mountComponent()
      await wrapper.vm.setCardinalityCount(3)

      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.cardinality?.count).toBe(3)
    })
  })

  describe('temporal window', () => {
    it('emits update with a new temporal window', async () => {
      const wrapper = mountComponent()

      const newTemporalWindow = {
        startWindow: { days: 30, beforeAfter: 'BEFORE' as const, referencePoint: 'INDEX_START' as const },
      }
      await wrapper.vm.updateTemporalWindow(newTemporalWindow)

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
    const addAttr = (wrapper: ReturnType<typeof mountComponent>, key: string, type: string) =>
      (wrapper.vm as unknown as { addAttribute: (key: string, type: string) => void }).addAttribute(key, type)

    it('should add numericRange attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'age', 'numericRange')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes).toHaveLength(1)
      expect(emittedEvent.attributes![0].type).toBe('numericRange')
    })

    it('should add conceptSet attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'sourceConcept', 'conceptSet')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('conceptSet')
    })

    it('should add dateRange attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'startDate', 'dateRange')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('dateRange')
    })

    it('should add text attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'sourceValue', 'text')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('text')
    })

    it('should add boolean attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'first', 'boolean')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('boolean')
    })

    it('should add concept attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'providerSpecialty', 'concept')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('concept')
    })

    it('should add temporalRelationship attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'temporalRelationship', 'temporalRelationship')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('temporalRelationship')
    })

    it('should add dateAdjustment attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'dateAdjustment', 'dateAdjustment')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('dateAdjustment')
    })

    it('should add userDefinedPeriod attribute', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'userDefinedPeriod', 'userDefinedPeriod')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes![0].type).toBe('userDefinedPeriod')
    })

    it('should add nested criteria when type is nested', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'correlated', 'nested')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.nestedCriteria).toBeDefined()
    })

    it('should not emit when attribute type is unknown', async () => {
      const wrapper = mountComponent()
      await addAttr(wrapper, 'unknown', 'unknownType')
      expect(wrapper.emitted('update')).toBeFalsy()
    })

    it('should append to existing attributes', async () => {
      const event = createMockEvent({
        attributes: [{ type: 'boolean', attributeKey: 'first', value: true }]
      })
      const wrapper = mountComponent(event)
      await addAttr(wrapper, 'age', 'numericRange')
      const emittedEvent = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emittedEvent.attributes).toHaveLength(2)
    })
  })

  describe('criteria options (allow outside observation period / restrict visit)', () => {
    it('hides the options row by default and shows it when showCriteriaOptions is set', () => {
      expect(mountComponent().find('[data-testid="criteria-options"]').exists()).toBe(false)
      const withOptions = mountComponent(createMockEvent(), { showCriteriaOptions: true })
      expect(withOptions.find('[data-testid="criteria-options"]').exists()).toBe(true)
    })

    it('emits update toggling ignoreObservationPeriod', async () => {
      const wrapper = mountComponent(createMockEvent({ ignoreObservationPeriod: false }), {
        showCriteriaOptions: true,
      })
      await (wrapper.vm as unknown as { setIgnoreObservationPeriod: (v: boolean) => void })
        .setIgnoreObservationPeriod(true)
      const emitted = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emitted.ignoreObservationPeriod).toBe(true)
    })

    it('emits update toggling restrictVisit', async () => {
      const wrapper = mountComponent(createMockEvent({ restrictVisit: false }), {
        showCriteriaOptions: true,
      })
      await (wrapper.vm as unknown as { setRestrictVisit: (v: boolean) => void })
        .setRestrictVisit(true)
      const emitted = wrapper.emitted('update')![0][0] as CohortEvent
      expect(emitted.restrictVisit).toBe(true)
    })
  })

  describe('Event Type Options', () => {
    it('should compute event type label', () => {
      const event = createMockEvent({ criteriaType: 'ConditionOccurrence' })
      const wrapper = mountComponent(event)
      expect(wrapper.find('.event-type-label').exists()).toBe(true)
    })
  })
})
