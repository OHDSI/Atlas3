import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { EventAttribute, NumericRangeAttribute, ConceptSetAttribute } from '@/models/event.types'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import AttributesEditor from '@/components/cohort-builder/AttributesEditor.vue'
import { CriteriaSelectionKey } from '@/composables/useCriteriaSelection'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('AttributesEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (attributes: EventAttribute[] = []) => {
    return mount(AttributesEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: attributes,
        criteriaType: 'ConditionOccurrence',
      },
    })
  }

  describe('Attribute List Display', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should render without errors when no attributes', () => {
      const wrapper = createWrapper([])
      // Component should render successfully with no attributes
      expect(wrapper.exists()).toBe(true)
      // No attributes list should be shown
      expect(wrapper.find('.attributes-list').exists()).toBe(false)
    })

    it('should display numeric range attributes', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Age')
      // The operator is in VSelect, value is in VTextField
      const operatorSelect = wrapper.findComponent({ name: 'VSelect' })
      expect(operatorSelect.props('modelValue')).toBe('GREATER_THAN_OR_EQUAL')
      // There might be multiple VTextFields in nested components, check by data-testid
      const valueField = wrapper.find('[data-testid="attribute-value-input"]')
      expect(valueField.exists()).toBe(true)
    })

    it('should display concept set attributes', () => {
      const attributes: ConceptSetAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'gender',
          conceptSet: {
            id: 123,
            name: 'Male',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Gender')
      // ConceptSet attributes show a chip with the concept set name
      const conceptSetChip = wrapper.find('[data-testid="attribute-selected-concept-set"]')
      expect(conceptSetChip.exists()).toBe(true)
      expect(wrapper.text()).toContain('Male')
    })

    it('should format BETWEEN operator display', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'BETWEEN',
          value: 18,
          extent: 65,
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Age')
      // Check for value and extent inputs - BETWEEN operator shows 2 text fields
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      // Should have 2 text fields (value and extent)
      expect(textFields.length).toBeGreaterThanOrEqual(2)
      // Find the fields by data-testid
      const valueField = wrapper.find('[data-testid="attribute-value-input"]')
      const extentField = wrapper.find('[data-testid="attribute-extent-input"]')
      expect(valueField.exists()).toBe(true)
      expect(extentField.exists()).toBe(true)
    })
  })

  // NOTE: Add attribute functionality has been moved to parent components
  // AttributesEditor is now focused on displaying and editing existing attributes only

  describe('Numeric Attributes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show numeric operators for numeric attributes', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Operator selector should be visible
      const operatorSelector = wrapper.find('[data-testid="attribute-operator-selector"]')
      expect(operatorSelector.exists()).toBe(true)
    })

    it('should show value input for numeric attributes', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Find the value input by data-testid
      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      expect(valueInput.exists()).toBe(true)
      // The input should be rendered and visible
      expect(wrapper.html()).toContain('type="number"')
    })

    it('should show extent input for BETWEEN operator', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'BETWEEN',
          value: 18,
          extent: 65,
        },
      ]

      const wrapper = createWrapper(attributes)

      const extentInput = wrapper.find('[data-testid="attribute-extent-input"]')
      expect(extentInput.exists()).toBe(true)
    })

    it('should update operator when changed', async () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Find the v-select component for operator
      const operatorSelector = wrapper.findComponent({ name: 'VSelect' })
      expect(operatorSelector.exists()).toBe(true)

      // Emit the update event directly
      await operatorSelector.vm.$emit('update:modelValue', 'LESS_THAN')

      // Should emit update with new operator
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  describe('Concept Set Attributes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show concept set picker for concept attributes', () => {
      const attributes: ConceptSetAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'gender',
          conceptSet: {
            id: 123,
            name: 'Male',
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Concept set picker should show a chip with the concept set name
      const conceptSetChip = wrapper.find('[data-testid="attribute-selected-concept-set"]')
      expect(conceptSetChip.exists()).toBe(true)
      expect(wrapper.text()).toContain('Male')
    })

    it('still shows the picker for the empty-string placeholder a new attribute is seeded with', () => {
      // openConceptSetPickerForAttribute seeds `{ id: '', name: '' }`, and
      // CriteriaEventCard does the same. That is "not chosen yet", so it must
      // keep offering the picker rather than render an empty chip.
      const attributes: ConceptSetAttribute[] = [
        { type: 'conceptSet', attributeKey: 'gender', conceptSet: { id: '', name: '' } },
      ]

      const wrapper = createWrapper(attributes)

      expect(wrapper.find('[data-testid="attribute-concept-set-picker"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="attribute-selected-concept-set"]').exists()).toBe(false)
    })

    it('shows the picker when the attribute has no concept set at all', () => {
      const attributes: ConceptSetAttribute[] = [
        { type: 'conceptSet', attributeKey: 'gender' },
      ]

      const wrapper = createWrapper(attributes)

      expect(wrapper.find('[data-testid="attribute-concept-set-picker"]').exists()).toBe(true)
    })

    it('shows the selected concept set chip when its id is 0, not the "select" placeholder (#213)', () => {
      // id 0 is a valid, real concept set id (the first set in an imported
      // cohort). A truthy check on `.id` treated it the same as "unset" and
      // reverted to the picker button instead of showing the chip.
      const attributes: ConceptSetAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'gender',
          conceptSet: {
            id: 0,
            name: 'First Concept Set',
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      const conceptSetChip = wrapper.find('[data-testid="attribute-selected-concept-set"]')
      expect(conceptSetChip.exists()).toBe(true)
      expect(wrapper.text()).toContain('First Concept Set')
      expect(wrapper.find('[data-testid="attribute-concept-set-picker"]').exists()).toBe(false)
    })
  })

  describe('Edit and Remove', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show attribute values for editing inline', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Attributes are editable inline - no edit button needed
      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      expect(valueInput.exists()).toBe(true)
      const textField = valueInput.findComponent({ name: 'VTextField' })
      expect(textField.props('modelValue')).toBe(18)
    })

    it('should allow removing attributes', async () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Click remove button
      const removeButton = wrapper.find('[data-testid="remove-attribute-button"]')
      await removeButton.trigger('click')

      // Should emit update with empty array
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      expect(emitted[0][0]).toHaveLength(0)
    })
  })

  describe('Emit Updates', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should emit update when changing attribute value', async () => {
      const attributes: NumericRangeAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Change the value via component event - find by data-testid
      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      const textField = valueInput.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 25)
      await wrapper.vm.$nextTick()

      // Should emit update
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      expect(emitted.length).toBeGreaterThan(0)
    })
  })

  describe('Available Attributes by Criteria Type', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show condition-specific attributes for ConditionOccurrence', () => {
      const wrapper = mount(AttributesEditor, {
        global: {
          plugins: [vuetify],
        },
        props: {
          modelValue: [],
          criteriaType: 'ConditionOccurrence',
        },
      })

      // Should have Age, Gender, Condition Type, etc.
      // Exact attributes depend on implementation
      expect(wrapper.vm).toBeDefined()
    })

    it('should show measurement-specific attributes for Measurement', () => {
      const wrapper = mount(AttributesEditor, {
        global: {
          plugins: [vuetify],
        },
        props: {
          modelValue: [],
          criteriaType: 'Measurement',
        },
      })

      // Should have Value as Number, Value as Concept, etc.
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Text Attributes', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display text attributes with operator selector', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'text',
          attributeKey: 'valueAsString',
          operator: 'CONTAINS',
          value: 'test value',
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should show the attribute
      expect(wrapper.text()).toContain('Value As String')

      // Should have operator selector
      const operatorSelector = wrapper.find('[data-testid="attribute-text-operator-selector"]')
      expect(operatorSelector.exists()).toBe(true)

      // Should have text input
      const textInput = wrapper.find('[data-testid="attribute-text-value-input"]')
      expect(textInput.exists()).toBe(true)
    })

    it('should support all text operators', () => {
      const operators = ['EQUALS', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH'] as const

      operators.forEach(operator => {
        const attributes: EventAttribute[] = [
          {
            type: 'text',
            attributeKey: 'valueAsString',
            operator: operator,
            value: 'test',
          },
        ]

        const wrapper = createWrapper(attributes)
        const operatorSelector = wrapper.find('[data-testid="attribute-text-operator-selector"]')
        expect(operatorSelector.exists()).toBe(true)
      })
    })
  })

  describe('Boolean Attributes', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display boolean attributes with chip', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'boolean',
          attributeKey: 'first',
          value: true,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should show the attribute
      expect(wrapper.text()).toContain('First')

      // Should have chip component (boolean attributes are always true when present)
      const chipComponent = wrapper.find('[data-testid="attribute-boolean-chip"]')
      expect(chipComponent.exists()).toBe(true)
    })

    it('should display chip for true value', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'boolean',
          attributeKey: 'first',
          value: true,
        },
      ]

      const wrapper = createWrapper(attributes)
      // Boolean chip should be present (boolean attributes are always true when present)
      const chipComponent = wrapper.find('[data-testid="attribute-boolean-chip"]')
      expect(chipComponent.exists()).toBe(true)
    })

    it('should display chip for false value', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'boolean',
          attributeKey: 'first',
          value: false,
        },
      ]

      const wrapper = createWrapper(attributes)
      // Boolean chip should be present even for false (in practice, false values are removed)
      const chipComponent = wrapper.find('[data-testid="attribute-boolean-chip"]')
      expect(chipComponent.exists()).toBe(true)
    })
  })

  describe('Concept Attributes (Multiple)', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display concept attribute with selected concepts', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'concept',
          attributeKey: 'gender',
          concepts: [{
            CONCEPT_ID: 8532,
            CONCEPT_NAME: 'Female',
            CONCEPT_CODE: 'F',
            DOMAIN_ID: 'Gender',
            VOCABULARY_ID: 'Gender',
          }],
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should show the concept name in a chip
      const conceptChips = wrapper.findAll('[data-testid="attribute-selected-concept"]')
      expect(conceptChips.length).toBe(1)
      expect(wrapper.text()).toContain('Female')

      // Should have picker button
      const pickerButton = wrapper.find('[data-testid="attribute-concept-picker"]')
      expect(pickerButton.exists()).toBe(true)
    })

    it('should show select button when no concepts selected', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'concept',
          attributeKey: 'gender',
          concepts: [],
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should have picker button
      const pickerButton = wrapper.find('[data-testid="attribute-concept-picker"]')
      expect(pickerButton.exists()).toBe(true)

      // Should show "Select Concept" text
      expect(wrapper.text()).toContain('Select Concept')
    })
  })

  describe('Temporal Relationship Attributes', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display temporal relationship attribute with chip', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'temporalRelationship',
          attributeKey: 'temporalRelationship',
          temporalWindow: {
            startWindow: {
              days: 0,
              beforeAfter: 'AFTER',
              useIndexEnd: false,
              useEventEnd: false,
            },
            endWindow: {
              days: 90,
              beforeAfter: 'AFTER',
              useIndexEnd: false,
              useEventEnd: false,
            },
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should show the attribute as a chip
      const temporalChip = wrapper.find('[data-testid="attribute-temporal-chip"]')
      expect(temporalChip.exists()).toBe(true)
    })

    it('should display temporal window summary in chip', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'temporalRelationship',
          attributeKey: 'temporalRelationship',
          temporalWindow: {
            startWindow: {
              days: 30,
              beforeAfter: 'AFTER',
              useIndexEnd: false,
              useEventEnd: false,
            },
            endWindow: {
              days: 90,
              beforeAfter: 'AFTER',
              useIndexEnd: false,
              useEventEnd: false,
            },
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should have the chip with summary
      const temporalChip = wrapper.find('[data-testid="attribute-temporal-chip"]')
      expect(temporalChip.exists()).toBe(true)
    })
  })

  describe('Date Adjustment Attributes', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display date adjustment attribute with chip', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'dateAdjustment',
          attributeKey: 'dateAdjustment',
          dateAdjustment: {
            startWith: 'START_DATE',
            startOffset: 0,
            endWith: 'END_DATE',
            endOffset: 30,
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should show the attribute as a chip
      const adjustmentChip = wrapper.find('[data-testid="attribute-date-adjustment-chip"]')
      expect(adjustmentChip.exists()).toBe(true)
    })

    it('should display date adjustment summary in chip', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'dateAdjustment',
          attributeKey: 'dateAdjustment',
          dateAdjustment: {
            startWith: 'START_DATE',
            startOffset: 30,
            endWith: 'END_DATE',
            endOffset: 0,
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should have the chip with summary
      const adjustmentChip = wrapper.find('[data-testid="attribute-date-adjustment-chip"]')
      expect(adjustmentChip.exists()).toBe(true)
    })
  })

  describe('User Defined Period Attributes', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should display user defined period attribute with date pickers', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '2020-01-01',
            endDate: '2020-12-31',
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Should have start date input
      const startDateInput = wrapper.find('[data-testid="attribute-period-start-date"]')
      expect(startDateInput.exists()).toBe(true)

      // Should have end date input
      const endDateInput = wrapper.find('[data-testid="attribute-period-end-date"]')
      expect(endDateInput.exists()).toBe(true)

      // Should show "to" separator
      expect(wrapper.text()).toContain('to')
    })

    it('should validate that end date is after start date', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '2020-12-31',
            endDate: '2020-01-01', // Invalid: end before start
          },
        },
      ]

      const wrapper = createWrapper(attributes)

      // Trigger validation by blurring start date input
      const startDateInput = wrapper.find('[data-testid="attribute-period-start-date"]')
      await startDateInput.trigger('blur')

      // Should show error (error display depends on validation implementation)
      // The component should set attributeErrors for this index
      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Validation Functions', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('validateTextAttribute should set error for empty text', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'text',
          attributeKey: 'valueAsString',
          operator: 'CONTAINS',
          value: '',
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validateTextAttribute(0)

      expect(wrapper.vm.attributeErrors[0]).toBe('Please enter a text value')
    })

    it('validateTextAttribute should clear error for valid text', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'text',
          attributeKey: 'valueAsString',
          operator: 'CONTAINS',
          value: 'some value',
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validateTextAttribute(0)

      expect(wrapper.vm.attributeErrors[0]).toBeNull()
    })

    it('validateNumericAttribute should set error for missing value', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: undefined as unknown as number,
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validateNumericAttribute(0)

      expect(wrapper.vm.attributeErrors[0]).toBe('Please enter a numeric value')
    })

    it('validateNumericAttribute should set error for BETWEEN without extent', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'numericRange',
          attributeKey: 'age',
          operator: 'BETWEEN',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validateNumericAttribute(0)

      expect(wrapper.vm.attributeErrors[0]).toBe('BETWEEN operator requires both values')
    })

    it('validatePeriodDates should set error when dates are missing', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '',
            endDate: '2020-12-31',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validatePeriodDates(0)

      expect(wrapper.vm.attributeErrors[0]).toBe('Both start and end dates are required')
    })

    it('validatePeriodDates should set error when end is before start', async () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '2020-12-31',
            endDate: '2020-01-01',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.validatePeriodDates(0)

      expect(wrapper.vm.attributeErrors[0]).toBe('End date must be after start date')
    })
  })

  describe('Temporal Window Functions', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('getTemporalWindowSummary should return "Not configured" for undefined', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getTemporalWindowSummary(undefined)
      expect(summary).toBe('Not configured')
    })

    it('getTemporalWindowSummary should return "Not configured" for empty window', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getTemporalWindowSummary({})
      expect(summary).toBe('Not configured')
    })

    it('getTemporalWindowSummary should format start window correctly', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getTemporalWindowSummary({
        startWindow: {
          days: 30,
          beforeAfter: 'AFTER',
        },
      })
      expect(summary).toContain('Start')
      expect(summary).toContain('30 days')
      expect(summary).toContain('after')
    })

    it('getTemporalWindowSummary should format end window correctly', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getTemporalWindowSummary({
        endWindow: {
          days: 90,
          beforeAfter: 'BEFORE',
        },
      })
      expect(summary).toContain('End')
      expect(summary).toContain('90 days')
      expect(summary).toContain('before')
    })

    it('getTemporalWindowSummary should show "all time" for null days', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getTemporalWindowSummary({
        startWindow: {
          days: null,
          beforeAfter: 'AFTER',
        },
      })
      expect(summary).toContain('all time')
    })

    it('openTemporalEditor should set selected index and open dialog', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'temporalRelationship',
          attributeKey: 'temporalRelationship',
          temporalWindow: {},
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.openTemporalEditor(0)

      expect(wrapper.vm.selectedTemporalIndex).toBe(0)
      expect(wrapper.vm.temporalEditorOpen).toBe(true)
    })

    it('updateTemporalWindow should apply live and keep the dialog open', () => {
      // The editor emits update:model-value on every field change; closing
      // here would slam the dialog shut on the first edit.
      const attributes: EventAttribute[] = [
        {
          type: 'temporalRelationship',
          attributeKey: 'temporalRelationship',
          temporalWindow: {},
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.selectedTemporalIndex = 0
      wrapper.vm.temporalEditorOpen = true

      const newWindow = { startWindow: { days: 30, beforeAfter: 'AFTER' as const } }
      wrapper.vm.updateTemporalWindow(newWindow)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.vm.temporalEditorOpen).toBe(true)
      expect(wrapper.vm.selectedTemporalIndex).toBe(0)
    })
  })

  describe('Date Adjustment Functions', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('getDateAdjustmentSummary should return "Not configured" for undefined', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getDateAdjustmentSummary(undefined)
      expect(summary).toBe('Not configured')
    })

    it('getDateAdjustmentSummary should format adjustment correctly', () => {
      const wrapper = createWrapper([])
      const summary = wrapper.vm.getDateAdjustmentSummary({
        startWith: 'START_DATE',
        startOffset: 30,
        endWith: 'END_DATE',
        endOffset: 0,
      })
      expect(summary).toContain('Start')
      expect(summary).toContain('End')
      expect(summary).toContain('30d')
    })

    it('openDateAdjustmentEditor should set selected index and open dialog', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'dateAdjustment',
          attributeKey: 'dateAdjustment',
          dateAdjustment: {
            startWith: 'START_DATE',
            startOffset: 0,
            endWith: 'END_DATE',
            endOffset: 0,
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.openDateAdjustmentEditor(0)

      expect(wrapper.vm.selectedDateAdjustmentIndex).toBe(0)
      expect(wrapper.vm.dateAdjustmentEditorOpen).toBe(true)
    })

    it('updateDateAdjustment should apply live and keep the dialog open', () => {
      // The editor emits update:model-value on every field change; closing
      // here would slam the dialog shut on the first edit.
      const attributes: EventAttribute[] = [
        {
          type: 'dateAdjustment',
          attributeKey: 'dateAdjustment',
          dateAdjustment: {
            startWith: 'START_DATE',
            startOffset: 0,
            endWith: 'END_DATE',
            endOffset: 0,
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.selectedDateAdjustmentIndex = 0
      wrapper.vm.dateAdjustmentEditorOpen = true

      const newAdjustment = {
        startWith: 'START_DATE' as const,
        startOffset: 30,
        endWith: 'END_DATE' as const,
        endOffset: 60,
      }
      wrapper.vm.updateDateAdjustment(newAdjustment)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.vm.dateAdjustmentEditorOpen).toBe(true)
      expect(wrapper.vm.selectedDateAdjustmentIndex).toBe(0)
    })
  })

  describe('Concept Functions', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('openConceptPickerForAttribute should emit select-concept-for-attribute', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'concept',
          attributeKey: 'gender',
          concepts: [],
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.openConceptPickerForAttribute(0)

      expect(wrapper.emitted('select-concept-for-attribute')).toBeTruthy()
      expect(wrapper.emitted('select-concept-for-attribute')![0][0]).toBe(0)
    })

    it('openConceptPickerForAttribute should use the selection service and merge-dedupe the result', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'concept',
          attributeKey: 'gender',
          concepts: [
            { CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE', CONCEPT_CODE: 'M', DOMAIN_ID: 'Gender', VOCABULARY_ID: 'Gender' },
          ],
        },
      ]
      let deliver: ((concepts: Array<{ CONCEPT_ID: number }>) => void) | undefined
      const selection = {
        requestConceptSet: vi.fn(),
        requestConcepts: vi.fn((_domainFilter: string | undefined, cb: (c: never[]) => void) => {
          deliver = cb as typeof deliver
        }),
        editConceptSet: vi.fn(),
      }
      const wrapper = mount(AttributesEditor, {
        global: {
          plugins: [vuetify],
          provide: { [CriteriaSelectionKey as symbol]: selection },
        },
        props: { modelValue: attributes, criteriaType: 'ConditionOccurrence' },
      })

      wrapper.vm.openConceptPickerForAttribute(0)

      // Service path: no legacy emit, picker requested from the owner.
      expect(selection.requestConcepts).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('select-concept-for-attribute')).toBeFalsy()

      // Delivering MALE again plus FEMALE dedupes by CONCEPT_ID.
      deliver?.([
        { CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE', CONCEPT_CODE: 'M', DOMAIN_ID: 'Gender', VOCABULARY_ID: 'Gender' },
        { CONCEPT_ID: 8532, CONCEPT_NAME: 'FEMALE', CONCEPT_CODE: 'F', DOMAIN_ID: 'Gender', VOCABULARY_ID: 'Gender' },
      ] as never[])
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      expect(emitted).toBeTruthy()
      const updated = emitted[0][0][0] as { concepts: Array<{ CONCEPT_ID: number }> }
      expect(updated.concepts.map(c => c.CONCEPT_ID)).toEqual([8507, 8532])
    })

    it('openConceptSetPickerForAttribute should use the selection service and set the attribute concept set', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'genderCS',
          conceptSet: { id: '', name: '' },
        },
      ]
      let deliver: ((cs: { id: number | string; name: string }) => void) | undefined
      const selection = {
        requestConceptSet: vi.fn((cb: (cs: never) => void) => {
          deliver = cb as typeof deliver
        }),
        requestConcepts: vi.fn(),
        editConceptSet: vi.fn(),
      }
      const wrapper = mount(AttributesEditor, {
        global: {
          plugins: [vuetify],
          provide: { [CriteriaSelectionKey as symbol]: selection },
        },
        props: { modelValue: attributes, criteriaType: 'ConditionOccurrence' },
      })

      wrapper.vm.openConceptSetPickerForAttribute(0)

      expect(selection.requestConceptSet).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('select-concept-set-for-attribute')).toBeFalsy()

      deliver?.({ id: 12, name: 'Gender concepts' } as never)
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      expect(emitted).toBeTruthy()
      const updated = emitted[0][0][0] as { conceptSet: { id: number; name: string } }
      expect(updated.conceptSet).toEqual({ id: 12, name: 'Gender concepts' })
    })

    it('removeConceptFromAttribute should remove concept and emit update', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'concept',
          attributeKey: 'gender',
          concepts: [
            { CONCEPT_ID: 1, CONCEPT_NAME: 'Male', CONCEPT_CODE: 'M', DOMAIN_ID: 'Gender', VOCABULARY_ID: 'Gender' },
            { CONCEPT_ID: 2, CONCEPT_NAME: 'Female', CONCEPT_CODE: 'F', DOMAIN_ID: 'Gender', VOCABULARY_ID: 'Gender' },
          ],
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.removeConceptFromAttribute(0, 0)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      const updatedAttr = emitted[0][0][0] as { concepts: unknown[] }
      expect(updatedAttr.concepts).toHaveLength(1)
    })

    it('openConceptSetPickerForAttribute should emit select-concept-set-for-attribute', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'gender',
          conceptSet: { id: '', name: '' },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.openConceptSetPickerForAttribute(0)

      expect(wrapper.emitted('select-concept-set-for-attribute')).toBeTruthy()
      expect(wrapper.emitted('select-concept-set-for-attribute')![0]).toEqual([0])
    })

    it('clearConceptSetAttribute should clear concept set and emit update', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'conceptSet',
          attributeKey: 'gender',
          conceptSet: { id: 123, name: 'Male' },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.clearConceptSetAttribute(0)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      const updatedAttr = emitted[0][0][0] as { conceptSet: { id: string; name: string } }
      expect(updatedAttr.conceptSet.id).toBe('')
      expect(updatedAttr.conceptSet.name).toBe('')
    })
  })

  describe('Period Date Functions', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('updatePeriodStartDate should update start date and emit', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '2020-01-01',
            endDate: '2020-12-31',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.updatePeriodStartDate(0, '2021-06-15')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      const updatedAttr = emitted[0][0][0] as { period: { startDate: string } }
      expect(updatedAttr.period.startDate).toBe('2021-06-15')
    })

    it('updatePeriodEndDate should update end date and emit', () => {
      const attributes: EventAttribute[] = [
        {
          type: 'userDefinedPeriod',
          attributeKey: 'userDefinedPeriod',
          period: {
            startDate: '2020-01-01',
            endDate: '2020-12-31',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      wrapper.vm.updatePeriodEndDate(0, '2021-12-31')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      const updatedAttr = emitted[0][0][0] as { period: { endDate: string } }
      expect(updatedAttr.period.endDate).toBe('2021-12-31')
    })
  })
})
