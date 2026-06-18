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

import ConceptSetFilters from '@/components/concepts/ConceptSetFilters.vue'

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

describe('ConceptSetFilters tags', () => {
  it('renders a tag multi-select bound to availableTags', () => {
    const wrapper = mount(ConceptSetFilters, {
      global: {
        plugins: [vuetify, createPinia()],
        // Stub AtlasMenu so its slot content renders in-place (no teleport)
        stubs: {
          AtlasMenu: {
            template: '<div><slot name="activator" :props="{}" /><slot /></div>',
          },
        },
      },
      props: {
        filters: {
          searchQuery: '',
          author: '',
          selectedTags: [],
          createdDateRange: {},
          modifiedDateRange: {},
        },
        availableAuthors: [],
        availableTags: ['Active'],
        activeFilterCount: 0,
      },
    })
    expect(wrapper.find('[data-testid="cs-filter-tags"]').exists()).toBe(true)
  })
})
