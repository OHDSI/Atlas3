import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConceptSetTable from '@/components/concepts/ConceptSetTable.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const items = [
  {
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    conceptCode: '44054006',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: false,
    includeDescendants: true,
    includeMapped: false,
  },
]

describe('ConceptSetTable linkable', () => {
  it('renders concept name as a router-link to detail when sourceKey is set', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/concept/:sourceKey/:conceptId', component: { template: '<div />' } }],
    })

    const wrapper = mount(ConceptSetTable, {
      props: { items, sourceKey: 'SYNPUF1K' },
      global: { plugins: [vuetify, router] },
    })

    const link = wrapper.find('a[data-testid="concept-name-link-201826"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/concept/SYNPUF1K/201826')
  })
})
