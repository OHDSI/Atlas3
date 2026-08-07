import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ThemeToggle from '@/components/shared/ThemeToggle.vue'
import { useThemeStore } from '@/stores/theme'

const vuetify = createVuetify({ components, directives })

describe('ThemeToggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    )
  })

  it('renders the trigger button', () => {
    const wrapper = mount(ThemeToggle, { global: { plugins: [vuetify] } })
    expect(wrapper.find('[data-testid="nav-theme-toggle"]').exists()).toBe(true)
  })

  it('shows the moon icon when the resolved theme is dark', async () => {
    const store = useThemeStore()
    store.initialize()
    store.setPreference('dark')
    const wrapper = mount(ThemeToggle, { global: { plugins: [vuetify] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('mdi-weather-night')
  })

  it('shows the sun icon when the resolved theme is light', async () => {
    const store = useThemeStore()
    store.initialize()
    store.setPreference('light')
    const wrapper = mount(ThemeToggle, { global: { plugins: [vuetify] } })
    await wrapper.vm.$nextTick()
    expect(wrapper.html()).toContain('mdi-white-balance-sunny')
  })

  // VMenu teleports its list outside the wrapper, so the exposed handler is the
  // reliable seam; the menu itself is covered by the e2e suite in Task 17.
  it('writes the chosen mode to the store', () => {
    const store = useThemeStore()
    store.initialize()
    const wrapper = mount(ThemeToggle, { global: { plugins: [vuetify] } })
    ;(wrapper.vm as unknown as { select: (mode: string) => void }).select('dark')
    expect(store.preference).toBe('dark')
  })

  it('persists the chosen mode', () => {
    const store = useThemeStore()
    store.initialize()
    const wrapper = mount(ThemeToggle, { global: { plugins: [vuetify] } })
    ;(wrapper.vm as unknown as { select: (mode: string) => void }).select('system')
    expect(localStorage.getItem('atlas.theme')).toBe('system')
  })
})
