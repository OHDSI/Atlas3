// tests/component/ui/AtlasSwitch.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasSwitch from '@/components/ui/AtlasSwitch.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}) {
  return mount(AtlasSwitch, { global: { plugins: [vuetify] }, props })
}

describe('AtlasSwitch', () => {
  it('renders a v-switch', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VSwitch' }).exists()).toBe(true)
  })

  it('forwards modelValue', () => {
    const wrapper = mountWith({ modelValue: true })
    expect(wrapper.findComponent({ name: 'VSwitch' }).props('modelValue')).toBe(true)
  })

  it('renders label', () => {
    const wrapper = mountWith({ label: 'Enable feature' })
    expect(wrapper.findComponent({ name: 'VSwitch' }).props('label')).toBe('Enable feature')
  })

  it('forwards disabled prop', () => {
    const wrapper = mountWith({ disabled: true })
    expect(wrapper.findComponent({ name: 'VSwitch' }).props('disabled')).toBe(true)
  })

  it.each([
    ['primary', 'primary'],
    ['success', 'success'],
    ['danger',  'error'],
  ] as const)('tone %s maps to color %s', (tone, color) => {
    const wrapper = mountWith({ tone })
    expect(wrapper.findComponent({ name: 'VSwitch' }).props('color')).toBe(color)
  })

  it('strips raw color attr — semantic tone wins', () => {
    const wrapper = mount(AtlasSwitch, {
      global: { plugins: [vuetify] },
      props: { tone: 'success' },
      attrs: { color: 'purple' },
    })
    expect(wrapper.findComponent({ name: 'VSwitch' }).props('color')).toBe('success')
  })

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mountWith({ modelValue: false })
    const input = wrapper.find('input[type="checkbox"]')
    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
  })
})
