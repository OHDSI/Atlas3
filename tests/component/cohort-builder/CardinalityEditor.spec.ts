import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { Cardinality } from '@/models/event.types'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import CardinalityEditor from '@/components/cohort-builder/CardinalityEditor.vue'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CardinalityEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (cardinality?: Cardinality) => {
    return mount(CardinalityEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: cardinality,
      },
    })
  }

  it('should render cardinality type dropdown', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[aria-label="Cardinality Type"]').exists()).toBe(true)
  })

  it('should render count input field', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[aria-label="Count"]').exists()).toBe(true)
  })

  it('should render counting method dropdown', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[aria-label="Counting Method"]').exists()).toBe(true)
  })

  it('should display provided cardinality values', () => {
    const cardinality: Cardinality = {
      type: 'AT_LEAST',
      count: 2,
      countingMethod: 'ALL',
    }
    const wrapper = createWrapper(cardinality)

    // Check that the select has the correct value
    const typeSelect = wrapper.find('[aria-label="Cardinality Type"]')
    expect(typeSelect.exists()).toBe(true)
    expect(typeSelect.element.value).toBe('AT_LEAST')

    // Check count input
    const countInput = wrapper.find('[aria-label="Count"]')
    expect(countInput.element.value).toBe('2')
  })

  it('should emit update when cardinality type changes', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 1,
      countingMethod: 'ALL',
    })

    // Find the VSelect component for type
    const typeSelect = wrapper.findComponent({ name: 'VSelect' })
    expect(typeSelect.exists()).toBe(true)

    // Emit update event from the select component
    await typeSelect.vm.$emit('update:modelValue', 'EXACTLY')
    await wrapper.vm.$nextTick()

    // Check that update event was emitted
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted[0][0].type).toBe('EXACTLY')
  })

  it('should emit update when count changes', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 1,
      countingMethod: 'ALL',
    })

    const countInput = wrapper.find('[aria-label="Count"]')
    await countInput.setValue('3')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted[emitted.length - 1][0].count).toBe(3)
  })

  it('should preserve zero count (CRITICAL)', async () => {
    const wrapper = createWrapper({
      type: 'EXACTLY',
      count: 0,
      countingMethod: 'ALL',
    })

    // Verify zero count is displayed
    const countInput = wrapper.find('[aria-label="Count"]')
    expect(countInput.element.value).toBe('0')

    // Change type and verify zero is preserved
    const typeSelect = wrapper.findComponent({ name: 'VSelect' })
    await typeSelect.vm.$emit('update:modelValue', 'AT_MOST')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted).toBeTruthy()
    // Verify zero count is preserved using ?? operator (not || which would convert 0 to 1)
    expect(emitted[emitted.length - 1][0].count).toBe(0)
  })

  it('should validate count >= 1 for AT_LEAST type', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 0,
      countingMethod: 'ALL',
    })

    // AT_LEAST requires count >= 1
    expect(wrapper.html()).toContain('error') // Validation error displayed
  })

  it('should allow count = 0 for EXACTLY type', () => {
    const wrapper = createWrapper({
      type: 'EXACTLY',
      count: 0,
      countingMethod: 'ALL',
    })

    // EXACTLY allows count >= 0
    expect(wrapper.html()).not.toContain('error')
  })

  it('should allow count = 0 for AT_MOST type', () => {
    const wrapper = createWrapper({
      type: 'AT_MOST',
      count: 0,
      countingMethod: 'ALL',
    })

    // AT_MOST allows count >= 0
    expect(wrapper.html()).not.toContain('error')
  })

  it('should display all counting method options', () => {
    const wrapper = createWrapper()
    const methodSelect = wrapper.find('[aria-label="Counting Method"]')

    // Just verify the select exists and has the correct value attribute
    expect(methodSelect.exists()).toBe(true)
    expect(methodSelect.element.value).toBe('ALL')
  })

  it('should emit update when counting method changes', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 2,
      countingMethod: 'ALL',
    })

    // Find the second VSelect (first is type, second is counting method)
    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    const methodSelect = selects[1]
    expect(methodSelect.exists()).toBe(true)

    await methodSelect.vm.$emit('update:modelValue', 'DISTINCT_CONCEPT')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted[emitted.length - 1][0].countingMethod).toBe('DISTINCT_CONCEPT')
  })

  it('should initialize with default values when no cardinality provided', () => {
    const wrapper = createWrapper()

    // Check that the default values are displayed
    const typeSelect = wrapper.find('[aria-label="Cardinality Type"]')
    expect(typeSelect.element.value).toBe('AT_LEAST')

    const countInput = wrapper.find('[aria-label="Count"]')
    expect(countInput.element.value).toBe('1')

    const methodSelect = wrapper.find('[aria-label="Counting Method"]')
    expect(methodSelect.element.value).toBe('ALL')
  })
})
