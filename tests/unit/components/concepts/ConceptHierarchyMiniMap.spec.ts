/**
 * ConceptHierarchyMiniMap Component Tests
 *
 * Covers issue #96: the "View full →" link must not navigate to a stand-alone
 * route. Since issue #161 it opens the ConceptHierarchyDialog rather than the
 * in-place concept detail drawer.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptHierarchyMiniMap from '@/components/concepts/detail/ConceptHierarchyMiniMap.vue'
import ConceptHierarchyDialog from '@/components/concepts/detail/ConceptHierarchyDialog.vue'
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'

// Mock the router so useRoute() resolves without a real router and so we can
// assert that no navigation is attempted.
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { sourceKey: '' } }),
  useRouter: () => ({ push: mockPush }),
  RouterLink: { template: '<a><slot /></a>' },
}))

// Mock the concept-detail drawer store. `state` is mutated per-test to model
// "drawer already open for this concept".
const drawerOpen = vi.fn()
const drawerState = {
  isOpen: false,
  sourceKey: '',
  conceptId: null as number | null,
}
vi.mock('@/stores/concept-detail-drawer', () => ({
  useConceptDetailDrawerStore: vi.fn(() => ({
    open: drawerOpen,
    close: vi.fn(),
    get isOpen() {
      return drawerState.isOpen
    },
    get sourceKey() {
      return drawerState.sourceKey
    },
    get conceptId() {
      return drawerState.conceptId
    },
  })),
}))

const vuetify = createVuetify({ components, directives })

const concept: Concept = {
  conceptId: 313217,
  conceptName: 'Atrial fibrillation',
  conceptCode: '49436004',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

const parents: RelatedConcept[] = [
  {
    conceptId: 44784217,
    conceptName: 'Cardiac arrhythmia',
    conceptCode: '698247007',
    vocabularyId: 'SNOMED',
    domainId: 'Condition',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [],
  },
]

const children: RelatedConcept[] = [
  {
    conceptId: 4154290,
    conceptName: 'Paroxysmal atrial fibrillation',
    conceptCode: '282825002',
    vocabularyId: 'SNOMED',
    domainId: 'Condition',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [],
  },
]

function mountComponent(props = {}) {
  return mount(ConceptHierarchyMiniMap, {
    props: {
      concept,
      parents,
      children,
      sourceKey: 'EUNOMIA',
      ...props,
    },
    global: {
      plugins: [vuetify],
    },
  })
}

describe('ConceptHierarchyMiniMap', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    drawerState.isOpen = false
    drawerState.sourceKey = ''
    drawerState.conceptId = null
  })

  it('renders the View full link when hierarchy is non-empty', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="view-full"]').exists()).toBe(true)
  })

  it('opens the hierarchy dialog rather than the concept-detail drawer when View full is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="view-full"]').trigger('click')

    expect(wrapper.findComponent(ConceptHierarchyDialog).props('modelValue')).toBe(true)
    expect(drawerOpen).not.toHaveBeenCalled()
  })

  it('does NOT navigate via the router when View full is clicked', async () => {
    const wrapper = mountComponent()
    await wrapper.find('[data-testid="view-full"]').trigger('click')

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('still shows View full when the drawer already shows this exact concept', () => {
    drawerState.isOpen = true
    drawerState.sourceKey = 'EUNOMIA'
    drawerState.conceptId = 313217

    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="view-full"]').exists()).toBe(true)
  })

  it('still shows View full when the drawer is open for a different concept', () => {
    drawerState.isOpen = true
    drawerState.sourceKey = 'EUNOMIA'
    drawerState.conceptId = 999999

    const wrapper = mountComponent()
    expect(wrapper.find('[data-testid="view-full"]').exists()).toBe(true)
  })

  it('does not render View full when there is no hierarchy', () => {
    const wrapper = mountComponent({ parents: [], children: [] })
    expect(wrapper.find('[data-testid="view-full"]').exists()).toBe(false)
  })

  it('does nothing when sourceKey is missing', () => {
    const wrapper = mountComponent({ sourceKey: '' })
    // With no sourceKey and an empty route param, the link is hidden entirely.
    expect(wrapper.find('[data-testid="view-full"]').exists()).toBe(false)
    expect(drawerOpen).not.toHaveBeenCalled()
  })
})
