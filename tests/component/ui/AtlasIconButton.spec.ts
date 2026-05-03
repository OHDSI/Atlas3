import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasIconButton from '@/components/ui/AtlasIconButton.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown>) {
  return mount(AtlasIconButton, { global: { plugins: [vuetify] }, props })
}

describe('AtlasIconButton', () => {
  it('renders v-btn with icon and aria-label', () => {
    const wrapper = mountWith({ icon: 'mdi-close', ariaLabel: 'Close' })
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').attributes('aria-label')).toBe('Close')
  })

  it('defaults to tonal variant + neutral tone', () => {
    const wrapper = mountWith({ icon: 'mdi-x', ariaLabel: 'x' })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('variant')).toBe('tonal')
    expect(btn.props('color')).toBeUndefined()
  })

  it('maps tone=primary to color=primary', () => {
    const wrapper = mountWith({ icon: 'mdi-x', ariaLabel: 'x', tone: 'primary' })
    expect(wrapper.findComponent({ name: 'VBtn' }).props('color')).toBe('primary')
  })

  it('maps tone=danger to color=error', () => {
    const wrapper = mountWith({ icon: 'mdi-x', ariaLabel: 'x', tone: 'danger' })
    expect(wrapper.findComponent({ name: 'VBtn' }).props('color')).toBe('error')
  })

  it('maps size=sm to small and lg to large', () => {
    const sm = mountWith({ icon: 'mdi-x', ariaLabel: 'x', size: 'sm' })
    expect(sm.findComponent({ name: 'VBtn' }).props('size')).toBe('small')
    const lg = mountWith({ icon: 'mdi-x', ariaLabel: 'x', size: 'lg' })
    expect(lg.findComponent({ name: 'VBtn' }).props('size')).toBe('large')
  })

  it('forwards loading + disabled', () => {
    const wrapper = mountWith({ icon: 'mdi-x', ariaLabel: 'x', loading: true, disabled: true })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('loading')).toBe(true)
    expect(btn.props('disabled')).toBe(true)
  })

  it('strips raw color/variant/size attrs', () => {
    const wrapper = mount(AtlasIconButton, {
      global: { plugins: [vuetify] },
      props: { icon: 'mdi-x', ariaLabel: 'x', variant: 'tonal' },
      attrs: { color: 'orange', variant: 'flat', size: 'large' },
    })
    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('color')).toBeUndefined()
    expect(btn.props('variant')).toBe('tonal')
  })

  it('emits click with the MouseEvent', async () => {
    const wrapper = mountWith({ icon: 'mdi-x', ariaLabel: 'x' })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
