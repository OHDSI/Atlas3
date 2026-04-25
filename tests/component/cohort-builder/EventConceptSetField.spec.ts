import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EventConceptSetField from '@/components/cohort-builder/EventConceptSetField.vue'

const vuetify = createVuetify({ components, directives })

describe('EventConceptSetField', () => {
  it('renders the picker button when no concept set is selected', () => {
    const wrapper = mount(EventConceptSetField, {
      global: { plugins: [vuetify] },
      props: { conceptSet: undefined },
    })

    expect(wrapper.find('[data-testid=concept-set-picker]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=selected-concept-set]').exists()).toBe(false)
  })

  it('renders the selected chip when a concept set is provided', () => {
    const wrapper = mount(EventConceptSetField, {
      global: { plugins: [vuetify] },
      props: { conceptSet: { id: 7, name: 'My set' } },
    })

    expect(wrapper.find('[data-testid=selected-concept-set]').exists()).toBe(true)
    expect(wrapper.text()).toContain('My set')
  })

  it('emits "select" when the picker button is clicked', async () => {
    const wrapper = mount(EventConceptSetField, {
      global: { plugins: [vuetify] },
      props: { conceptSet: undefined },
    })

    await wrapper.find('[data-testid=concept-set-picker]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('emits "edit" with the concept set when the chip is clicked', async () => {
    const cs = { id: 7, name: 'My set' }
    const wrapper = mount(EventConceptSetField, {
      global: { plugins: [vuetify] },
      props: { conceptSet: cs },
    })

    await wrapper.find('[data-testid=selected-concept-set]').trigger('click')
    expect(wrapper.emitted('edit')?.[0]).toEqual([cs])
  })

  it('renders a custom title label when provided', () => {
    const wrapper = mount(EventConceptSetField, {
      global: { plugins: [vuetify] },
      props: { conceptSet: undefined, label: 'Codeset' },
    })

    expect(wrapper.text()).toContain('Codeset')
  })
})
