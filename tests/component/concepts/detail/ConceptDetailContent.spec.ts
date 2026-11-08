import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptDetailContent from '@/components/concepts/detail/ConceptDetailContent.vue'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

function concept(conceptId: number, domainId = 'Condition'): Concept {
  return {
    conceptId,
    conceptName: `Concept ${conceptId}`,
    conceptCode: String(conceptId),
    domainId,
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

const HeaderStub = {
  name: 'ConceptDetailHeader',
  props: ['concept', 'onBack', 'loading', 'stale'],
  emits: ['add-to-concept-set'],
  template: '<div class="header-stub" />',
}
const MiniMapStub = {
  name: 'ConceptHierarchyMiniMap',
  props: ['concept', 'parents', 'children', 'sourceKey', 'loadFailed'],
  emits: ['navigate'],
  template: '<div />',
}
const RelatedStub = {
  name: 'ConceptRelatedTable',
  props: ['related', 'sourceKey'],
  emits: ['navigate', 'add-concepts'],
  template: '<div />',
}

function mountContent(props: { sourceKey: string; conceptId: number; onBack?: () => void }) {
  return mount(ConceptDetailContent, {
    props,
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: {
        ConceptDetailHeader: HeaderStub,
        ConceptHierarchyMiniMap: MiniMapStub,
        ConceptRelatedTable: RelatedStub,
        ConceptStatCards: true,
        ConceptAttributesCard: true,
        DrilldownDetails: true,
      },
    },
  })
}

describe('ConceptDetailContent', () => {
  let detail: ReturnType<typeof useConceptDetailStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    detail = useConceptDetailStore()
    vi.spyOn(detail, 'loadConcept').mockResolvedValue()
    vi.spyOn(detail, 'loadDrilldown').mockResolvedValue()
  })

  it('loads the concept and its drilldown for the given source', async () => {
    mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    expect(detail.loadConcept).toHaveBeenCalledWith('OHDSI', 7)
    expect(detail.loadDrilldown).toHaveBeenCalledWith('OHDSI')
  })

  it('does not load until it has both a source and a concept', async () => {
    mountContent({ sourceKey: '', conceptId: 7 })
    await flushPromises()

    expect(detail.loadConcept).not.toHaveBeenCalled()
    expect(detail.loadDrilldown).not.toHaveBeenCalled()
  })

  it('passes the host back handler to the header', async () => {
    detail.concept = concept(7)
    const onBack = vi.fn()
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7, onBack })
    await flushPromises()

    expect(wrapper.findComponent(HeaderStub).props('onBack')).toBe(onBack)
  })

  it('forwards navigation from the hierarchy and related concepts to its host', async () => {
    detail.concept = concept(7)
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    wrapper.findComponent(MiniMapStub).vm.$emit('navigate', 11)
    wrapper.findComponent(RelatedStub).vm.$emit('navigate', 12)

    expect(wrapper.emitted('navigate')).toEqual([[11], [12]])
  })

  it('adds the shown concept to the open set and confirms it', async () => {
    const sets = useConceptSetsStore()
    sets.openCreateEditor(undefined, 'Diabetes')
    detail.concept = concept(7)
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    wrapper.findComponent(HeaderStub).vm.$emit('add-to-concept-set', concept(7))
    await flushPromises()

    expect(sets.currentSet?.name).toBe('Diabetes')
    expect(sets.currentSet?.items).toEqual([expect.objectContaining({ conceptId: 7 })])
    const snackbar = wrapper.findComponent({ name: 'AtlasSnackbar' })
    expect(snackbar.props('modelValue')).toBe(true)

    snackbar.vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('modelValue')).toBe(false)
  })

  it('starts a new set when adding with none open', async () => {
    const sets = useConceptSetsStore()
    detail.concept = concept(7)
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    wrapper.findComponent(HeaderStub).vm.$emit('add-to-concept-set', concept(7))
    await flushPromises()

    expect(sets.currentSet?.items).toEqual([expect.objectContaining({ conceptId: 7 })])
  })

  it('adds related concepts to the open set and reports how many were added', async () => {
    const sets = useConceptSetsStore()
    sets.openCreateEditor(undefined, 'Diabetes')
    detail.concept = concept(7)
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    wrapper.findComponent(RelatedStub).vm.$emit('add-concepts', [concept(8), concept(9)], {
      includeDescendants: true,
      includeMapped: false,
      isExcluded: false,
    })
    await flushPromises()

    expect(sets.currentSet?.items.map(i => i.conceptId)).toEqual([8, 9])
    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('modelValue')).toBe(true)
  })

  it('reports nothing added when no set could be opened', async () => {
    const sets = useConceptSetsStore()
    vi.spyOn(sets, 'openCreateEditor').mockImplementation(() => {})
    detail.concept = concept(7)
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    wrapper.findComponent(RelatedStub).vm.$emit('add-concepts', [concept(8)], {
      includeDescendants: false,
      includeMapped: false,
      isExcluded: false,
    })
    await flushPromises()

    expect(sets.currentSet).toBeNull()
    const feedback = (wrapper.vm as unknown as { feedback: { open: boolean; text: string } }).feedback
    expect(feedback.open).toBe(true)
    expect(feedback.text).toMatch(/0/)
  })

  it('shows drilldown reports only for domains that have them', async () => {
    detail.concept = concept(7, 'Condition')
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'DrilldownDetails' }).exists()).toBe(true)

    detail.concept = concept(7, 'Metadata')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'DrilldownDetails' }).exists()).toBe(false)
  })

  it('shows the load error instead of the concept', async () => {
    detail.concept = concept(7)
    detail.error = 'Unable to load concept'
    const wrapper = mountContent({ sourceKey: 'OHDSI', conceptId: 7 })
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load concept')
    expect(wrapper.findComponent(HeaderStub).exists()).toBe(false)
  })
})
