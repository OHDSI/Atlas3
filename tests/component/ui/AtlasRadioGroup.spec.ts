// tests/component/ui/AtlasRadioGroup.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasRadioGroup from '@/components/ui/AtlasRadioGroup.vue'
import AtlasRadio from '@/components/ui/AtlasRadio.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slotContent?: string) {
  return mount(AtlasRadioGroup, {
    global: {
      plugins: [vuetify],
      components: { AtlasRadio },
    },
    props,
    slots: {
      default: slotContent ?? `
        <AtlasRadio value="a" label="Option A" />
        <AtlasRadio value="b" label="Option B" />
        <AtlasRadio value="c" label="Option C" />
      `,
    },
  })
}

describe('AtlasRadioGroup', () => {
  it('renders a v-radio-group', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).exists()).toBe(true)
  })

  it('forwards modelValue', () => {
    const wrapper = mountWith({ modelValue: 'b' })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('modelValue')).toBe('b')
  })

  it('renders label with required asterisk when required=true', () => {
    const wrapper = mountWith({ label: 'Choose one', required: true })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('label')).toBe('Choose one *')
  })

  it('renders label without asterisk when required=false', () => {
    const wrapper = mountWith({ label: 'Choose one' })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('label')).toBe('Choose one')
  })

  it('forwards inline prop', () => {
    const wrapper = mountWith({ inline: true })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('inline')).toBe(true)
  })

  it('surfaces error string as errorMessages array', () => {
    const wrapper = mountWith({ error: 'Selection required' })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('errorMessages')).toEqual(['Selection required'])
  })

  it('cascades disabled to children', () => {
    const wrapper = mountWith({ disabled: true })
    expect(wrapper.findComponent({ name: 'VRadioGroup' }).props('disabled')).toBe(true)
  })

  it('emits update:modelValue when the inner group fires update:modelValue', async () => {
    const wrapper = mountWith({ modelValue: 'a' })
    await wrapper.findComponent({ name: 'VRadioGroup' }).vm.$emit('update:modelValue', 'b')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['b'])
  })
})
