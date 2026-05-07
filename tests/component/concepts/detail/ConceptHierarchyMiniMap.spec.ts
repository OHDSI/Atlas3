import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'

const concept: Concept = {
  conceptId: 201826,
  conceptName: 'Type 2 diabetes mellitus',
  conceptCode: '44054006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

const parents: RelatedConcept[] = [
  {
    conceptId: 73211009,
    conceptName: 'Diabetes mellitus',
    conceptCode: '73211009',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
  },
]

const children: RelatedConcept[] = [
  {
    conceptId: 421326000,
    conceptName: 'T2DM with renal complications',
    conceptCode: '421326000',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName: 'Has descendant of', relationshipDistance: 1 }],
  },
]

describe('ConceptHierarchyMiniMap', () => {
  it('renders parents above current and children below', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const wrapper = mount(ConceptHierarchyMiniMap, {
      props: { concept, parents, children },
      global: { plugins: [vuetify, router] },
    })

    const text = wrapper.text()
    expect(text).toContain('Diabetes mellitus')
    expect(text).toContain('Type 2 diabetes mellitus')
    expect(text).toContain('T2DM with renal complications')

    const current = wrapper.find('[data-testid="hierarchy-current"]')
    expect(current.exists()).toBe(true)
    expect(current.text()).toContain('Type 2 diabetes mellitus')
  })

  it('shows empty placeholder when no parents and no children', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const wrapper = mount(ConceptHierarchyMiniMap, {
      props: { concept, parents: [], children: [] },
      global: { plugins: [vuetify, router] },
    })
    expect(wrapper.text()).toMatch(/no hierarchy/i)
  })
})
