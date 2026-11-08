import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'
import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import type { RelatedConcept } from '@/models/concept-detail.types'

const vuetify = createVuetify({ components, directives })

function related(conceptId: number, conceptName: string, relationships: string[]): RelatedConcept {
  return {
    conceptId,
    conceptName,
    conceptCode: String(conceptId),
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: relationships.map(relationshipName => ({ relationshipName, relationshipDistance: 1 })),
  }
}

const items = [
  related(201826, 'Type 2 diabetes mellitus', ['Maps to', 'Is a']),
  related(443238, 'Diabetic disorder', ['Subsumes']),
]

async function mountTable() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  await router.push('/')
  const wrapper = mount(ConceptRelatedTable, {
    props: { related: items, sourceKey: 'OHDSI' },
    global: { plugins: [vuetify, router] },
  })
  await flushPromises()
  return wrapper
}

function checkbox(wrapper: Awaited<ReturnType<typeof mountTable>>, testId: string) {
  return wrapper.find(`[data-testid="${testId}"] input[type="checkbox"]`)
}

describe('ConceptRelatedTable adding to the concept set', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the add options with the add button disabled until something is selected', async () => {
    const wrapper = await mountTable()
    expect(wrapper.find('[data-testid="related-add-options"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-option-descendants"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-option-exclude"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-selected"]').attributes('disabled')).toBeDefined()
  })

  it('emits the selected concepts once each, with the chosen flags', async () => {
    const wrapper = await mountTable()

    await checkbox(wrapper, 'related-select-201826').setValue(true)
    await wrapper.find('[data-testid="add-option-descendants"] input').setValue(true)
    await wrapper.find('[data-testid="add-option-exclude"] input').setValue(true)
    await wrapper.find('[data-testid="add-selected"]').trigger('click')

    const events = wrapper.emitted('add-concepts')
    expect(events).toHaveLength(1)
    const [concepts, flags] = events![0] as [Array<Record<string, unknown>>, Record<string, boolean>]
    expect(concepts.map(c => c.conceptId)).toEqual([201826])
    expect(concepts[0]).not.toHaveProperty('relationship')
    expect(flags).toEqual({ includeDescendants: true, isExcluded: true, includeMapped: false })
  })

  it('selects every visible concept once with the header checkbox and clears after adding', async () => {
    const wrapper = await mountTable()

    await checkbox(wrapper, 'related-select-all').setValue(true)
    expect(wrapper.find('[data-testid="add-selected"]').text()).toContain('(2)')

    await wrapper.find('[data-testid="add-selected"]').trigger('click')
    const [concepts] = wrapper.emitted('add-concepts')![0] as [Array<{ conceptId: number }>]
    expect(concepts.map(c => c.conceptId).sort()).toEqual([201826, 443238])
    expect(wrapper.find('[data-testid="add-selected"]').attributes('disabled')).toBeDefined()
  })

  it('unticks rows individually and with the header checkbox', async () => {
    const wrapper = await mountTable()

    await checkbox(wrapper, 'related-select-201826').setValue(true)
    expect(wrapper.find('[data-testid="add-selected"]').text()).toContain('(1)')
    await checkbox(wrapper, 'related-select-201826').setValue(false)
    expect(wrapper.find('[data-testid="add-selected"]').attributes('disabled')).toBeDefined()

    await checkbox(wrapper, 'related-select-all').setValue(true)
    await checkbox(wrapper, 'related-select-all').setValue(false)
    expect(wrapper.find('[data-testid="add-selected"]').attributes('disabled')).toBeDefined()
  })

  it('never adds a ticked concept that has been filtered out of view', async () => {
    const wrapper = await mountTable()
    await checkbox(wrapper, 'related-select-201826').setValue(true)

    wrapper.findComponent({ name: 'ConceptFacetFilters' }).vm.$emit('update:resultFilter', 'Diabetic')
    await flushPromises()
    ;(wrapper.vm as unknown as { onAddSelected: () => void }).onAddSelected()

    expect(wrapper.emitted('add-concepts')).toBeUndefined()
  })

  it('clears the selection when the related concepts change', async () => {
    const wrapper = await mountTable()
    await checkbox(wrapper, 'related-select-201826').setValue(true)

    await wrapper.setProps({ related: [...items] })

    expect(wrapper.find('[data-testid="add-selected"]').attributes('disabled')).toBeDefined()
  })

  it('shows the filtered-empty message when nothing matches', async () => {
    const wrapper = await mountTable()
    wrapper.findComponent({ name: 'ConceptFacetFilters' }).vm.$emit('update:resultFilter', 'zzz-no-match')
    await flushPromises()

    expect(wrapper.find('.empty').exists()).toBe(true)
  })
})
