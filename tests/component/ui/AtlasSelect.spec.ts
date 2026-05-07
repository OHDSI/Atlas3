// tests/component/ui/AtlasSelect.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasSelect from '@/components/ui/AtlasSelect.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const ITEMS = [
  { title: 'Alpha', value: 'a' },
  { title: 'Beta',  value: 'b' },
  { title: 'Gamma', value: 'c' },
]

function mountWith(props: Record<string, unknown> = {}) {
  return mount(AtlasSelect, {
    global: { plugins: [vuetify] },
    props: { items: ITEMS, ...props },
  })
}

describe('AtlasSelect', () => {
  it('renders v-select with items', () => {
    const wrapper = mountWith()
    const sel = wrapper.findComponent({ name: 'VSelect' })
    expect(sel.exists()).toBe(true)
    expect(sel.props('items')).toEqual(ITEMS)
  })

  it('forwards modelValue (single)', () => {
    const wrapper = mountWith({ modelValue: 'a' })
    expect(wrapper.findComponent({ name: 'VSelect' }).props('modelValue')).toBe('a')
  })

  it('forwards modelValue (multiple)', () => {
    const wrapper = mountWith({ multiple: true, modelValue: ['a', 'b'] })
    const sel = wrapper.findComponent({ name: 'VSelect' })
    expect(sel.props('multiple')).toBe(true)
    expect(sel.props('modelValue')).toEqual(['a', 'b'])
  })

  it('uses default itemTitle=title and itemValue=value', () => {
    const wrapper = mountWith()
    const sel = wrapper.findComponent({ name: 'VSelect' })
    expect(sel.props('itemTitle')).toBe('title')
    expect(sel.props('itemValue')).toBe('value')
  })

  it('uses custom itemTitle/itemValue', () => {
    const wrapper = mountWith({ itemTitle: 'name', itemValue: 'id' })
    const sel = wrapper.findComponent({ name: 'VSelect' })
    expect(sel.props('itemTitle')).toBe('name')
    expect(sel.props('itemValue')).toBe('id')
  })

  it('appends " *" to label when required', () => {
    const wrapper = mountWith({ label: 'Choose', required: true })
    expect(wrapper.findComponent({ name: 'VSelect' }).props('label')).toBe('Choose *')
  })

  it('omits required suffix when required is false', () => {
    const wrapper = mountWith({ label: 'Choose' })
    expect(wrapper.findComponent({ name: 'VSelect' }).props('label')).toBe('Choose')
  })

  it('surfaces error string as error-messages array', () => {
    const wrapper = mountWith({ error: 'Pick one' })
    expect(wrapper.findComponent({ name: 'VSelect' }).props('errorMessages')).toEqual(['Pick one'])
  })

  it('forwards clearable + disabled', () => {
    const wrapper = mountWith({ clearable: true, disabled: true })
    const sel = wrapper.findComponent({ name: 'VSelect' })
    expect(sel.props('clearable')).toBe(true)
    expect(sel.props('disabled')).toBe(true)
  })

  it('locks density=compact (cannot be overridden via $attrs)', () => {
    const wrapper = mount(AtlasSelect, {
      global: { plugins: [vuetify] },
      props: { items: ITEMS },
      attrs: { density: 'comfortable' },
    })
    expect(wrapper.findComponent({ name: 'VSelect' }).props('density')).toBe('compact')
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
