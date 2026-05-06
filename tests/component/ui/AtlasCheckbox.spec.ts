// tests/component/ui/AtlasCheckbox.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasCheckbox from '@/components/ui/AtlasCheckbox.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}) {
  return mount(AtlasCheckbox, { global: { plugins: [vuetify] }, props })
}

describe('AtlasCheckbox', () => {
  it('renders a v-checkbox', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VCheckbox' }).exists()).toBe(true)
  })

  it('forwards modelValue', () => {
    const wrapper = mountWith({ modelValue: true })
    expect(wrapper.findComponent({ name: 'VCheckbox' }).props('modelValue')).toBe(true)
  })

  it('renders label', () => {
    const wrapper = mountWith({ label: 'Accept terms' })
    expect(wrapper.findComponent({ name: 'VCheckbox' }).props('label')).toBe('Accept terms')
  })

  it('forwards indeterminate prop', () => {
    const wrapper = mountWith({ indeterminate: true })
    expect(wrapper.findComponent({ name: 'VCheckbox' }).props('indeterminate')).toBe(true)
  })

  it('surfaces error string as errorMessages array', () => {
    const wrapper = mountWith({ error: 'Required' })
    expect(wrapper.findComponent({ name: 'VCheckbox' }).props('errorMessages')).toEqual(['Required'])
  })

  it('emits update:modelValue when checkbox is toggled', async () => {
    const wrapper = mountWith({ modelValue: false })
    const input = wrapper.find('input[type="checkbox"]')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
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

  it('sets aria-checked="mixed" on the input when indeterminate=true', () => {
    const wrapper = mountWith({ indeterminate: true })
    expect(wrapper.find('input').attributes('aria-checked')).toBe('mixed')
  })

  it('does not set aria-checked when not indeterminate', () => {
    const wrapper = mountWith()
    expect(wrapper.find('input').attributes('aria-checked')).toBeUndefined()
  })
})
