import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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
import { useConceptSetsStore } from '@/stores/concept-sets'
import { getConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import {
  PNEUMONIA_ANCESTOR_AND_DESCENDANT,
  INFECTIVE_PNEUMONIA_PAYLOAD,
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

function mountDialog() {
  return mount(ConceptHierarchyDialog, {
    props: { modelValue: true, concept, sourceKey: 'SYNPUF1K' },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

function tick(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.vm.$nextTick()
}

function selectRow(conceptId: number) {
  const box = document.querySelector(
    `[data-testid="hierarchy-select-${conceptId}"] input`
  ) as HTMLInputElement
  box.click()
}

describe('ConceptHierarchyDialog — add and exclude', () => {
  let wrappers: ReturnType<typeof mountDialog>[] = []

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    ;(getConceptRecordCounts as Mock).mockResolvedValue(new Map())
    ;(getConceptAncestorAndDescendant as Mock).mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    useConceptDetailStore().hierarchy = PNEUMONIA_ANCESTOR_AND_DESCENDANT
    wrappers = []
  })

  afterEach(() => {
    for (const wrapper of wrappers) wrapper.unmount()
    wrappers = []
    document.body.innerHTML = ''
  })

  function mount_(): ReturnType<typeof mountDialog> {
    const wrapper = mountDialog()
    wrappers.push(wrapper)
    return wrapper
  }

  it('hides the add footer when no concept set is open', async () => {
    const wrapper = mount_()
    await tick(wrapper)

    expect(document.querySelector('[data-testid="add-selected"]')).toBeNull()
  })

  it('adds each selected concept once with the chosen flags', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = { id: 1, name: 'Test set', items: [] } as never
    const spy = vi.spyOn(sets, 'addConceptToSet')

    const wrapper = mount_()
    await tick(wrapper)

    selectRow(4309106)
    selectRow(256722)
    await tick(wrapper)
    ;(document.querySelector('[data-testid="add-option-exclude"] input') as HTMLInputElement).click()
    await tick(wrapper)
    ;(document.querySelector('[data-testid="add-selected"]') as HTMLElement).click()
    await tick(wrapper)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][1]).toMatchObject({ isExcluded: true })
    expect(sets.currentSet?.items[0]?.isExcluded).toBe(true)
  })

  it('adds only the rows still visible once the filter has narrowed', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = { id: 1, name: 'Test set', items: [] } as never
    const spy = vi.spyOn(sets, 'addConceptToSet')

    const wrapper = mount_()
    await tick(wrapper)

    selectRow(4309106)
    selectRow(256722)
    selectRow(4236311)
    await tick(wrapper)

    const input = document.querySelector(
      '[data-testid="hierarchy-filter"] input'
    ) as HTMLInputElement
    input.value = 'Aspiration'
    input.dispatchEvent(new Event('input'))
    await tick(wrapper)

    expect(document.querySelector('[data-testid="add-selected"]')?.textContent).toContain('(1)')
    ;(document.querySelector('[data-testid="add-selected"]') as HTMLElement).click()
    await tick(wrapper)

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0].conceptId).toBe(4309106)
  })

  it('drops a selection made for a previously displayed concept', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = { id: 1, name: 'Test set', items: [] } as never

    const wrapper = mount_()
    await tick(wrapper)

    selectRow(4309106)
    await tick(wrapper)
    expect(document.querySelector('[data-testid="add-selected"]')?.textContent).toContain('(1)')

    await wrapper.setProps({
      concept: { ...concept, conceptId: 4025165, conceptName: 'Abscess of lung with pneumonia' },
    })
    await tick(wrapper)

    const box = document.querySelector(
      '[data-testid="hierarchy-select-4309106"] input'
    ) as HTMLInputElement
    expect(box.checked).toBe(false)
    expect(document.querySelector('[data-testid="add-selected"]')?.textContent).not.toContain('(1)')
  })

  it('skips concepts already in the set and reports both numbers', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = {
      id: 1,
      name: 'Test set',
      items: [{ conceptId: 4309106, conceptName: 'Aspiration pneumonia' }],
    } as never

    const wrapper = mount_()
    await tick(wrapper)

    selectRow(4309106)
    selectRow(256722)
    await tick(wrapper)
    ;(document.querySelector('[data-testid="add-selected"]') as HTMLElement).click()
    await tick(wrapper)

    expect(document.body.textContent).toContain('skipped 1')
  })

  it('marks rows already in the set with a pill', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = {
      id: 1,
      name: 'Test set',
      items: [
        { conceptId: 4309106, conceptName: 'Aspiration pneumonia', isExcluded: true },
      ],
    } as never

    const wrapper = mount_()
    await tick(wrapper)

    const row = document.querySelector('[data-testid="hierarchy-row-4309106"]')
    expect(row?.textContent).toContain('excluded')
  })

  it('gives each row checkbox an accessible name', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = { id: 1, name: 'Test set', items: [] } as never

    const wrapper = mount_()
    await tick(wrapper)

    expect(
      document
        .querySelector('[data-testid="hierarchy-select-4309106"] input')
        ?.getAttribute('aria-label')
    ).toBe('Select Aspiration pneumonia')
  })

  it('clears the selection after a successful add', async () => {
    const sets = useConceptSetsStore()
    sets.currentSet = { id: 1, name: 'Test set', items: [] } as never

    const wrapper = mount_()
    await tick(wrapper)

    selectRow(4309106)
    await tick(wrapper)
    ;(document.querySelector('[data-testid="add-selected"]') as HTMLElement).click()
    await tick(wrapper)

    const box = document.querySelector(
      '[data-testid="hierarchy-select-4309106"] input'
    ) as HTMLInputElement
    expect(box.checked).toBe(false)
  })
})
