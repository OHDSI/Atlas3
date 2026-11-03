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

function concept(conceptId: number, conceptName: string): Concept {
  return {
    conceptId,
    conceptName,
    conceptCode: String(conceptId),
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

const RelatedTableStub = {
  name: 'ConceptRelatedTable',
  emits: ['add-concepts'],
  template: '<div class="related-stub" />',
}

async function mountContent() {
  const detail = useConceptDetailStore()
  vi.spyOn(detail, 'loadConcept').mockResolvedValue()
  vi.spyOn(detail, 'loadDrilldown').mockResolvedValue()
  detail.concept = concept(44054006, 'Source code')

  const wrapper = mount(ConceptDetailContent, {
    props: { sourceKey: 'OHDSI', conceptId: 44054006 },
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: {
        ConceptRelatedTable: RelatedTableStub,
        ConceptDetailHeader: true,
        ConceptStatCards: true,
        ConceptAttributesCard: true,
        ConceptHierarchyMiniMap: { props: ['concept', 'parents', 'children', 'sourceKey', 'loadFailed'], template: '<div />' },
        DrilldownDetails: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ConceptDetailContent adding related concepts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds every emitted concept to the open set with the chosen flags', async () => {
    const sets = useConceptSetsStore()
    sets.openCreateEditor(undefined, 'Diabetes')
    const wrapper = await mountContent()

    const flags = { includeDescendants: true, isExcluded: false, includeMapped: true }
    wrapper
      .findComponent({ name: 'ConceptRelatedTable' })
      .vm.$emit('add-concepts', [concept(201826, 'T2DM'), concept(443238, 'Diabetic disorder')], flags)
    await flushPromises()

    expect(sets.currentSet?.name).toBe('Diabetes')
    expect(sets.currentSet?.items).toEqual([
      expect.objectContaining({ conceptId: 201826, ...flags }),
      expect.objectContaining({ conceptId: 443238, ...flags }),
    ])
  })

  it('creates a new set when none is open', async () => {
    const sets = useConceptSetsStore()
    const wrapper = await mountContent()

    wrapper
      .findComponent({ name: 'ConceptRelatedTable' })
      .vm.$emit('add-concepts', [concept(201826, 'T2DM')], {
        includeDescendants: false,
        isExcluded: true,
        includeMapped: false,
      })
    await flushPromises()

    expect(sets.currentSet?.items).toEqual([
      expect.objectContaining({ conceptId: 201826, isExcluded: true }),
    ])
  })
})
