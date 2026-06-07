import { describe, it, expect, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import StoryThemeProvider from '@/components/ui/_story/StoryThemeProvider.vue'
import { buildVuetifyOptions } from '@/ui/theme'

const vuetify = createVuetify({ components, directives, ...buildVuetifyOptions() })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountProvider() {
  return mount(StoryThemeProvider, {
    global: { plugins: [vuetify] },
    slots: { default: '<span class="child">content</span>' },
  })
}

describe('StoryThemeProvider', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark', 'htw-dark')
  })

  it('renders the slot content inside a theme provider', () => {
    const wrapper = mountProvider()
    expect(wrapper.find('.v-theme-provider').exists()).toBe(true)
    expect(wrapper.find('.child').text()).toBe('content')
  })

  it('uses the light theme when no dark class is present', () => {
    document.documentElement.classList.remove('dark', 'htw-dark')
    const wrapper = mountProvider()
    expect(wrapper.find('.v-theme--light').exists()).toBe(true)
    expect(wrapper.find('.v-theme--dark').exists()).toBe(false)
  })

  it('uses the dark theme when documentElement has the dark class at mount', () => {
    document.documentElement.classList.add('dark')
    const wrapper = mountProvider()
    expect(wrapper.find('.v-theme--dark').exists()).toBe(true)
  })

  it('also recognises Histoire\'s htw-dark class', () => {
    document.documentElement.classList.add('htw-dark')
    const wrapper = mountProvider()
    expect(wrapper.find('.v-theme--dark').exists()).toBe(true)
  })

  it('reacts when the dark class is toggled after mount', async () => {
    document.documentElement.classList.remove('dark', 'htw-dark')
    const wrapper = mountProvider()
    expect(wrapper.find('.v-theme--light').exists()).toBe(true)

    document.documentElement.classList.add('dark')
    // MutationObserver callbacks are delivered asynchronously
    await new Promise((resolve) => setTimeout(resolve, 0))
    await nextTick()
    expect(wrapper.find('.v-theme--dark').exists()).toBe(true)
  })

  it('disconnects its observer on unmount without error', () => {
    const wrapper = mountProvider()
    expect(() => wrapper.unmount()).not.toThrow()
  })
})
