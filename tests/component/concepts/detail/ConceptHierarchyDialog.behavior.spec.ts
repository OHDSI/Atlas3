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
import { AtlasSnackbar } from '@/components/ui'
import { useConceptDetailStore } from '@/stores/concept-detail'
import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { getConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'
import type { ConceptRecordCount, RelatedConcept } from '@/models/concept-detail.types'
import type { Mock } from 'vitest'

const vuetify = createVuetify({ components, directives })

type Rel = [name: 'Has ancestor of' | 'Has descendant of', distance: number]

function related(
  conceptId: number,
  conceptName: string,
  rels: Rel[],
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
    relationships: rels.map(([relationshipName, relationshipDistance]) => ({
      relationshipName,
      relationshipDistance,
    })),
    ...overrides,
  }
}

function asConcept(row: RelatedConcept): Concept {
  const { relationships: _relationships, ...rest } = row
  return rest
}

function recordCount(value: number): ConceptRecordCount {
  return { recordCount: value, descendantRecordCount: value, personCount: 1, descendantPersonCount: 1 }
}

const focus: Concept = {
  conceptId: 100,
  conceptName: 'Focus',
  conceptCode: 'F100',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Disorder',
  standardConcept: 'S',
  invalidReason: null,
}

const HIERARCHY: RelatedConcept[] = [
  related(11, 'Near ancestor', [['Has ancestor of', 1], ['Has ancestor of', 3]], { conceptClassId: 'Mid' }),
  related(12, 'Far ancestor', [['Has ancestor of', 2]], { conceptClassId: 'Alpha' }),
  related(21, 'Child one', [['Has descendant of', 1]], { conceptClassId: 'Zeta' }),
  related(22, 'Child two', [['Has descendant of', 2], ['Has descendant of', 1]], { conceptClassId: 'Alpha' }),
  related(23, 'Great grandchild', [['Has descendant of', 3]], { conceptClassId: 'Mid' }),
  related(24, 'Grandchild', [['Has descendant of', 2]], { conceptClassId: 'Zeta' }),
]

let activeWrapper: VueWrapper | null = null

function mountDialog(props: Partial<{ modelValue: boolean; concept: Concept }> = {}) {
  activeWrapper = mount(ConceptHierarchyDialog, {
    props: { modelValue: true, concept: focus, sourceKey: 'SYNPUF1K', ...props },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
  return activeWrapper
}

async function flush(wrapper: VueWrapper) {
  await new Promise(resolve => setTimeout(resolve, 0))
  await wrapper.vm.$nextTick()
}

function q(testId: string): HTMLElement | null {
  return document.querySelector(`[data-testid="${testId}"]`)
}

function click(testId: string) {
  (q(testId) as HTMLElement).click()
}

function rowIds(selector: string): string[] {
  return [...document.querySelectorAll(selector)].map(row => row.getAttribute('data-testid') ?? '')
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  ;(getConceptRecordCounts as Mock).mockReset()
  ;(getConceptAncestorAndDescendant as Mock).mockReset()
  ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())
  ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue([])
  useConceptDetailStore().hierarchy = HIERARCHY
})

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = null
  document.body.innerHTML = ''
})

describe('ConceptHierarchyDialog distances and ordering', () => {
  it('places a concept at its nearest distance when it has several', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(rowIds('[data-ancestor-row]')).toEqual(['hierarchy-row-11'])
    expect(rowIds('[data-descendant-row]')).toEqual(['hierarchy-row-21', 'hierarchy-row-22'])
  })

  it('orders expanded ancestors farthest first and descendants nearest first', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    click('hierarchy-ancestors-toggle')
    click('hierarchy-descendants-toggle')
    await wrapper.vm.$nextTick()

    expect(rowIds('[data-ancestor-row]')).toEqual(['hierarchy-row-12', 'hierarchy-row-11'])
    expect(rowIds('[data-descendant-row]')).toEqual([
      'hierarchy-row-21',
      'hierarchy-row-22',
      'hierarchy-row-24',
      'hierarchy-row-23',
    ])
    expect(q('hierarchy-row-11')?.textContent).toContain('distance 1')
  })

  it('reports the total ancestor and descendant counts', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(document.querySelector('.counts')?.textContent?.trim()).toBe('2 ancestors · 4 descendants')
  })

  it('offers each facet value once, alphabetically', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent('[data-testid="hierarchy-filter-class"]').props('items')).toEqual([
      'Alpha',
      'Mid',
      'Zeta',
    ])
  })
})

describe('ConceptHierarchyDialog count sorting', () => {
  beforeEach(() => {
    useConceptDetailStore().hierarchy = [
      related(201, 'R201', [['Has descendant of', 1]]),
      related(205, 'R205', [['Has descendant of', 1]]),
      related(202, 'R202', [['Has descendant of', 1]]),
      related(203, 'R203', [['Has descendant of', 1]]),
      related(204, 'R204', [['Has descendant of', 1]]),
    ]
    ;(getConceptRecordCounts as Mock).mockResolvedValue(
      new Map([
        [201, recordCount(40)],
        [203, recordCount(40)],
        [204, recordCount(10)],
      ])
    )
  })

  function rcButton() {
    return q('hierarchy-sort-rc') as HTMLElement
  }

  it('sorts by count, breaks ties by concept id and keeps rows without counts last', async () => {
    const wrapper = mountDialog()
    await flush(wrapper)

    rcButton().click()
    await wrapper.vm.$nextTick()
    expect(rowIds('[data-descendant-row]')).toEqual([
      'hierarchy-row-204',
      'hierarchy-row-201',
      'hierarchy-row-203',
      'hierarchy-row-205',
      'hierarchy-row-202',
    ])

    rcButton().click()
    await wrapper.vm.$nextTick()
    expect(rowIds('[data-descendant-row]')).toEqual([
      'hierarchy-row-201',
      'hierarchy-row-203',
      'hierarchy-row-204',
      'hierarchy-row-205',
      'hierarchy-row-202',
    ])

    rcButton().click()
    await wrapper.vm.$nextTick()
    expect(rowIds('[data-descendant-row]')[0]).toBe('hierarchy-row-204')
  })

  it('shows the sort direction on the active column only', async () => {
    const wrapper = mountDialog()
    await flush(wrapper)
    const drcButton = q('hierarchy-sort-drc') as HTMLElement

    expect(rcButton().textContent?.trim()).toBe('RC')
    expect(rcButton().closest('th')?.getAttribute('aria-sort')).toBe('none')

    rcButton().click()
    await wrapper.vm.$nextTick()
    expect(rcButton().textContent?.trim()).toBe('RC ▲')
    expect(rcButton().closest('th')?.getAttribute('aria-sort')).toBe('ascending')
    expect(drcButton.textContent?.trim()).toBe('DRC')
    expect(drcButton.closest('th')?.getAttribute('aria-sort')).toBe('none')

    rcButton().click()
    await wrapper.vm.$nextTick()
    expect(rcButton().textContent?.trim()).toBe('RC ▼')
    expect(rcButton().closest('th')?.getAttribute('aria-sort')).toBe('descending')

    drcButton.click()
    await wrapper.vm.$nextTick()
    expect(rcButton().textContent?.trim()).toBe('RC')
    expect(drcButton.textContent?.trim()).toBe('DRC ▲')
  })
})

describe('ConceptHierarchyDialog adding', () => {
  beforeEach(() => {
    useConceptSetsStore().currentSet = { id: 1, name: 'Set', items: [] } as never
  })

  function tickBox(conceptId: number) {
    (document.querySelector(`[data-testid="hierarchy-select-${conceptId}"] input`) as HTMLInputElement).click()
  }

  it('adds only the rows still ticked, with default flags, and reports the count', async () => {
    const spy = vi.spyOn(useConceptSetsStore(), 'addConceptToSet')
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent(AtlasSnackbar).props('modelValue')).toBe(false)

    tickBox(21)
    await wrapper.vm.$nextTick()
    tickBox(22)
    await wrapper.vm.$nextTick()
    tickBox(21)
    await wrapper.vm.$nextTick()
    click('add-selected')
    await wrapper.vm.$nextTick()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0].conceptId).toBe(22)
    expect(spy.mock.calls[0]![1]).toEqual({
      isExcluded: false,
      includeDescendants: false,
      includeMapped: false,
    })
    expect(wrapper.findComponent(AtlasSnackbar).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(AtlasSnackbar).props('text')).toBe('Added 1 concepts')
  })

  it('adds a grandchild ticked in the tree view', async () => {
    (getConceptAncestorAndDescendant as Mock).mockResolvedValueOnce([
      related(61, 'Tree grandchild', [['Has descendant of', 1]]),
    ])
    const spy = vi.spyOn(useConceptSetsStore(), 'addConceptToSet')
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    click('hierarchy-view-tree')
    await wrapper.vm.$nextTick()
    click('hierarchy-expand-21')
    await flush(wrapper)

    tickBox(61)
    await wrapper.vm.$nextTick()
    click('add-selected')
    await wrapper.vm.$nextTick()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![0].conceptId).toBe(61)
  })

  it('forgets ticks and tree expansion when the dialog is closed and reopened', async () => {
    (getConceptAncestorAndDescendant as Mock).mockResolvedValue([
      related(61, 'Tree grandchild', [['Has descendant of', 1]]),
    ])
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    tickBox(22)
    click('hierarchy-view-tree')
    await wrapper.vm.$nextTick()
    click('hierarchy-expand-21')
    await flush(wrapper)
    expect(q('hierarchy-row-61')).not.toBeNull()

    await wrapper.setProps({ modelValue: false })
    await flush(wrapper)
    await wrapper.setProps({ modelValue: true })
    await flush(wrapper)

    expect(q('hierarchy-row-61')).toBeNull()
    expect(useConceptHierarchyStore().isExpanded(21)).toBe(false)
    expect(q('add-selected')?.textContent).not.toContain('(1)')
  })
})

describe('ConceptHierarchyDialog tree view', () => {
  async function openTreeWithCycle() {
    (getConceptAncestorAndDescendant as Mock)
      .mockResolvedValueOnce([
        related(61, 'Tree grandchild', [['Has descendant of', 1]]),
        related(100, 'Focus', [['Has descendant of', 1]]),
      ])
      .mockResolvedValueOnce([related(21, 'Child one', [['Has descendant of', 1]])])
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    click('hierarchy-view-tree')
    await wrapper.vm.$nextTick()
    click('hierarchy-expand-21')
    await flush(wrapper)
    return wrapper
  }

  it('indents expanded children one level deeper', async () => {
    await openTreeWithCycle()

    const cell = q('hierarchy-row-61')?.querySelectorAll('td')[1] as HTMLElement
    expect(cell.style.paddingLeft).toBe('32px')
  })

  it('does not re-expand a concept already on the path, including the focused one', async () => {
    const wrapper = await openTreeWithCycle()

    click('hierarchy-expand-100')
    await flush(wrapper)

    expect(useConceptHierarchyStore().isExpanded(100)).toBe(true)
    expect(document.querySelectorAll('[data-testid="hierarchy-row-21"]')).toHaveLength(1)
  })

  it('ignores a click on the focused concept itself', async () => {
    const wrapper = await openTreeWithCycle()

    click('hierarchy-navigate-100')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('navigate')).toBeUndefined()
  })

  it('emits navigation for a concept outside the focused payload without refocusing', async () => {
    const wrapper = await openTreeWithCycle()
    const fetchCalls = (getConceptAncestorAndDescendant as Mock).mock.calls.length

    click('hierarchy-navigate-61')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('navigate')).toEqual([[61]])
    expect(document.querySelector('.atlas-dialog__title')?.textContent).toContain('Focus')
    expect((getConceptAncestorAndDescendant as Mock).mock.calls.length).toBe(fetchCalls)
  })

  it('resets tree expansion when unmounted', async () => {
    const wrapper = await openTreeWithCycle()
    expect(useConceptHierarchyStore().isExpanded(21)).toBe(true)

    wrapper.unmount()
    activeWrapper = null

    expect(useConceptHierarchyStore().isExpanded(21)).toBe(false)
  })
})

describe('ConceptHierarchyDialog focus changes', () => {
  const X_PAYLOAD = [related(51, 'X child', [['Has descendant of', 1]])]
  const W_PAYLOAD = [related(52, 'W child', [['Has descendant of', 1]])]
  const zConcept: Concept = { ...focus, conceptId: 40, conceptName: 'Zed' }

  it('shows the fetched hierarchy of a clicked concept and keeps it when the drawer follows', async () => {
    (getConceptAncestorAndDescendant as Mock).mockResolvedValueOnce(X_PAYLOAD)
    useConceptDetailStore().recordCountsBySource = new Map([['SYNPUF1K', recordCount(7654321)]])
    const wrapper = mountDialog()
    await flush(wrapper)
    expect(q('hierarchy-anchor')?.textContent).toContain('7,654,321')

    click('hierarchy-navigate-21')
    await flush(wrapper)

    expect(getConceptAncestorAndDescendant).toHaveBeenCalledWith('SYNPUF1K', 21)
    expect(q('hierarchy-row-51')).not.toBeNull()
    expect(q('hierarchy-anchor')?.textContent).not.toContain('7,654,321')

    await wrapper.setProps({ concept: asConcept(HIERARCHY[2]!) })
    await flush(wrapper)

    expect(q('hierarchy-row-51')).not.toBeNull()
    expect(q('hierarchy-row-22')).toBeNull()
  })

  it('reports a failed fetch for a clicked concept', async () => {
    (getConceptAncestorAndDescendant as Mock).mockRejectedValueOnce(new Error('down'))
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    click('hierarchy-navigate-21')
    await flush(wrapper)

    expect(q('hierarchy-load-failed')).not.toBeNull()
    expect(q('hierarchy-loading')).toBeNull()
  })

  it.each([
    ['resolves', (d: ReturnType<typeof deferred<RelatedConcept[]>>) => d.resolve(X_PAYLOAD)],
    ['rejects', (d: ReturnType<typeof deferred<RelatedConcept[]>>) => d.reject(new Error('late'))],
  ])('ignores a superseded fetch that %s after the drawer moved focus', async (_label, settleFirst) => {
    const first = deferred<RelatedConcept[]>()
    const second = deferred<RelatedConcept[]>()
    ;(getConceptAncestorAndDescendant as Mock)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    useConceptDetailStore().hierarchy = [
      ...HIERARCHY,
      related(32, 'W', [['Has descendant of', 1]]),
    ]
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    click('hierarchy-navigate-21')
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ concept: zConcept })
    await wrapper.vm.$nextTick()
    expect(q('hierarchy-loading')).toBeNull()

    click('hierarchy-navigate-32')
    await wrapper.vm.$nextTick()
    settleFirst(first)
    await flush(wrapper)

    expect(q('hierarchy-loading')).not.toBeNull()
    expect(q('hierarchy-row-51')).toBeNull()

    second.resolve(W_PAYLOAD)
    await flush(wrapper)

    expect(q('hierarchy-loading')).toBeNull()
    expect(q('hierarchy-load-failed')).toBeNull()
    expect(q('hierarchy-row-52')).not.toBeNull()
    expect(q('hierarchy-row-51')).toBeNull()
  })

  it('collapses expanded descendants when the drawer switches concept', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()
    click('hierarchy-descendants-toggle')
    await wrapper.vm.$nextTick()
    expect(q('hierarchy-descendants-toggle')?.getAttribute('aria-expanded')).toBe('true')

    await wrapper.setProps({ concept: zConcept })
    await wrapper.vm.$nextTick()

    expect(q('hierarchy-descendants-toggle')?.getAttribute('aria-expanded')).toBe('false')
  })

  it('reloads counts for the new anchor when the drawer switches concept', async () => {
    const wrapper = mountDialog()
    await flush(wrapper)
    ;(getConceptRecordCounts as Mock).mockClear()

    await wrapper.setProps({ concept: zConcept })
    await flush(wrapper)

    expect(getConceptRecordCounts).toHaveBeenCalledWith('SYNPUF1K', expect.arrayContaining([40]))
  })
})

describe('ConceptHierarchyDialog open state', () => {
  it('loads counts only once opened', async () => {
    const wrapper = mountDialog({ modelValue: false })
    await flush(wrapper)
    expect(getConceptRecordCounts).not.toHaveBeenCalled()

    await wrapper.setProps({ modelValue: true })
    await flush(wrapper)

    expect(getConceptRecordCounts).toHaveBeenCalledWith('SYNPUF1K', expect.arrayContaining([100, 11, 12, 21, 22]))
  })

  it('asks the parent to close from the close button', async () => {
    const wrapper = mountDialog()
    await wrapper.vm.$nextTick()

    ;(document.querySelector('[aria-label="Close dialog"]') as HTMLElement).click()

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
