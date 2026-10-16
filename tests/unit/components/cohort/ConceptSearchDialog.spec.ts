/**
 * ConceptSearchDialog adapter tests
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSearchDialog from '@/components/cohort/ConceptSearchDialog.vue'
import { createMockConcept } from '../../../helpers/mock-factories'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/components/concepts/ConceptSearchInline.vue', () => ({
  default: {
    name: 'ConceptSearchInline',
    template: '<div class="concept-search-inline-mock"></div>',
    props: {
      selectionMode: Boolean,
      domainFilter: String,
      preselectedConceptIds: Array,
    },
    emits: ['selection-complete', 'selection-cancelled'],
  },
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(ConceptSearchDialog, {
    props: { modelValue: true, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('ConceptSearchDialog', () => {
  it('mounts the robust search in selection mode', () => {
    const wrapper = mountComponent({
      domainFilter: 'Gender',
      preSelectedConcepts: [createMockConcept({ conceptId: 8507 })],
    })

    const search = wrapper.findComponent({ name: 'ConceptSearchInline' })
    expect(search.props('selectionMode')).toBe(true)
    expect(search.props('domainFilter')).toBe('Gender')
    expect(search.props('preselectedConceptIds')).toEqual([8507])
  })

  it('uses an empty preselection when no concepts are supplied', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'ConceptSearchInline' }).props('preselectedConceptIds')).toEqual([])
  })

  it('forwards completed selections and closes the dialog', async () => {
    const wrapper = mountComponent()
    const concepts = [createMockConcept({ conceptId: 8507, conceptName: 'MALE' })]

    wrapper.findComponent({ name: 'ConceptSearchInline' }).vm.$emit('selection-complete', concepts)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('concepts-selected')?.[0]).toEqual([concepts])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('closes without emitting concepts when selection is cancelled', async () => {
    const wrapper = mountComponent()

    wrapper.findComponent({ name: 'ConceptSearchInline' }).vm.$emit('selection-cancelled')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('concepts-selected')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('forwards dialog model updates to its owner', async () => {
    const wrapper = mountComponent()

    wrapper.findComponent({ name: 'AtlasDialog' }).vm.$emit('update:modelValue', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
