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
