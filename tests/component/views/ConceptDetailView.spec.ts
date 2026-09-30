import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/services/concept-search.service', () => ({
  getConceptById: vi.fn().mockResolvedValue({
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '44054006',
    invalidReason: null,
  }),
  getConceptRecordCounts: vi.fn().mockResolvedValue(new Map()),
}))

vi.mock('@/services/concept-detail.service', () => ({
  ConceptDetailServiceError: class ConceptDetailServiceError extends Error {},
  getConceptRelated: vi.fn().mockResolvedValue([]),
  getConceptAncestorAndDescendant: vi.fn().mockResolvedValue([]),
  getConceptDrilldown: vi.fn().mockResolvedValue(null),
}))

import ConceptDetailView from '@/views/ConceptDetailView.vue'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptSetsStore } from '@/stores/concept-sets'

const ConceptDetailHeaderStub = defineComponent({
  name: 'ConceptDetailHeader',
  props: { concept: { type: Object, required: true } },
  emits: ['add-to-concept-set'],
  template: '<button @click="$emit(\'add-to-concept-set\', concept)">add</button>',
})

const ConceptHierarchyMiniMapStub = defineComponent({
  name: 'ConceptHierarchyMiniMap',
  inheritAttrs: false,
  emits: ['navigate'],
  template: '<button data-testid="hierarchy-navigate" @click="$emit(\'navigate\', 421326000)">navigate</button>',
})

describe('ConceptDetailView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function mountView(props = { sourceKey: 'SYNPUF1K', conceptId: 201826 }) {
    const vuetify = createVuetify({ components, directives })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/concept/:sourceKey/:conceptId', name: 'concept-detail', component: { template: '<div />' } }],
    })
    return mount(ConceptDetailView, {
      props,
      global: {
        plugins: [vuetify, router],
        stubs: {
          ConceptDetailHeader: ConceptDetailHeaderStub,
          ConceptStatCards: true,
          ConceptAttributesCard: true,
          ConceptHierarchyMiniMap: ConceptHierarchyMiniMapStub,
          ConceptRelatedTable: true,
          DrilldownDetails: true,
        },
      },
    })
  }

  it('mounts and triggers loadConcept on render', async () => {
    const wrapper = mountView()

    await wrapper.vm.$nextTick()
    await new Promise((r) => setTimeout(r, 0))

    expect(wrapper.find('[data-testid="concept-detail-view"]').exists()).toBe(true)
    expect(wrapper.findComponent(ConceptDetailHeaderStub).props('concept')).toMatchObject({ conceptId: 201826 })
    expect(wrapper.findComponent({ name: 'DrilldownDetails' }).exists()).toBe(true)
  })

  it('adds the displayed concept to a new set and shows feedback', async () => {
    const conceptSets = useConceptSetsStore()
    vi.spyOn(conceptSets, 'openCreateEditor').mockImplementation(() => undefined)
    vi.spyOn(conceptSets, 'addConceptToSet').mockImplementation(() => undefined)
    const wrapper = mountView()
    await new Promise((resolve) => setTimeout(resolve, 0))

    await wrapper.findComponent(ConceptDetailHeaderStub).vm.$emit('add-to-concept-set', useConceptDetailStore().concept)
    await wrapper.vm.$nextTick()

    expect(conceptSets.openCreateEditor).toHaveBeenCalled()
    expect(conceptSets.addConceptToSet).toHaveBeenCalledWith(expect.objectContaining({ conceptId: 201826 }))
    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('text')).toContain('Type 2 diabetes mellitus')
  })

  it('reloads when its source or concept changes and displays store errors', async () => {
    const wrapper = mountView()
    await new Promise((resolve) => setTimeout(resolve, 0))
    const store = useConceptDetailStore()
    const loadConcept = vi.spyOn(store, 'loadConcept')
    const loadDrilldown = vi.spyOn(store, 'loadDrilldown')

    await wrapper.setProps({ sourceKey: 'NEW_SOURCE', conceptId: 2 })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(loadConcept).toHaveBeenCalledWith('NEW_SOURCE', 2)
    expect(loadDrilldown).toHaveBeenCalledWith('NEW_SOURCE')

    store.error = 'Unable to load concept'
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Unable to load concept')
  })

  it('updates the standalone concept-detail route when hierarchy navigation selects a concept', async () => {
    const wrapper = mountView()
    const router = wrapper.vm.$router

    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.find('[data-testid="hierarchy-navigate"]').trigger('click')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('concept-detail')
    expect(router.currentRoute.value.params).toMatchObject({
      sourceKey: 'SYNPUF1K',
      conceptId: '421326000',
    })
  })
})
