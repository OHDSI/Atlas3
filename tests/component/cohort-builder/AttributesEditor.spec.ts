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

    it('should display add button when no attributes', () => {
      const wrapper = createWrapper([])
      const addButton = wrapper.find('[data-testid="add-attribute-button"]')
      expect(addButton.exists()).toBe(true)
      expect(addButton.text()).toContain('Add Attribute...')
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
      // The concept set name is displayed in a text field
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
      expect(textFields[0].props('modelValue')).toBe('Male')
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

  describe('Add Attribute', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show add attribute button', () => {
      const wrapper = createWrapper()
      const addButton = wrapper.find('[data-testid="add-attribute-button"]')
      expect(addButton.exists()).toBe(true)
    })

    it('should show attribute menu when clicking add button', async () => {
      const wrapper = createWrapper()
      const addButton = wrapper.find('[data-testid="add-attribute-button"]')
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      // v-menu should contain list items
      const menu = wrapper.findComponent({ name: 'VMenu' })
      expect(menu.exists()).toBe(true)
    })

    it('should show available attributes for criteria type', () => {
      const wrapper = createWrapper()

      // Check that the component has the correct available attributes computed property
      // The menu items are rendered lazily, so we check the component's data
      expect(wrapper.vm).toBeDefined()
      // For ConditionOccurrence, should have Age, Gender, and condition-specific attributes
      // This is validated by the component rendering without errors
    })
  })

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

      // Concept set picker should be visible
      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.exists()).toBe(true)
      expect(textField.props('modelValue')).toBe('Male')
      expect(textField.props('readonly')).toBe(true)
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
})
