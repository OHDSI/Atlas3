import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import type { RelatedConcept } from '@/models/concept-detail.types'

const related: RelatedConcept[] = [
  {
    conceptId: 73211009,
    conceptName: 'Diabetes mellitus',
    conceptCode: '73211009',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName: 'Is a', relationshipDistance: 1 }],
  },
  {
    conceptId: 1234,
    conceptName: 'Diabetes type II',
    conceptCode: 'E11.9',
    domainId: 'Condition',
    vocabularyId: 'ICD10CM',
    conceptClassId: '3-char billing code',
    standardConcept: null,
    invalidReason: null,
    relationships: [{ relationshipName: 'Mapped from', relationshipDistance: 1 }],
  },
]

describe('ConceptRelatedTable', () => {
  it('renders one row per related concept with relationship name and vocabulary', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })

    const wrapper = mount(ConceptRelatedTable, {
      props: { related },
      global: { plugins: [vuetify, router] },
    })

    const text = wrapper.text()
    expect(text).toContain('Diabetes mellitus')
    expect(text).toContain('Diabetes type II')
    expect(text).toContain('Is a')
    expect(text).toContain('Mapped from')
    expect(text).toContain('ICD10CM')
  })

  it('shows empty state when no related concepts', () => {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({ history: createMemoryHistory(), routes: [] })
    const wrapper = mount(ConceptRelatedTable, {
      props: { related: [] },
      global: { plugins: [vuetify, router] },
    })
    expect(wrapper.text()).toMatch(/no related concepts/i)
  })
})
