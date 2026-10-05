import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import IncludedConceptsTable from '@/components/concepts/IncludedConceptsTable.vue'
import { useWebAPIStore } from '@/stores/webapi'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (_k: string, fallback?: string) => ({ value: fallback ?? _k }) }),
}))

vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: vi.fn(),
}))

const vuetify = createVuetify({ components, directives })

const concept = (id: number, over: Partial<Concept> = {}): Concept => ({
  conceptId: id,
  conceptName: `Concept ${id}`,
  conceptCode: `${id}`,
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  ...over,
})

function mountTable(items: Concept[]) {
  return mount(IncludedConceptsTable, {
    global: { plugins: [vuetify] },
    props: { items, loading: false, error: null, manualCount: items.length, sourceKey: 'SYNPUF1K' },
  })
}

describe('IncludedConceptsTable record counts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getConceptRecordCounts).mockReset().mockResolvedValue(new Map())
  })

  it('sorts by descendant record count and requires a direction', () => {
    const dataTable = mountTable([concept(1)]).findComponent({ name: 'VDataTable' })

    expect(dataTable.props('sortBy')).toEqual([{ key: 'descendantRecordCount', order: 'desc' }])
    expect(dataTable.props('mustSort')).toBe(true)
  })

  it('shows the four count columns', () => {
    const keys = mountTable([concept(1)])
      .findComponent({ name: 'VDataTable' })
      .props('headers')
      .map((h: { key: string }) => h.key)

    expect(keys).toEqual(
      expect.arrayContaining([
        'recordCount',
        'descendantRecordCount',
        'personCount',
        'descendantPersonCount',
      ])
    )
  })

  it('fetches counts from the chosen record count source and shows them on the rows', async () => {
    useWebAPIStore().sources = [
      { sourceKey: 'RES', sourceName: 'Results', daimons: [{ daimonType: 'Results' }] },
    ] as never
    vi.mocked(getConceptRecordCounts).mockResolvedValue(
      new Map([
        [1, { recordCount: 1111, descendantRecordCount: 2222, personCount: 3333, descendantPersonCount: 4444 }],
      ])
    )
    const wrapper = mountTable([concept(1)])

    wrapper
      .findComponent('[data-testid="included-record-count-source"]')
      .vm.$emit('update:modelValue', 'RES')
    await flushPromises()

    expect(getConceptRecordCounts).toHaveBeenLastCalledWith('RES', [1])
    for (const n of ['1111', '2222', '3333', '4444']) {
      expect(wrapper.text().replace(/[,\s]/g, '')).toContain(n)
    }
  })

  it('shows a dash for concepts the source returned no counts for', async () => {
    const wrapper = mountTable([concept(1)])
    await flushPromises()

    expect(wrapper.find('tbody').text()).toContain('-')
  })
})

describe('IncludedConceptsTable type chips and selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(getConceptRecordCounts).mockReset().mockResolvedValue(new Map())
  })

  it('labels standard, classification and non-standard concepts', () => {
    const text = mountTable([
      concept(1, { standardConcept: 'S' }),
      concept(2, { standardConcept: 'C' }),
      concept(3, { standardConcept: null }),
    ]).text()

    expect(text).toContain('Standard')
    expect(text).toContain('Classification')
    expect(text).toContain('Non-Std')
  })

  it('unchecks a row and clears select-all', async () => {
    const wrapper = mountTable([concept(1), concept(2)])
    const options = () => wrapper.findComponent({ name: 'ConceptAddOptions' })

    await wrapper.get('[data-testid="included-concepts-select-all"] input').setValue(true)
    expect(options().props('selectedCount')).toBe(2)

    await wrapper.get('[data-testid="included-concepts-row-checkbox-1"] input').setValue(false)
    expect(options().props('selectedCount')).toBe(1)

    await wrapper.get('[data-testid="included-concepts-select-all"] input').setValue(true)
    expect(options().props('selectedCount')).toBe(2)

    await wrapper.get('[data-testid="included-concepts-select-all"] input').setValue(false)
    expect(options().props('selectedCount')).toBe(0)
  })
})
