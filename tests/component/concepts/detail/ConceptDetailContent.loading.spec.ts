import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptDetailContent from '@/components/concepts/detail/ConceptDetailContent.vue'
import { useConceptDetailStore } from '@/stores/concept-detail'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

function concept(conceptId: number): Concept {
  return {
    conceptId,
    conceptName: `Concept ${conceptId}`,
    conceptCode: String(conceptId),
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

const HeaderStub = {
  name: 'ConceptDetailHeader',
  props: ['concept', 'onBack', 'loading', 'stale'],
  template: '<div class="header-stub" />',
}

function mountContent(conceptId: number) {
  return mount(ConceptDetailContent, {
    props: { sourceKey: 'OHDSI', conceptId },
    global: {
      plugins: [createVuetify({ components, directives })],
      stubs: {
        ConceptDetailHeader: HeaderStub,
        ConceptRelatedTable: true,
        ConceptStatCards: true,
        ConceptAttributesCard: true,
        ConceptHierarchyMiniMap: { props: ['concept', 'parents', 'children', 'sourceKey', 'loadFailed'], template: '<div />' },
        DrilldownDetails: true,
      },
    },
  })
}

describe('ConceptDetailContent loading indicators', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows a viewport spinner and the header progress bar while another concept loads', async () => {
    const detail = useConceptDetailStore()
    let finish!: () => void
    vi.spyOn(detail, 'loadConcept').mockImplementation(() => {
      detail.isLoading = true
      return new Promise<void>(resolve => {
        finish = () => {
          detail.concept = concept(2)
          detail.isLoading = false
          resolve()
        }
      })
    })
    vi.spyOn(detail, 'loadDrilldown').mockResolvedValue()
    detail.concept = concept(1)

    const wrapper = mountContent(2)
    await flushPromises()

    expect(wrapper.find('[data-testid="concept-detail-loading-spinner"]').exists()).toBe(true)
    expect(wrapper.findComponent(HeaderStub).props()).toMatchObject({ loading: true, stale: true })
    // The header carries the bar now, so the top-of-content bar is not duplicated.
    expect(wrapper.find('.v-progress-linear').exists()).toBe(false)

    finish()
    await flushPromises()

    expect(wrapper.find('[data-testid="concept-detail-loading-spinner"]').exists()).toBe(false)
    expect(wrapper.findComponent(HeaderStub).props()).toMatchObject({ loading: false, stale: false })
  })

  it('keeps the top progress bar on first load, when there is no header yet', async () => {
    const detail = useConceptDetailStore()
    vi.spyOn(detail, 'loadConcept').mockImplementation(() => {
      detail.isLoading = true
      return new Promise<void>(() => {})
    })
    vi.spyOn(detail, 'loadDrilldown').mockResolvedValue()

    const wrapper = mountContent(2)
    await flushPromises()

    expect(wrapper.findComponent(HeaderStub).exists()).toBe(false)
    expect(wrapper.find('.v-progress-linear').exists()).toBe(true)
    expect(wrapper.find('[data-testid="concept-detail-loading-spinner"]').exists()).toBe(true)
  })
})
