/**
 * ConceptsView remains the repository browser; editing is hosted by the
 * canonical /conceptset routes.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConceptsView from '@/views/ConceptsView.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (key: string, fallback?: string) => ({ value: fallback ?? key }) }),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}))

const vuetify = createVuetify({ components, directives })

function mountView() {
  return mount(ConceptsView, {
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasPageShell: { template: '<div><slot /></div>' },
        AtlasTabs: { template: '<div><slot /></div>' },
        AtlasTab: { template: '<div><slot /></div>' },
        AtlasIcon: true,
        ConceptSearch: true,
        ConceptSetList: true,
        ConceptSetEditor: true,
      },
    },
  })
}

describe('ConceptsView repository browser', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render a concept-set editor, even when a draft exists', () => {
    const sets = useConceptSetsStore()
    sets.openCreateEditor()

    const wrapper = mountView()

    expect(wrapper.findComponent(ConceptSetEditor).exists()).toBe(false)
  })
})
