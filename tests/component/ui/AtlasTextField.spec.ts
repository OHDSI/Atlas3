// tests/component/ui/AtlasTextField.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasTextField from '@/components/ui/AtlasTextField.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}) {
  return mount(AtlasTextField, { global: { plugins: [vuetify] }, props })
}

describe('AtlasTextField', () => {
  it('renders a v-text-field by default', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VTextarea' }).exists()).toBe(false)
  })

  it('renders a v-textarea when multiline=true', () => {
    const wrapper = mountWith({ multiline: true })
    expect(wrapper.findComponent({ name: 'VTextarea' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(false)
  })

  it('forwards modelValue', () => {
    const wrapper = mountWith({ modelValue: 'hello' })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('modelValue')).toBe('hello')
  })

  it('forwards type prop on text-field (not on textarea)', () => {
    const wrapper = mountWith({ type: 'email' })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('type')).toBe('email')
  })

  it('appends " *" to label when required=true', () => {
    const wrapper = mountWith({ label: 'Name', required: true })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('label')).toBe('Name *')
  })

  it('does NOT append " *" when required=false', () => {
    const wrapper = mountWith({ label: 'Name' })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('label')).toBe('Name')
  })

  it('surfaces error string as error-messages', () => {
    const wrapper = mountWith({ error: 'Required field' })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('errorMessages')).toEqual(['Required field'])
  })

  it('omits error-messages when no error', () => {
    // Vuetify normalises an undefined errorMessages prop to [] at runtime
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VTextField' }).props('errorMessages')).toEqual([])
  })

  it('locks density=compact (cannot be overridden via $attrs)', () => {
    const wrapper = mount(AtlasTextField, {
      global: { plugins: [vuetify] },
      props: {},
      attrs: { density: 'comfortable' },
    })
    expect(wrapper.findComponent({ name: 'VTextField' }).props('density')).toBe('compact')
  })

  it('passes rows prop to textarea', () => {
    const wrapper = mountWith({ multiline: true, rows: 5 })
    expect(wrapper.findComponent({ name: 'VTextarea' }).props('rows')).toBe(5)
  })

  it('emits update:modelValue when input value changes', async () => {
    const wrapper = mountWith({ modelValue: 'a' })
    const input = wrapper.find('input')
    await input.setValue('ab')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['ab'])
  })

  it('sets aria-required on the input when required=true', () => {
    const wrapper = mountWith({ required: true })
    expect(wrapper.find('input').attributes('aria-required')).toBe('true')
  })

  it('does not set aria-required when required=false', () => {
    const wrapper = mountWith()
    expect(wrapper.find('input').attributes('aria-required')).toBeUndefined()
  })

  it('sets aria-invalid on the input when error is present', () => {
    const wrapper = mountWith({ error: 'Bad' })
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  it('does not set aria-invalid when no error', () => {
    const wrapper = mountWith()
    expect(wrapper.find('input').attributes('aria-invalid')).toBeUndefined()
  })
})
