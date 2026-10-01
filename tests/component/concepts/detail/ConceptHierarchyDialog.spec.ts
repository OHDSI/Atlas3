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
  ConceptDetailServiceError: class ConceptDetailServiceError extends Error {},
  getConceptRelated: vi.fn(),
  getConceptAncestorAndDescendant: vi.fn(),
  getConceptDrilldown: vi.fn(),
}))
vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: vi.fn(),
}))

import ConceptHierarchyDialog from '@/components/concepts/detail/ConceptHierarchyDialog.vue'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { getConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import {
  PNEUMONIA_ANCESTOR_AND_DESCENDANT,
  INFECTIVE_PNEUMONIA_PAYLOAD,
} from '../../../fixtures/concept-hierarchy'
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'
import type { Mock } from 'vitest'

const vuetify = createVuetify({ components, directives })

function relatedConcept(
  conceptId: number,
  conceptName: string,
  overrides: Partial<RelatedConcept> = {}
): RelatedConcept {
  return {
    conceptId,
    conceptName,
    conceptCode: `code-${conceptId}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Disorder',
    standardConcept: 'S',
    invalidReason: null,
    relationships: [{ relationshipName: 'Has descendant of', relationshipDistance: 1 }],
    ...overrides,
  }
}

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
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
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

  it('collapses ancestors to the direct parents by default', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const directAncestors = PNEUMONIA_ANCESTOR_AND_DESCENDANT.filter(c =>
      c.relationships.some(r => r.relationshipName === 'Has ancestor of' && r.relationshipDistance === 1)
    ).length

    const rows = [...document.querySelectorAll('[data-ancestor-row]')]
    expect(rows).toHaveLength(directAncestors)
    expect(rows.map(row => row.getAttribute('data-testid'))).toEqual(
      expect.arrayContaining(['hierarchy-row-253506', 'hierarchy-row-4318404'])
    )
    expect(document.querySelector('[data-testid="hierarchy-row-257907"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-253506"]')?.textContent).not.toContain(
      'distance'
    )
  })

  it('states how many ancestors are hidden while collapsed', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const toggle = document.querySelector('[data-testid="hierarchy-ancestors-toggle"]')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
    expect(toggle?.textContent).toContain('1 more ancestor')
  })

  it('expands to every ancestor at every distance, matching the advertised count — the guarantee the header/rows mismatch review already caught', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const advertised = PNEUMONIA_ANCESTOR_AND_DESCENDANT.filter(c =>
      c.relationships.some(r => r.relationshipName === 'Has ancestor of')
    ).length

    const toggle = document.querySelector('[data-testid="hierarchy-ancestors-toggle"]') as HTMLElement
    toggle.click()
    await wrapper.vm.$nextTick()

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelectorAll('[data-ancestor-row]')).toHaveLength(advertised)
    expect(document.body.textContent).toContain(`${advertised} ancestors`)
    expect(document.querySelector('[data-testid="hierarchy-row-257907"]')?.textContent).toContain(
      'distance 2'
    )
  })

  it('collapses the ancestor list back after expanding it', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const toggle = document.querySelector('[data-testid="hierarchy-ancestors-toggle"]') as HTMLElement
    toggle.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('[data-ancestor-row]')).toHaveLength(3)

    toggle.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('[data-ancestor-row]')).toHaveLength(2)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('collapses ancestors again when the drawer switches to a different concept', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const toggle = document.querySelector('[data-testid="hierarchy-ancestors-toggle"]') as HTMLElement
    toggle.click()
    await wrapper.vm.$nextTick()
    expect(document.querySelectorAll('[data-ancestor-row]')).toHaveLength(3)

    // Same dialog instance, new concept — the drawer reuses it without
    // remounting, so an expand toggled for the old concept must not leak
    // into the next one rendering pre-expanded.
    await wrapper.setProps({
      concept: { ...concept, conceptId: 4025165, conceptName: 'Abscess of lung with pneumonia' },
    })
    await wrapper.vm.$nextTick()

    expect(document.querySelectorAll('[data-ancestor-row]')).toHaveLength(2)
    expect(
      document.querySelector('[data-testid="hierarchy-ancestors-toggle"]')?.getAttribute('aria-expanded')
    ).toBe('false')
  })

  it('orders ancestors most-distant first so the chain reads down into the anchor', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const toggle = document.querySelector('[data-testid="hierarchy-ancestors-toggle"]') as HTMLElement
    toggle.click()
    await wrapper.vm.$nextTick()

    const order = [...document.querySelectorAll('[data-ancestor-row]')].map(row =>
      row.getAttribute('data-testid')
    )

    // 257907 "Disorder of lung" is the fixture's only distance-2 ancestor, so it
    // must lead, with the two distance-1 parents settling next to the anchor.
    expect(order[0]).toBe('hierarchy-row-257907')
    expect(order.slice(1)).toEqual(
      expect.arrayContaining(['hierarchy-row-253506', 'hierarchy-row-4318404'])
    )
  })

  it('loads record counts for the rows visible on open, before any expansion', async () => {
    (getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([
        [
          4309106,
          {
            recordCount: 1234567,
            descendantRecordCount: 2345678,
            personCount: 10,
            descendantPersonCount: 20,
          },
        ],
        [
          253506,
          { recordCount: 42, descendantRecordCount: 99, personCount: 1, descendantPersonCount: 2 },
        ],
      ])
    )
    useConceptDetailStore().recordCountsBySource = new Map([
      [
        'SYNPUF1K',
        {
          recordCount: 7654321,
          descendantRecordCount: 8765432,
          personCount: 5,
          descendantPersonCount: 6,
        },
      ],
    ])

    const wrapper = mountDialog()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(getConceptRecordCounts).toHaveBeenCalledWith(
      'SYNPUF1K',
      expect.arrayContaining([4309106, 253506])
    )
    expect(getConceptAncestorAndDescendant).not.toHaveBeenCalled()
    expect(document.querySelector('[data-testid="hierarchy-row-4309106"]')?.textContent).toContain(
      '1,234,567'
    )
    expect(document.querySelector('[data-testid="hierarchy-row-253506"]')?.textContent).toContain(
      '42'
    )
    expect(document.querySelector('[data-testid="hierarchy-anchor"]')?.textContent).toContain(
      '7,654,321'
    )
  })

  it('sorts ancestor and descendant rows independently by each count column', async () => {
    useConceptDetailStore().hierarchy = [
      relatedConcept(101, 'Ancestor with more records', {
        relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
      }),
      relatedConcept(102, 'Ancestor with fewer records', {
        relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
      }),
      relatedConcept(201, 'Descendant with more records'),
      relatedConcept(202, 'Descendant with fewer records'),
    ]
    ;(getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([
        [101, { recordCount: 20, descendantRecordCount: 1, personCount: 1, descendantPersonCount: 1 }],
        [102, { recordCount: 10, descendantRecordCount: 2, personCount: 1, descendantPersonCount: 1 }],
        [201, { recordCount: 40, descendantRecordCount: 3, personCount: 1, descendantPersonCount: 1 }],
        [202, { recordCount: 30, descendantRecordCount: 4, personCount: 1, descendantPersonCount: 1 }],
      ])
    )
    const wrapper = mountDialog()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-sort-rc"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect([...document.querySelectorAll('[data-ancestor-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-102', 'hierarchy-row-101'])
    expect([...document.querySelectorAll('[data-descendant-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-202', 'hierarchy-row-201'])

    ;(document.querySelector('[data-testid="hierarchy-sort-rc"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect([...document.querySelectorAll('[data-ancestor-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-101', 'hierarchy-row-102'])
    expect([...document.querySelectorAll('[data-descendant-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-201', 'hierarchy-row-202'])

    ;(document.querySelector('[data-testid="hierarchy-sort-drc"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect([...document.querySelectorAll('[data-ancestor-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-101', 'hierarchy-row-102'])
    expect([...document.querySelectorAll('[data-descendant-row]')].map(row => row.getAttribute('data-testid')))
      .toEqual(['hierarchy-row-201', 'hierarchy-row-202'])
  })

  it('keeps Tabular as the default view and opens a separate Tree tab', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('.hierarchy-table')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-tree"]')).toBeNull()

    ;(document.querySelector('[data-testid="hierarchy-view-tree"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-tree"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-filter"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-tree-ancestor-253506"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-tree-ancestor-257907"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-tree-anchor"]')?.textContent).toContain('Pneumonia')
  })

  it('loads, collapses, and reuses cached direct children from the Tree tab', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-tree"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    ;(getConceptAncestorAndDescendant as Mock).mockClear()

    ;(document.querySelector('[data-testid="hierarchy-expand-443410"]') as HTMLElement).click()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(getConceptAncestorAndDescendant).toHaveBeenCalledWith('SYNPUF1K', 443410)
    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')).not.toBeNull()

    ;(document.querySelector('[data-testid="hierarchy-expand-443410"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')).toBeNull()

    ;(document.querySelector('[data-testid="hierarchy-expand-443410"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(getConceptAncestorAndDescendant).toHaveBeenCalledTimes(1)
    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')).not.toBeNull()
  })

  it('refocuses the dialog when a Tree ancestor is clicked', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-tree"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-tree-navigate-253506"]') as HTMLElement).click()

    expect(wrapper.emitted('navigate')).toEqual([[253506]])
  })

  it('shows per-node loading, failure retry, and leaf states in the Tree tab', async () => {
    let resolveChildren: ((rows: RelatedConcept[]) => void) | undefined
    ;(getConceptAncestorAndDescendant as Mock).mockImplementationOnce(
      () => new Promise<RelatedConcept[]>(resolve => { resolveChildren = resolve })
    )
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-tree"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-expand-443410"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()
    expect(document.querySelector('[data-testid="hierarchy-loading-443410"]')).not.toBeNull()

    resolveChildren!(INFECTIVE_PNEUMONIA_PAYLOAD)
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    ;(getConceptAncestorAndDescendant as Mock).mockRejectedValueOnce(new Error('children unavailable'))
    ;(document.querySelector('[data-testid="hierarchy-expand-4309106"]') as HTMLElement).click()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('[data-testid="hierarchy-retry-4309106"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-expand-4309106"]')).toBeNull()

    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValueOnce([])
    ;(document.querySelector('[data-testid="hierarchy-retry-4309106"]') as HTMLElement).click()
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()
    expect(document.querySelector('[data-testid="hierarchy-retry-4309106"]')).toBeNull()
    const leafIndicator = document.querySelector('[data-testid="hierarchy-expand-4309106"]')
    expect(leafIndicator).not.toBeNull()
    expect(leafIndicator?.getAttribute('aria-hidden')).toBe('true')
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

  it('separates ancestor, current concept, and descendant rows into ordered sections', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const ancestors = document.querySelector('[data-testid="hierarchy-ancestors-section"]')
    const current = document.querySelector('[data-testid="hierarchy-current-section"]')
    const descendants = document.querySelector('[data-testid="hierarchy-descendants-section"]')

    expect(ancestors).not.toBeNull()
    expect(current).not.toBeNull()
    expect(descendants).not.toBeNull()
    expect(ancestors?.compareDocumentPosition(current!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(current?.compareDocumentPosition(descendants!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('emits navigation when a hierarchy concept is clicked', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-navigate-4309106"]') as HTMLElement).click()

    expect(wrapper.emitted('navigate')).toEqual([[4309106]])
  })

  it('updates the dialog header to the clicked concept while its details load', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-navigate-4309106"]') as HTMLElement).click()
    useConceptDetailStore().isLoading = true
    await wrapper.vm.$nextTick()

    expect(document.querySelector('.atlas-dialog__title')?.textContent).toContain('Aspiration pneumonia')
    expect(document.querySelector('.atlas-dialog__subtitle')?.textContent).toContain('4309106')
  })

  it('reports an empty hierarchy for a standard concept with no ancestors or descendants', async () => {
    useConceptDetailStore().hierarchy = []
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-empty"]')?.textContent).toContain(
      'No hierarchy found for this concept.'
    )
    expect(document.body.textContent).not.toContain('No hierarchy found for non-standard concepts.')
  })

  it('reports a failed hierarchy fetch instead of claiming the concept has none', async () => {
    const detail = useConceptDetailStore()
    detail.hierarchy = []
    detail.hierarchyError = 'Failed to load hierarchy'
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-load-failed"]')?.textContent).toContain(
      'Could not load the hierarchy for this concept.'
    )
    expect(document.querySelector('[data-testid="hierarchy-empty"]')).toBeNull()
    expect(document.body.textContent).not.toContain('No hierarchy found for this concept.')
  })

  it('reports non-standard concepts as having no hierarchy', async () => {
    useConceptDetailStore().hierarchy = []
    const wrapper = mountDialog({ concept: { ...concept, standardConcept: 'N' } })
    await wrapper.vm.$nextTick()

    expect(document.body.textContent).toContain('No hierarchy found for non-standard concepts.')
  })

  it('loads only the clicked hierarchy while root details reload in the background', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    // The drawer starts a full detail reload after navigation, but that shared
    // loading flag must not hide the hierarchy currently visible in the dialog.
    useConceptDetailStore().isLoading = true
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-loading"]')).toBeNull()
    expect(document.querySelector('.hierarchy-table')).not.toBeNull()

    let resolveHierarchy: ((rows: RelatedConcept[]) => void) | undefined
    ;(getConceptAncestorAndDescendant as Mock).mockImplementationOnce(
      () => new Promise<RelatedConcept[]>(resolve => { resolveHierarchy = resolve })
    )
    ;(document.querySelector('[data-testid="hierarchy-navigate-4309106"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-loading"]')?.textContent).toContain(
      'Loading hierarchy'
    )
    expect(document.querySelector('[data-testid="hierarchy-filter"]')).toBeNull()
    expect(document.querySelector('.hierarchy-table')).toBeNull()

    resolveHierarchy?.(INFECTIVE_PNEUMONIA_PAYLOAD)
    await new Promise(resolve => setTimeout(resolve, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-loading"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-anchor"]')?.textContent).toContain(
      'Aspiration pneumonia'
    )
  })
})

describe('toolbar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    useConceptDetailStore().hierarchy = PNEUMONIA_ANCESTOR_AND_DESCENDANT
  })

  afterEach(() => {
    activeWrapper?.unmount()
    activeWrapper = null
    document.body.innerHTML = ''
  })

  it('narrows rows by the text filter without fetching', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    ;(getConceptAncestorAndDescendant as Mock).mockClear()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    const rows = document.querySelectorAll('[data-descendant-row]')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Aspiration pneumonia')
    expect(getConceptAncestorAndDescendant).not.toHaveBeenCalled()
  })

  it('matches on concept code as well as name', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = '422588002'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    expect(document.querySelectorAll('[data-descendant-row]')).toHaveLength(1)
  })

  it('uses placeholders instead of floating labels for facet filters', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const classSelect = wrapper.findComponent('[data-testid="hierarchy-filter-class"]')
    const domainSelect = wrapper.findComponent('[data-testid="hierarchy-filter-domain"]')
    const vocabularySelect = wrapper.findComponent('[data-testid="hierarchy-filter-vocabulary"]')

    expect(classSelect.props('label')).toBeUndefined()
    expect(classSelect.props('placeholder')).toBe('Class')
    expect(domainSelect.props('label')).toBeUndefined()
    expect(domainSelect.props('placeholder')).toBe('Domain')
    expect(vocabularySelect.props('label')).toBeUndefined()
    expect(vocabularySelect.props('placeholder')).toBe('Vocabulary')
  })

  it('applies a class filter to both ancestors and descendants', async () => {
    useConceptDetailStore().hierarchy = [
      relatedConcept(7000001, 'Cohort ancestor', {
        conceptClassId: 'Cohort',
        relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
      }),
      relatedConcept(7000002, 'Disorder ancestor', {
        relationships: [{ relationshipName: 'Has ancestor of', relationshipDistance: 1 }],
      }),
      relatedConcept(7000003, 'Cohort descendant', { conceptClassId: 'Cohort' }),
      relatedConcept(7000004, 'Disorder descendant'),
    ]
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const classSelect = wrapper.findComponent('[data-testid="hierarchy-filter-class"]')
    classSelect.vm.$emit('update:modelValue', 'Cohort')
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-row-7000001"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000003"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000002"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000004"]')).toBeNull()
  })

  it('combines facet filters with AND logic', async () => {
    useConceptDetailStore().hierarchy = [
      relatedConcept(7000011, 'Cohort condition', { conceptClassId: 'Cohort' }),
      relatedConcept(7000012, 'Cohort metadata', {
        conceptClassId: 'Cohort',
        domainId: 'Metadata',
      }),
      relatedConcept(7000013, 'Disorder condition'),
    ]
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    wrapper.findComponent('[data-testid="hierarchy-filter-class"]').vm.$emit('update:modelValue', 'Cohort')
    wrapper.findComponent('[data-testid="hierarchy-filter-domain"]').vm.$emit('update:modelValue', 'Condition')
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-row-7000011"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000012"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000013"]')).toBeNull()
  })

  it('applies a vocabulary filter', async () => {
    useConceptDetailStore().hierarchy = [
      relatedConcept(7000021, 'SNOMED descendant'),
      relatedConcept(7000022, 'MedDRA descendant', { vocabularyId: 'MedDRA' }),
    ]
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    wrapper.findComponent('[data-testid="hierarchy-filter-vocabulary"]').vm.$emit('update:modelValue', 'SNOMED')
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-row-7000021"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-7000022"]')).toBeNull()
  })

  it('clears all filters when the dialog switches to a different concept', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    wrapper.findComponent('[data-testid="hierarchy-filter-class"]').vm.$emit('update:modelValue', 'Disorder')
    wrapper.findComponent('[data-testid="hierarchy-filter-domain"]').vm.$emit('update:modelValue', 'Condition')
    wrapper.findComponent('[data-testid="hierarchy-filter-vocabulary"]').vm.$emit('update:modelValue', 'SNOMED')
    await wrapper.vm.$nextTick()

    await wrapper.setProps({
      concept: { ...concept, conceptId: 4025165, conceptName: 'Abscess of lung with pneumonia' },
    })
    await wrapper.vm.$nextTick()

    expect(input.value).toBe('')
    expect(wrapper.findComponent('[data-testid="hierarchy-filter-class"]').props('modelValue')).toBeNull()
    expect(wrapper.findComponent('[data-testid="hierarchy-filter-domain"]').props('modelValue')).toBeNull()
    expect(wrapper.findComponent('[data-testid="hierarchy-filter-vocabulary"]').props('modelValue')).toBeNull()
  })

  it('shows every descendant at every distance when requested', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-descendants-toggle"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    const rows = document.querySelectorAll('[data-descendant-row]')
    expect(rows).toHaveLength(
      PNEUMONIA_ANCESTOR_AND_DESCENDANT.filter(c =>
        c.relationships.some(r => r.relationshipName === 'Has descendant of')
      ).length
    )
  })

  it('shows more descendants on demand and suppresses direct-child distance labels', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const toggle = document.querySelector('[data-testid="hierarchy-descendants-toggle"]') as HTMLElement
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.textContent).toContain('Show 4 more children')
    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')).toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-4309106"]')?.textContent).not.toContain(
      'distance'
    )

    toggle.click()
    await wrapper.vm.$nextTick()

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(toggle.textContent).toContain('Show direct children only')
    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')?.textContent).toContain(
      'distance 2'
    )
  })

  it('keeps the filter when showing more descendants', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-descendants-toggle"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect(input.value).toBe('Aspiration')
    expect(document.querySelectorAll('[data-descendant-row]')).toHaveLength(1)
  })

  it('orders descendants from direct children to the farthest descendants', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[data-testid="hierarchy-descendants-toggle"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    const order = [...document.querySelectorAll('[data-descendant-row]')].map(row =>
      row.getAttribute('data-testid')
    )
    expect(order.indexOf('hierarchy-row-4309106')).toBeLessThan(order.indexOf('hierarchy-row-257315'))
    expect(order.at(-1)).toBe('hierarchy-row-4139520')
  })

})
