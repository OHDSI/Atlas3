import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (_k: string, fallback?: string) => ({ value: fallback ?? _k }),
    tv: (_k: string, fallback?: string) => fallback ?? _k,
  }),
}))
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))
vi.mock('@/composables/useEntityAccess', () => ({
  useEntityAccess: () => ({ canWrite: { value: true }, canDelete: { value: true } }),
}))
vi.mock('@/services/concept-set-versions.service', () => ({
  getVersions: () => Promise.resolve([]),
}))

const vuetify = createVuetify({ components, directives })

const globalStubs = {
  VNavigationDrawer: {
    template: '<div class="v-navigation-drawer"><slot /></div>',
  },
  Teleport: { template: '<div><slot /></div>' },
}

describe('ConceptSetEditor — Included tab', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the Included tab with the resolved item count', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { id: 1, name: 's', items: [] }

    const wrapper = mount(ConceptSetEditor, {
      global: { plugins: [vuetify], stubs: globalStubs },
      props: { modelValue: true, conceptSet: { id: 1, name: 's', items: [] } },
    })
    await wrapper.vm.$nextTick()

    store.includedItems = [
      {
        conceptId: 1,
        conceptName: 'A',
        conceptCode: '1',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'X',
        standardConcept: 'S',
        invalidReason: null,
      },
    ]
    await wrapper.vm.$nextTick()

    const tabs = wrapper.findAll('[role="tab"]').map((t) => t.text())
    expect(tabs.some((t) => /Included/.test(t))).toBe(true)
    expect(wrapper.text()).toMatch(/Included[\s\S]*1/)
  })

  it('calls store.resetIncluded when the drawer closes', async () => {
    const store = useConceptSetsStore()
    const spy = vi.spyOn(store, 'resetIncluded')

    const wrapper = mount(ConceptSetEditor, {
      global: { plugins: [vuetify], stubs: globalStubs },
      props: { modelValue: true, conceptSet: { id: 1, name: 's', items: [] } },
    })
    await wrapper.setProps({ modelValue: false })

    expect(spy).toHaveBeenCalledTimes(1)
  })
})

/**
 * Issue #224. The Included and Source Codes tabs list the resolved expansion of
 * the expression, not its items, so adding from them adds a new item and the
 * lists have to be re-resolved or the row the user just excluded stays put.
 */
describe('ConceptSetEditor — adding from a resolved tab (#224)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const concept = (id: number) => ({
    conceptId: id,
    conceptName: `Concept ${id}`,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  })

  // v-window renders only the open tab, so the Included table does not exist
  // until that tab is selected.
  async function mountEditor() {
    const wrapper = mount(ConceptSetEditor, {
      global: { plugins: [vuetify], stubs: globalStubs },
      props: { modelValue: true, conceptSet: { id: 1, name: 's', items: [] } },
    })
    ;(wrapper.vm as unknown as { activeTab: string }).activeTab = 'included'
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('adds the concepts to the expression with the flags it was given', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { id: 1, name: 's', items: [] }
    const wrapper = await mountEditor()

    const table = wrapper.findComponent({ name: 'IncludedConceptsTable' })
    table.vm.$emit('add-concepts', [concept(1), concept(2)], {
      isExcluded: true,
      includeDescendants: false,
      includeMapped: false,
    })
    await wrapper.vm.$nextTick()

    expect(store.currentSet!.items).toHaveLength(2)
    expect(store.currentSet!.items.every(i => i.isExcluded)).toBe(true)
    expect(store.currentSet!.items.map(i => i.conceptId)).toEqual([1, 2])
  })

  // Without this the excluded row sits there unchanged and it looks like the
  // click did nothing.
  it('re-resolves the included list so the excluded row disappears', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { id: 1, name: 's', items: [] }
    const resolveIncluded = vi.spyOn(store, 'resolveIncluded').mockResolvedValue()
    const wrapper = await mountEditor()
    resolveIncluded.mockClear()

    wrapper.findComponent({ name: 'IncludedConceptsTable' }).vm.$emit(
      'add-concepts',
      [concept(1)],
      { isExcluded: true, includeDescendants: false, includeMapped: false }
    )
    await wrapper.vm.$nextTick()

    expect(resolveIncluded).toHaveBeenCalled()
  })
})
