import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/concept-detail.service', () => ({
  fetchConceptAncestorAndDescendant: vi.fn(),
}))
vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: vi.fn(),
}))

import ConceptHierarchyDialog from '@/components/concepts/detail/ConceptHierarchyDialog.vue'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { fetchConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import {
  PNEUMONIA_ANCESTOR_AND_DESCENDANT,
  INFECTIVE_PNEUMONIA_PAYLOAD,
  INFECTIVE_PNEUMONIA_CHILDREN,
} from '../../../fixtures/concept-hierarchy'
import type { Concept } from '@/models/concept-set.types'
import type { Mock } from 'vitest'

const vuetify = createVuetify({ components, directives })

const concept: Concept = {
  conceptId: 255848,
  conceptName: 'Pneumonia',
  conceptCode: '233604007',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

let activeWrapper: VueWrapper | null = null

// AtlasDialog teleports its content straight into document.body, so tests
// query document.body rather than the wrapper's own tree. Nothing unmounts
// that automatically between tests, so a leftover dialog from a prior test
// would still satisfy document.querySelector lookups here — track and
// unmount the wrapper after each test to keep body clean.
function mountDialog(overrides: Partial<{ concept: Concept }> = {}) {
  activeWrapper = mount(ConceptHierarchyDialog, {
    props: { modelValue: true, concept: overrides.concept ?? concept, sourceKey: 'SYNPUF1K' },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
  return activeWrapper
}

describe('ConceptHierarchyDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())
    ;(fetchConceptAncestorAndDescendant as Mock).mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    useConceptDetailStore().hierarchy = PNEUMONIA_ANCESTOR_AND_DESCENDANT
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
    document.body.innerHTML = ''
  })

  it('renders every direct child without truncating', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const rows = document.querySelectorAll('[data-descendant-row]')
    expect(rows).toHaveLength(31)
    expect(document.body.textContent).not.toContain('more descendants')
  })

  it('shows code, class, domain and vocabulary for each row', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const row = document.querySelector('[data-testid="hierarchy-row-4309106"]')
    expect(row?.textContent).toContain('Aspiration pneumonia')
    expect(row?.textContent).toContain('422588002')
    expect(row?.textContent).toContain('Disorder')
    expect(row?.textContent).toContain('Condition')
    expect(row?.textContent).toContain('SNOMED')
  })

  it('lists direct ancestors and highlights the anchor concept', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('Pneumonitis')
    expect(document.body.textContent).toContain('Lung consolidation')
    expect(document.querySelector('[data-testid="hierarchy-anchor"]')?.textContent).toContain(
      'Pneumonia'
    )
  })

  it('expands a node and renders its children indented', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(fetchConceptAncestorAndDescendant).toHaveBeenCalledWith('SYNPUF1K', 443410)
    for (const child of INFECTIVE_PNEUMONIA_CHILDREN) {
      expect(document.body.textContent).toContain(child.conceptName)
    }
  })

  it('drops the chevron when a node turns out to have no children', async () => {
    (fetchConceptAncestorAndDescendant as Mock).mockResolvedValue([])
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-4309106"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-expand-4309106"]')).toBeNull()
  })

  it('offers a retry when expanding fails', async () => {
    (fetchConceptAncestorAndDescendant as Mock).mockRejectedValue(new Error('boom'))
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-retry-443410"]')).not.toBeNull()
  })

  it('reports non-standard concepts as having no hierarchy', async () => {
    useConceptDetailStore().hierarchy = []
    const wrapper = mountDialog({ concept: { ...concept, standardConcept: 'N' } })
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('No hierarchy found for non-standard concepts.')
  })
})
