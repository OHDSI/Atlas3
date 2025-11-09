import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CardinalityEditor from '@/components/cohort-builder/CardinalityEditor.vue'
import type { Cardinality } from '@/models/event.types'

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

    // Check that values are populated (implementation-dependent selectors)
    expect(wrapper.html()).toContain('At Least')
    expect(wrapper.html()).toContain('2')
  })

  it('should emit update when cardinality type changes', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 1,
      countingMethod: 'ALL',
    })

    // Find type selector and change it
    const typeSelect = wrapper.find('[aria-label="Cardinality Type"]')
    await typeSelect.setValue('EXACTLY')

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
    const typeSelect = wrapper.find('[aria-label="Cardinality Type"]')
    await typeSelect.setValue('AT_MOST')

    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
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

    // Verify all counting methods are available
    expect(methodSelect.html()).toContain('All Occurrences')
    expect(methodSelect.html()).toContain('Distinct Concept')
    expect(methodSelect.html()).toContain('Distinct Start Date')
    expect(methodSelect.html()).toContain('Distinct Visit')
  })

  it('should emit update when counting method changes', async () => {
    const wrapper = createWrapper({
      type: 'AT_LEAST',
      count: 2,
      countingMethod: 'ALL',
    })

    const methodSelect = wrapper.find('[aria-label="Counting Method"]')
    await methodSelect.setValue('DISTINCT_CONCEPT')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted[emitted.length - 1][0].countingMethod).toBe('DISTINCT_CONCEPT')
  })

  it('should initialize with default values when no cardinality provided', () => {
    const wrapper = createWrapper()

    // Verify default cardinality
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[Cardinality]>
    expect(emitted[0][0].type).toBe('AT_LEAST')
    expect(emitted[0][0].count).toBe(1)
    expect(emitted[0][0].countingMethod).toBe('ALL')
  })
})
