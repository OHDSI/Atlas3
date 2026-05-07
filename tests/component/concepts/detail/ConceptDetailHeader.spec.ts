import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptDetailHeader from '@/components/concepts/detail/ConceptDetailHeader.vue'
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

describe('ConceptDetailHeader', () => {
  it('renders concept name, vocabulary, ID, domain, class as chips', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
    expect(wrapper.text()).toContain('SNOMED')
    expect(wrapper.text()).toContain('201826')
    expect(wrapper.text()).toContain('Condition')
    expect(wrapper.text()).toContain('Clinical Finding')
    expect(wrapper.find('[data-testid="add-to-concept-set"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="copy-concept-id"]').exists()).toBe(true)
  })

  it('emits add-to-concept-set when button clicked', async () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept },
      global: { plugins: [vuetify] },
    })

    await wrapper.find('[data-testid="add-to-concept-set"]').trigger('click')
    expect(wrapper.emitted('add-to-concept-set')).toEqual([[concept]])
  })

  it('shows non-standard chip when standardConcept is null', () => {
    const vuetify = createVuetify({ components, directives })
    const wrapper = mount(ConceptDetailHeader, {
      props: { concept: { ...concept, standardConcept: null } },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('Non-standard')
  })
})
