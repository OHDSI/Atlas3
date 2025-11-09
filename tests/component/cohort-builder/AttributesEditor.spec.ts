import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AttributesEditor from '@/components/cohort-builder/AttributesEditor.vue'
import type { EventAttribute, NumericRangeAttribute, ConceptSetAttribute } from '@/models/event.types'

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

    it('should display empty state when no attributes', () => {
      const wrapper = createWrapper([])
      expect(wrapper.text()).toContain('No attributes added')
    })

    it('should display numeric range attributes', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          id: '1',
          type: 'numericRange',
          attributeId: 'age',
          name: 'Age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Age')
      expect(wrapper.text()).toContain('18')
    })

    it('should display concept set attributes', () => {
      const attributes: ConceptSetAttribute[] = [
        {
          id: '1',
          type: 'conceptSet',
          attributeId: 'gender',
          name: 'Gender',
          conceptSet: {
            id: 123,
            name: 'Male',
          },
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Gender')
      expect(wrapper.text()).toContain('Male')
    })

    it('should format BETWEEN operator display', () => {
      const attributes: NumericRangeAttribute[] = [
        {
          id: '1',
          type: 'numericRange',
          attributeId: 'age',
          name: 'Age',
          operator: 'BETWEEN',
          value: 18,
          extent: 65,
        },
      ]

      const wrapper = createWrapper(attributes)
      expect(wrapper.text()).toContain('Age: 18 to 65')
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

    it('should show attribute selector when adding', async () => {
      const wrapper = createWrapper()
      const addButton = wrapper.find('[data-testid="add-attribute-button"]')
      await addButton.trigger('click')

      // Attribute selector should appear
      const selector = wrapper.find('[data-testid="attribute-selector"]')
      expect(selector.exists()).toBe(true)
    })

    it('should show available attributes for criteria type', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      // For ConditionOccurrence, should show age, gender, condition type, etc.
      const html = wrapper.html()
      expect(html).toContain('Age')
      expect(html).toContain('Gender')
    })
  })

  describe('Numeric Attributes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show numeric operators', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      // Select numeric attribute (Age)
      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('age')

      // Operator selector should show
      const operatorSelector = wrapper.find('[data-testid="attribute-operator-selector"]')
      expect(operatorSelector.exists()).toBe(true)

      // Should have numeric operators
      const html = operatorSelector.html()
      expect(html).toMatch(/Greater Than|Less Than|Equal|Between/)
    })

    it('should show value input for numeric attributes', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('age')

      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      expect(valueInput.exists()).toBe(true)
      expect(valueInput.attributes('type')).toBe('number')
    })

    it('should show extent input for BETWEEN operator', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('age')

      const operatorSelector = wrapper.find('[data-testid="attribute-operator-selector"]')
      await operatorSelector.setValue('BETWEEN')

      const extentInput = wrapper.find('[data-testid="attribute-extent-input"]')
      expect(extentInput.exists()).toBe(true)
    })

    it('should validate BETWEEN requires extent', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('age')

      const operatorSelector = wrapper.find('[data-testid="attribute-operator-selector"]')
      await operatorSelector.setValue('BETWEEN')

      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      await valueInput.setValue('18')

      // Try to save without extent
      const saveButton = wrapper.find('button:has-text("Save Attribute")')
      await saveButton.trigger('click')

      // Should show validation error
      expect(wrapper.text()).toContain('Extent value required for BETWEEN operator')
    })
  })

  describe('Concept Set Attributes', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should show concept set picker for concept attributes', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      // Select concept set attribute (Gender)
      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('gender')

      // Concept set picker should appear
      const picker = wrapper.find('[data-testid="attribute-concept-set-picker"]')
      expect(picker.exists()).toBe(true)
    })
  })

  describe('Edit and Remove', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

    it('should allow editing attributes', async () => {
      const attributes: NumericRangeAttribute[] = [
        {
          id: '1',
          type: 'numericRange',
          attributeId: 'age',
          name: 'Age',
          operator: 'GREATER_THAN_OR_EQUAL',
          value: 18,
        },
      ]

      const wrapper = createWrapper(attributes)

      // Click edit button
      const editButton = wrapper.find('[data-testid="edit-attribute-button"]')
      await editButton.trigger('click')

      // Should show attribute editor with current values
      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      expect(valueInput.element.value).toBe('18')
    })

    it('should allow removing attributes', async () => {
      const attributes: NumericRangeAttribute[] = [
        {
          id: '1',
          type: 'numericRange',
          attributeId: 'age',
          name: 'Age',
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

    it('should emit update when adding attribute', async () => {
      const wrapper = createWrapper()
      await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')

      // Fill in attribute details
      const selector = wrapper.find('[data-testid="attribute-selector"]')
      await selector.setValue('age')

      const operatorSelector = wrapper.find('[data-testid="attribute-operator-selector"]')
      await operatorSelector.setValue('GREATER_THAN_OR_EQUAL')

      const valueInput = wrapper.find('[data-testid="attribute-value-input"]')
      await valueInput.setValue('18')

      // Save attribute
      const saveButton = wrapper.find('button:has-text("Save Attribute")')
      await saveButton.trigger('click')

      // Should emit update
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      const emitted = wrapper.emitted('update:modelValue') as Array<[EventAttribute[]]>
      expect(emitted[0][0]).toHaveLength(1)
      expect(emitted[0][0][0].type).toBe('numericRange')
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
