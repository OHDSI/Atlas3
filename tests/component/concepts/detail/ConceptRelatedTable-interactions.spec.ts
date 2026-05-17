/**
 * ConceptRelatedTable interaction tests
 *
 * Triggers the inline `openConceptDetail` link handler so the script-block
 * function registers on v8's function map. The existing render-only spec
 * leaves function coverage at 0%.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'

import ConceptRelatedTable from '@/components/concepts/detail/ConceptRelatedTable.vue'
import { useConceptDetailDrawerStore } from '@/stores/concept-detail-drawer'
import type { RelatedConcept } from '@/models/concept-detail.types'

const vuetify = createVuetify({ components, directives })

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
]

function mountWith(sourceKey: string | undefined, items: RelatedConcept[] = related) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/c/:sourceKey?', name: 'c', component: { template: '<div />' } },
    ],
  })
  router.push(sourceKey ? `/c/${sourceKey}` : '/c/')
  return router.isReady().then(() =>
    mount(ConceptRelatedTable, {
      props: { related: items },
      global: {
        plugins: [vuetify, router],
        stubs: {
          AtlasDataTable: {
            name: 'AtlasDataTable',
            props: ['headers', 'items'],
            template:
              '<div class="stub-table">' +
              '<div v-for="(item, i) in items" :key="i" class="stub-row">' +
              '<slot :name="\'item.relationship\'" :item="item" />' +
              '<slot :name="\'item.conceptName\'" :item="item" />' +
              '<slot :name="\'item.standardConcept\'" :item="item" />' +
              '</div>' +
              '</div>',
          },
        },
      },
    })
  )
}

describe('ConceptRelatedTable interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('opens the concept-detail drawer when a concept link is clicked', async () => {
    const wrapper = await mountWith('OHDSI')
    await flushPromises()
    const drawer = useConceptDetailDrawerStore()
    const openSpy = vi.spyOn(drawer, 'open')
    const link = wrapper.find('a.concept-link')
    expect(link.exists()).toBe(true)
    await link.trigger('click')
    expect(openSpy).toHaveBeenCalledWith('OHDSI', 73211009)
  })

  it('does not open the drawer when sourceKey is empty', async () => {
    const wrapper = await mountWith(undefined)
    await flushPromises()
    const drawer = useConceptDetailDrawerStore()
    const openSpy = vi.spyOn(drawer, 'open')
    await wrapper.find('a.concept-link').trigger('click')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('renders standard-concept chip variants for S / C / null', async () => {
    const items: RelatedConcept[] = [
      { ...related[0]!, standardConcept: 'S' },
      { ...related[0]!, conceptId: 2, standardConcept: 'C' },
      { ...related[0]!, conceptId: 3, standardConcept: null },
    ]
    const wrapper = await mountWith('OHDSI', items)
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain('S')
    expect(text).toContain('C')
    expect(text).toMatch(/—|—/)
  })
})
