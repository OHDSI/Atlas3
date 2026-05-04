import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasAlert from '@/components/ui/AtlasAlert.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = { default: 'msg' }) {
  return mount(AtlasAlert, { global: { plugins: [vuetify] }, props, slots })
}

describe('AtlasAlert', () => {
  it('renders v-alert with slot content', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('msg')
  })

  it.each([
    ['info', 'info', 'mdi-information'],
    ['success', 'success', 'mdi-check-circle'],
    ['warning', 'warning', 'mdi-alert'],
    ['danger', 'error', 'mdi-alert-circle'],
  ])('maps severity=%s to alert type=%s and default icon=%s', (severity, expectedType, expectedIcon) => {
    const wrapper = mountWith({ severity })
    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.props('type')).toBe(expectedType)
    // VAlert uses 'icon' prop (not 'prependIcon') in Vuetify 3
    expect(alert.props('icon')).toBe(expectedIcon)
  })

  it('forwards title prop', () => {
    const wrapper = mountWith({ title: 'Heads up' })
    expect(wrapper.findComponent({ name: 'VAlert' }).props('title')).toBe('Heads up')
  })

  it('respects custom prependIcon override', () => {
    const wrapper = mountWith({ severity: 'info', prependIcon: 'mdi-bell' })
    expect(wrapper.findComponent({ name: 'VAlert' }).props('icon')).toBe('mdi-bell')
  })

  it('forwards closable prop', () => {
    const wrapper = mountWith({ closable: true })
    expect(wrapper.findComponent({ name: 'VAlert' }).props('closable')).toBe(true)
  })

  it('emits close on the underlying click:close', async () => {
    const wrapper = mountWith({ closable: true })
    await wrapper.findComponent({ name: 'VAlert' }).vm.$emit('click:close')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('strips raw color/type attrs (semantic API wins)', () => {
    const wrapper = mount(AtlasAlert, {
      global: { plugins: [vuetify] },
      props: { severity: 'success' },
      attrs: { type: 'error', color: 'orange' },
      slots: { default: 'x' },
    })
    expect(wrapper.findComponent({ name: 'VAlert' }).props('type')).toBe('success')
  })
})
