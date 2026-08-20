/**
 * CohortSearch Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortSearch from '@/components/cohort/CohortSearch.vue'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key)
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(CohortSearch, {
    props: {
      modelValue: '',
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('CohortSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render text field', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
  })

  it('should have search icon', () => {
    const wrapper = mountComponent()

    const textField = wrapper.findComponent({ name: 'VTextField' })
    expect(textField.props('prependInnerIcon')).toBe('mdi-magnify')
  })

  it('should be clearable', () => {
    const wrapper = mountComponent()

    const textField = wrapper.findComponent({ name: 'VTextField' })
    expect(textField.props('clearable')).toBe(true)
  })

  it('should emit update:modelValue after debounce', async () => {
    const wrapper = mountComponent({ debounceMs: 100 })

    const textField = wrapper.findComponent({ name: 'VTextField' })
    await textField.vm.$emit('update:modelValue', 'test search')

    // Value should not be emitted immediately
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()

    // Advance timers
    vi.advanceTimersByTime(100)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['test search'])
  })

  it('should use default debounce of 300ms', async () => {
    const wrapper = mountComponent()

    const textField = wrapper.findComponent({ name: 'VTextField' })
    await textField.vm.$emit('update:modelValue', 'test')

    // Not emitted yet
    vi.advanceTimersByTime(200)
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()

    // Emitted after 300ms
    vi.advanceTimersByTime(100)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should clear previous timer on new input', async () => {
    const wrapper = mountComponent({ debounceMs: 100 })

    const textField = wrapper.findComponent({ name: 'VTextField' })

    await textField.vm.$emit('update:modelValue', 'first')
    vi.advanceTimersByTime(50)

    await textField.vm.$emit('update:modelValue', 'second')
    vi.advanceTimersByTime(100)

    // Should only emit 'second' not 'first'
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['second'])
  })

  it('should emit empty string for null value', async () => {
    const wrapper = mountComponent({ debounceMs: 0 })

    const textField = wrapper.findComponent({ name: 'VTextField' })
    await textField.vm.$emit('update:modelValue', null)

    vi.advanceTimersByTime(0)

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([''])
  })

  it('should display model value', () => {
    const wrapper = mountComponent({ modelValue: 'initial search' })

    const textField = wrapper.findComponent({ name: 'VTextField' })
    expect(textField.props('modelValue')).toBe('initial search')
  })
})
