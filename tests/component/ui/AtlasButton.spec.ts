// tests/component/ui/AtlasButton.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasButton from '@/components/ui/AtlasButton.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = { default: 'Click' }) {
  return mount(AtlasButton, { global: { plugins: [vuetify] }, props, slots })
}

describe('AtlasButton', () => {
  it('renders a button with the slot content', () => {
    const wrapper = mountWith()
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.text()).toBe('Click')
  })

  it('defaults to variant=primary (color=primary, vuetify variant=flat)', () => {
    const wrapper = mountWith()
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('color')).toBe('primary')
    expect(btn.props('variant')).toBe('flat')
  })

  it('maps variant=secondary to color=primary, variant=outlined', () => {
    const wrapper = mountWith({ variant: 'secondary' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('color')).toBe('primary')
    expect(btn.props('variant')).toBe('outlined')
  })

  it('maps variant=danger to color=error, variant=flat', () => {
    const wrapper = mountWith({ variant: 'danger' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('color')).toBe('error')
    expect(btn.props('variant')).toBe('flat')
  })

  it('maps variant=ghost to variant=text (no color)', () => {
    const wrapper = mountWith({ variant: 'ghost' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('variant')).toBe('text')
    expect(btn.props('color')).toBeUndefined()
  })

  it('maps variant=link to variant=plain', () => {
    const wrapper = mountWith({ variant: 'link' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('variant')).toBe('plain')
  })

  it('maps size=sm to size=small and size=lg to size=large', () => {
    const sm = mountWith({ size: 'sm' })
    expect(sm.findComponent({ name: 'VBtn' }).props('size')).toBe('small')
    const lg = mountWith({ size: 'lg' })
    expect(lg.findComponent({ name: 'VBtn' }).props('size')).toBe('large')
  })

  it('forwards loading, disabled, type props', () => {
    const wrapper = mountWith({ loading: true, disabled: true, type: 'submit' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('loading')).toBe(true)
    expect(btn.props('disabled')).toBe(true)
    expect(wrapper.find('button').attributes('type')).toBe('submit')
  })

  it('renders icon at start by default and end when iconPosition=end', () => {
    const start = mountWith({ icon: 'mdi-plus' })
    expect(start.findComponent({ name: 'VBtn' }).props('prependIcon')).toBe('mdi-plus')
    expect(start.findComponent({ name: 'VBtn' }).props('appendIcon')).toBeUndefined()
    const end = mountWith({ icon: 'mdi-arrow-right', iconPosition: 'end' })
    expect(end.findComponent({ name: 'VBtn' }).props('appendIcon')).toBe('mdi-arrow-right')
    expect(end.findComponent({ name: 'VBtn' }).props('prependIcon')).toBeUndefined()
  })

  it('strips raw color/variant/size attrs (cannot bypass semantic API)', () => {
    const wrapper = mountWith({}, { default: 'x' })
    // Attempt to inject raw color via $attrs:
    const wrapper2 = mount(AtlasButton, {
      global: { plugins: [vuetify] },
      props: {},
      attrs: { color: 'orange', variant: 'elevated', size: 'large' },
      slots: { default: 'x' },
    })
    const btn = wrapper2.findComponent({ name: 'VBtn' })
    // Despite injecting color="orange", semantic mapping wins:
    expect(btn.props('color')).toBe('primary')
    expect(btn.props('variant')).toBe('flat')
    // size stays at VBtn default ('default') when AtlasButton uses md:
    expect(btn.props('size')).toBe('default')
    void wrapper
  })

  it('emits click event with the MouseEvent', async () => {
    const wrapper = mountWith()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
