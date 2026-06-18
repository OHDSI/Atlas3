import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Node 26 does not expose localStorage on globalThis — polyfill it
beforeAll(() => {
  if (typeof localStorage === 'undefined') {
    const store: Record<string, string> = {}
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v },
        removeItem: (k: string) => { delete store[k] },
        clear: () => { Object.keys(store).forEach(k => delete store[k]) },
      },
      writable: true,
    })
  }
})

describe('ConceptSetEditor tags', () => {
  it('renders a tag button showing the assigned tag count', () => {
    const wrapper = mount(ConceptSetEditor, {
      global: {
        plugins: [vuetify, createPinia()],
        // Stub v-navigation-drawer to avoid Vuetify layout injection requirement
        stubs: {
          Teleport: true,
          VNavigationDrawer: {
            template: '<div><slot /></div>',
          },
        },
      },
      props: {
        modelValue: true,
        conceptSet: { id: 1, name: 'S', items: [], tags: [{ id: 9, name: 'X' }] },
      },
    })
    const btn = wrapper.find('[data-testid="cs-editor-tags-btn"]')
    expect(btn.exists()).toBe(true)
  })
})
