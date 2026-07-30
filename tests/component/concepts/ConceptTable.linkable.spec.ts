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

  it('renders a real deep-link href so right-click/ctrl-click "open in new tab" targets the concept detail route (#162)', async () => {
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
    // Previously this was href="#", so opening the link in a new tab (or
    // right-click > copy link) landed on the app's front page instead of
    // the concept. It must now resolve to the real concept detail route.
    expect(link.attributes('href')).toBe('#/concept/SYNPUF1K/201826')

    // A plain left-click still opens the fast in-app drawer instead of a
    // full navigation.
    await link.trigger('click')
    expect(open).toHaveBeenCalledWith('SYNPUF1K', 201826)
  })

  it('does not intercept ctrl/cmd/middle-clicks, letting the browser open the real href in a new tab', async () => {
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
    await link.trigger('click', { ctrlKey: true })
    expect(open).not.toHaveBeenCalled()
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
