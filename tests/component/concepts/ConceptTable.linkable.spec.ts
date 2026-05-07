import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConceptTable from '@/components/concepts/ConceptTable.vue'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const open = vi.fn()
vi.mock('@/stores/concept-detail-drawer', () => ({
  useConceptDetailDrawerStore: vi.fn(() => ({ open, close: vi.fn(), isOpen: false })),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => null })),
}))

const concepts: Concept[] = [
  {
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    conceptCode: '44054006',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  },
]

describe('ConceptTable linkable mode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    open.mockClear()
  })

  it('renders concept name as a click-link that opens the detail drawer when linkable + sourceKey provided', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/concept/:sourceKey/:conceptId', component: { template: '<div />' } }],
    })

    const wrapper = mount(ConceptTable, {
      props: { concepts, linkable: true, sourceKey: 'SYNPUF1K', loading: false, totalItems: 1 },
      global: { plugins: [vuetify, router] },
    })
    await wrapper.vm.$nextTick()

    const link = wrapper.find('a[data-testid="concept-name-link-201826"]')
    expect(link.exists()).toBe(true)
    await link.trigger('click')
    expect(open).toHaveBeenCalledWith('SYNPUF1K', 201826)
  })

  it('renders concept name as plain text when linkable=false', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const wrapper = mount(ConceptTable, {
      props: { concepts, linkable: false, loading: false, totalItems: 1 },
      global: { plugins: [vuetify, router] },
    })

    expect(wrapper.find('a[data-testid="concept-name-link-201826"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
  })
})
