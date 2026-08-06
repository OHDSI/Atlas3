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

  it('renders a shared descendant once under each expanded parent, with no duplicate-key warning', async () => {
    const shared = relatedConcept(9999001, 'Shared descendant')
    ;(fetchConceptAncestorAndDescendant as Mock).mockImplementation((_key: string, conceptId: number) =>
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
    ;(fetchConceptAncestorAndDescendant as Mock).mockResolvedValue([selfReferencing])

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
    ;(fetchConceptAncestorAndDescendant as Mock).mockReturnValueOnce(pending)

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
    ;(fetchConceptAncestorAndDescendant as Mock).mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
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
    ;(fetchConceptAncestorAndDescendant as Mock).mockClear()

    const input = document.querySelector('[data-testid="hierarchy-filter"] input') as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    await wrapper.vm.$nextTick()

    const rows = document.querySelectorAll('[data-descendant-row]')
    expect(rows).toHaveLength(1)
    expect(rows[0].textContent).toContain('Aspiration pneumonia')
    expect(fetchConceptAncestorAndDescendant).not.toHaveBeenCalled()
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
})
