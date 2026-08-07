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
  INFECTIVE_PNEUMONIA_CHILDREN,
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

  it('labels the expand chevrons and the view toggle for assistive technology', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(
      document
        .querySelector('[data-testid="hierarchy-expand-443410"]')
        ?.getAttribute('aria-label')
    ).toBe('Expand Infective pneumonia')
    expect(
      document.querySelector('[data-testid="hierarchy-expand-443410"]')?.getAttribute('aria-expanded')
    ).toBe('false')
    expect(
      document.querySelector('[data-testid="hierarchy-view-tree"]')?.getAttribute('aria-pressed')
    ).toBe('true')
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

    expect(getConceptAncestorAndDescendant).toHaveBeenCalledWith('SYNPUF1K', 443410)
    for (const child of INFECTIVE_PNEUMONIA_CHILDREN) {
      expect(document.body.textContent).toContain(child.conceptName)
    }
  })

  it('offers a facet value that exists only on an expansion-discovered concept', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    // Every ancestor/descendant in the anchor payload is class "Disorder";
    // 3178885 "Secondary pneumonia" is class "Clinical Finding" and only
    // surfaces once 443410 is expanded — it must reach the Class dropdown,
    // not just the free-text filter.
    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const classSelect = wrapper.findComponent('[data-testid="hierarchy-filter-class"]')
    expect(classSelect.props('items')).toContain('Clinical Finding')
  })

  it('drops the chevron when a node turns out to have no children', async () => {
    (getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
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
    (getConceptAncestorAndDescendant as Mock).mockRejectedValue(new Error('boom'))
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

  it('renders a shared descendant once under each expanded parent, with no duplicate-key warning', async () => {
    const shared = relatedConcept(9999001, 'Shared descendant')
    ;(getConceptAncestorAndDescendant as Mock).mockImplementation((_key: string, conceptId: number) =>
      conceptId === 4309106 || conceptId === 4236311
        ? Promise.resolve([shared])
        : Promise.resolve(INFECTIVE_PNEUMONIA_PAYLOAD)
    )
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const firstParent = document.querySelector(
      '[data-testid="hierarchy-expand-4309106"]'
    ) as HTMLElement
    const secondParent = document.querySelector(
      '[data-testid="hierarchy-expand-4236311"]'
    ) as HTMLElement
    // Click both before awaiting anything so the two expansions resolve and
    // apply within the same reactivity flush — that's what forces Vue's
    // keyed-diff algorithm through its duplicate-key check; expanding them
    // one at a time (with a render in between) only ever appends, which
    // never exercises that path even with a colliding key.
    firstParent.click()
    secondParent.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelectorAll('[data-testid="hierarchy-row-9999001"]')).toHaveLength(2)

    const hasDuplicateKeyWarning = [...warnSpy.mock.calls, ...errorSpy.mock.calls].some(args =>
      args.some(arg => typeof arg === 'string' && arg.toLowerCase().includes('duplicate key'))
    )
    expect(hasDuplicateKeyWarning).toBe(false)

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('terminates instead of recursing forever when a node lists an ancestor as its own descendant', async () => {
    const selfReferencing = relatedConcept(443410, 'Infective pneumonia')
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([selfReferencing])

    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelectorAll('[data-testid="hierarchy-row-443410"]')).toHaveLength(2)
  })

  it('shows a loading indicator while a node expands, then clears it once children arrive', async () => {
    let resolveFetch!: (value: RelatedConcept[]) => void
    const pending = new Promise<RelatedConcept[]>(resolve => {
      resolveFetch = resolve
    })
    ;(getConceptAncestorAndDescendant as Mock).mockReturnValueOnce(pending)

    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-loading-443410"]')).not.toBeNull()

    resolveFetch(INFECTIVE_PNEUMONIA_CHILDREN)
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-loading-443410"]')).toBeNull()
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

  it('flat view lists every descendant at every depth', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const flat = document.querySelector('[data-testid="hierarchy-view-flat"]') as HTMLElement
    flat.click()
    await wrapper.vm.$nextTick()

    const rows = document.querySelectorAll('[data-descendant-row]')
    expect(rows).toHaveLength(
      PNEUMONIA_ANCESTOR_AND_DESCENDANT.filter(c =>
        c.relationships.some(r => r.relationshipName === 'Has descendant of')
      ).length
    )
  })

  it('merges a concept discovered only through expansion into flat view', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-flat"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    // 4050872 "Pneumonia due to parasitic infestation" exists only in 443410's
    // own expansion payload, never in the anchor's ancestorAndDescendant
    // response — Flat must still surface it once it has been discovered.
    expect(
      PNEUMONIA_ANCESTOR_AND_DESCENDANT.some(c => c.conceptId === 4050872)
    ).toBe(false)
    expect(
      document.querySelector('[data-testid="hierarchy-row-4050872"]')?.textContent
    ).toContain('Pneumonia due to parasitic infestation')
  })

  it('renders a concept present in both the anchor payload and an expansion exactly once, with no duplicate-key warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-flat"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    // 257315 "Bacterial pneumonia" is both a distance-2 descendant in the
    // anchor's own payload and a distance-1 child returned by expanding
    // 443410 — the merge must dedupe it rather than render it twice.
    expect(
      PNEUMONIA_ANCESTOR_AND_DESCENDANT.some(c => c.conceptId === 257315)
    ).toBe(true)
    expect(
      INFECTIVE_PNEUMONIA_CHILDREN.some(c => c.conceptId === 257315)
    ).toBe(true)
    expect(document.querySelectorAll('[data-testid="hierarchy-row-257315"]')).toHaveLength(1)

    const hasDuplicateKeyWarning = [...warnSpy.mock.calls, ...errorSpy.mock.calls].some(args =>
      args.some(arg => typeof arg === 'string' && arg.toLowerCase().includes('duplicate key'))
    )
    expect(hasDuplicateKeyWarning).toBe(false)

    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('keeps the toolbar descendant count in sync with the merged flat row count after an expansion', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-flat"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    const anchorDescendantIds = new Set(
      PNEUMONIA_ANCESTOR_AND_DESCENDANT.filter(c =>
        c.relationships.some(r => r.relationshipName === 'Has descendant of')
      ).map(c => c.conceptId)
    )
    const newFromExpansion = INFECTIVE_PNEUMONIA_CHILDREN.filter(
      c => !anchorDescendantIds.has(c.conceptId)
    ).length
    const expectedMerged = anchorDescendantIds.size + newFromExpansion

    expect(document.body.textContent).toContain(`${expectedMerged} descendants`)
    expect(document.querySelectorAll('[data-descendant-row]')).toHaveLength(expectedMerged)
  })

  it('keeps the filter when switching between tree and flat', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()
    ;(document.querySelector('[data-testid="hierarchy-view-flat"]') as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect(input.value).toBe('Aspiration')
    expect(document.querySelectorAll('[data-descendant-row]')).toHaveLength(1)
  })

  it('keeps a non-matching parent visible when one of its loaded children matches', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    // "Bacterial" matches only 257315 ("Bacterial pneumonia"), a loaded child of
    // 443410 ("Infective pneumonia") — the parent itself does not match, and no
    // top-level descendant does either.
    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Bacterial'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-row-257315"]')?.textContent).toContain(
      'Bacterial pneumonia'
    )
    expect(document.querySelector('[data-testid="hierarchy-row-443410"]')?.textContent).toContain(
      'Infective pneumonia'
    )
    expect(document.querySelectorAll('tr.descendant')).toHaveLength(2)
    expect(getConceptAncestorAndDescendant).toHaveBeenCalledTimes(1)
  })

  it('filters an already-expanded node\'s children too, not just the top level', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    const chevron = document.querySelector(
      '[data-testid="hierarchy-expand-443410"]'
    ) as HTMLElement
    chevron.click()
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    for (const child of INFECTIVE_PNEUMONIA_CHILDREN) {
      expect(document.body.textContent).toContain(child.conceptName)
    }

    // "Infective" matches the expanded parent (443410, "Infective pneumonia")
    // and exactly one of its eight children ("Infective pneumonia acquired
    // prenatally", 4215807) — the other seven only contain "pneumonia". If
    // flatten() filtered only its top-level input and forwarded children
    // unfiltered, all eight would still render here.
    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Infective'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    expect(document.querySelector('[data-testid="hierarchy-row-443410"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="hierarchy-row-4215807"]')?.textContent).toContain(
      'Infective pneumonia acquired prenatally'
    )
    for (const child of INFECTIVE_PNEUMONIA_CHILDREN.filter(c => c.conceptId !== 4215807)) {
      expect(document.querySelector(`[data-testid="hierarchy-row-${child.conceptId}"]`)).toBeNull()
    }
  })
})
