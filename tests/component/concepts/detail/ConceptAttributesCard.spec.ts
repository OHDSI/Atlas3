import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptAttributesCard from '@/components/concepts/detail/ConceptAttributesCard.vue'
import type { Concept } from '@/models/concept-set.types'

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

describe('ConceptAttributesCard', () => {
  it('renders all primary concept attributes as label/value pairs', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptAttributesCard, {
      props: { concept },
      global: { plugins: [vuetify] },
    })
    const text = wrapper.text()
    expect(text).toContain('Concept ID')
    expect(text).toContain('201826')
    expect(text).toContain('44054006')
    expect(text).toContain('Condition')
    expect(text).toContain('SNOMED')
    expect(text).toContain('Clinical Finding')
  })

  it('shows em dash for null invalid reason', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptAttributesCard, {
      props: { concept: { ...concept, invalidReason: null } },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.text()).toContain('—')
  })
})
