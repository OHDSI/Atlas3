import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasChip from '@/components/ui/AtlasChip.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = { default: 'tag' }) {
  return mount(AtlasChip, { global: { plugins: [vuetify] }, props, slots })
}

describe('AtlasChip', () => {
  it('renders v-chip with slot content', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VChip' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('tag')
  })

  it('defaults to tone=neutral (no color)', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VChip' }).props('color')).toBeUndefined()
  })

  it.each([
    ['primary', 'primary'],
    ['info', 'info'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['danger', 'error'],
  ])('maps tone=%s to color=%s', (tone, expectedColor) => {
    const wrapper = mountWith({ tone })
    expect(wrapper.findComponent({ name: 'VChip' }).props('color')).toBe(expectedColor)
  })

  it('maps size=sm to small (md leaves size undefined)', () => {
    const sm = mountWith({ size: 'sm' })
    expect(sm.findComponent({ name: 'VChip' }).props('size')).toBe('small')
    const md = mountWith({ size: 'md' })
    expect(md.findComponent({ name: 'VChip' }).props('size')).toBe('default')
  })

  it('forwards closable + disabled', () => {
    const wrapper = mountWith({ closable: true, disabled: true })
    const chip = wrapper.findComponent({ name: 'VChip' })
    expect(chip.props('closable')).toBe(true)
    expect(chip.props('disabled')).toBe(true)
  })

  it('strips raw color/size attrs', () => {
    const wrapper = mount(AtlasChip, {
      global: { plugins: [vuetify] },
      props: { tone: 'primary' },
      attrs: { color: 'orange', size: 'large' },
      slots: { default: 'x' },
    })
    expect(wrapper.findComponent({ name: 'VChip' }).props('color')).toBe('primary')
    expect(wrapper.findComponent({ name: 'VChip' }).props('size')).toBe('default')
  })

  it('emits click', async () => {
    const wrapper = mountWith()
    await wrapper.findComponent({ name: 'VChip' }).trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
