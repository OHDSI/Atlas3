import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasSnackbar from '@/components/ui/AtlasSnackbar.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

afterEach(() => {
  document.body.innerHTML = ''
})

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AtlasSnackbar, {
    global: { plugins: [vuetify] },
    attachTo: document.body,
    props: { modelValue: true, ...props },
    slots,
  })
}

describe('AtlasSnackbar', () => {
  it('renders v-snackbar with text from prop', async () => {
    const wrapper = mountWith({ text: 'Saved!' })
    await new Promise(r => setTimeout(r, 50))
    expect(wrapper.findComponent({ name: 'VSnackbar' }).exists()).toBe(true)
  })

  it.each([
    ['info', 'info'],
    ['success', 'success'],
    ['warning', 'warning'],
    ['danger', 'error'],
  ])('maps severity=%s to color=%s', (severity, expectedColor) => {
    const wrapper = mountWith({ severity })
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('color')).toBe(expectedColor)
  })

  it('forwards timeout prop (default 5000)', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('timeout')).toBe(5000)
  })

  it('honors custom timeout', () => {
    const wrapper = mountWith({ timeout: -1 })
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('timeout')).toBe(-1)
  })

  it('forwards location prop (default bottom)', () => {
    const wrapper = mountWith()
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('location')).toBe('bottom')
  })

  it('honors custom location', () => {
    const wrapper = mountWith({ location: 'top' })
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('location')).toBe('top')
  })

  it('strips raw color attr (semantic API wins)', () => {
    const wrapper = mount(AtlasSnackbar, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
      props: { modelValue: true, severity: 'success' },
      attrs: { color: 'orange' },
    })
    expect(wrapper.findComponent({ name: 'VSnackbar' }).props('color')).toBe('success')
  })

  it('emits update:modelValue when underlying v-snackbar updates', async () => {
    const wrapper = mountWith()
    await wrapper.findComponent({ name: 'VSnackbar' }).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it.each(['info', 'success', 'warning'] as const)('uses role="status" and aria-live="polite" for severity=%s', async (severity) => {
    mountWith({ severity })
    await new Promise(r => setTimeout(r, 50))
    const overlay = document.querySelector('.v-snackbar') as HTMLElement | null
    expect(overlay?.getAttribute('role')).toBe('status')
    expect(overlay?.getAttribute('aria-live')).toBe('polite')
  })

  it('uses role="alert" and aria-live="assertive" for severity=danger', async () => {
    mountWith({ severity: 'danger' })
    await new Promise(r => setTimeout(r, 50))
    const overlay = document.querySelector('.v-snackbar') as HTMLElement | null
    expect(overlay?.getAttribute('role')).toBe('alert')
    expect(overlay?.getAttribute('aria-live')).toBe('assertive')
  })

  it('defaults to role="status" and aria-live="polite"', async () => {
    mountWith()
    await new Promise(r => setTimeout(r, 50))
    const overlay = document.querySelector('.v-snackbar') as HTMLElement | null
    expect(overlay?.getAttribute('role')).toBe('status')
    expect(overlay?.getAttribute('aria-live')).toBe('polite')
  })
})
