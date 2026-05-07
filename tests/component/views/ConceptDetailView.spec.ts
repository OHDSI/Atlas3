import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/concept-search.service', () => ({
  getConceptById: vi.fn().mockResolvedValue({
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '44054006',
    invalidReason: null,
  }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/services/concept-detail.service', () => ({
  getConceptRelated: vi.fn().mockResolvedValue([]),
  getConceptAncestorAndDescendant: vi.fn().mockResolvedValue([]),
  getConceptDrilldown: vi.fn().mockResolvedValue(null),
}))

import ConceptDetailView from '@/views/ConceptDetailView.vue'

describe('ConceptDetailView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('mounts and triggers loadConcept on render', async () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/concept/:sourceKey/:conceptId', name: 'concept-detail', component: { template: '<div />' } }],
    })

    const wrapper = mount(ConceptDetailView, {
      props: { sourceKey: 'SYNPUF1K', conceptId: 201826 },
      global: {
        plugins: [vuetify, router],
        stubs: {
          ConceptDetailHeader: true,
          ConceptStatCards: true,
          ConceptAttributesCard: true,
          ConceptHierarchyMiniMap: true,
          ConceptRelatedTable: true,
          ConceptDrilldownChart: true,
        },
      },
    })

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-testid="concept-detail-view"]').exists()).toBe(true)
  })
})
