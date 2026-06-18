import { describe, it, expect, vi, beforeAll } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock the service to return a tagged set — this is what fetchAll resolves to
vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn().mockResolvedValue([
    { id: 1, name: 'My Concept Set', tags: [{ id: 1, name: 'Active', color: '#4caf50' }] },
  ]),
  getConceptSetById: vi.fn().mockResolvedValue(null),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
  assignTagToConceptSet: vi.fn(),
  unassignTagFromConceptSet: vi.fn(),
}))

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

vi.mock('@/composables/useEntityAccess', () => ({
  useEntityAccessFor: () => ({ canWrite: () => true }),
}))

import ConceptSetList from '@/components/concepts/ConceptSetList.vue'

const vuetify = createVuetify({ components, directives })

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

describe('ConceptSetList tags column', () => {
  it('renders tag chips for a concept set', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const wrapper = mount(ConceptSetList, {
      global: {
        plugins: [vuetify, pinia],
      },
    })

    // Let onMounted fetchAll resolve (mocked to return the tagged set)
    await flushPromises()

    expect(wrapper.text()).toContain('Active')
  })
})
