import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetTable from '@/components/concepts/ConceptSetTable.vue'
import type { ConceptSetItem } from '@/models/concept-set.types'

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  vocabularySource: null as string | null,
  defaultSourceKey: vi.fn(() => 'DEFAULT_SRC'),
}))

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/stores/concept-detail-drawer', () => ({
  useConceptDetailDrawerStore: () => ({ open: mocks.open, close: vi.fn(), isOpen: false }),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({ getValidVocabularySource: () => mocks.vocabularySource }),
}))

vi.mock('@/config/webapi', () => ({
  getSourceKey: () => mocks.defaultSourceKey(),
}))

const vuetify = createVuetify({ components, directives })

function item(conceptId: number, overrides: Partial<ConceptSetItem> = {}): ConceptSetItem {
  return {
    conceptId,
    conceptName: `Concept ${conceptId}`,
    conceptCode: `C${conceptId}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: false,
    includeDescendants: false,
    includeMapped: false,
    ...overrides,
  }
}

const ITEMS: ConceptSetItem[] = [
  item(1, { domainId: 'Measurement', vocabularyId: 'LOINC' }),
  item(2, { standardConcept: null, isExcluded: true }),
  item(3, { domainId: 'Condition', vocabularyId: 'ICD10CM', standardConcept: 'C' }),
  item(4, { domainId: '', vocabularyId: '', standardConcept: null }),
]

function mountTable(props: Record<string, unknown> = {}) {
  return mount(ConceptSetTable, {
    props: { items: ITEMS, loading: false, ...props },
    global: { plugins: [vuetify] },
  })
}

function filterChips(wrapper: VueWrapper) {
  return wrapper.findAll('.concept-set-table__filter-chip')
}

function chipByText(wrapper: VueWrapper, text: string) {
  const chip = filterChips(wrapper).find(c => c.text().replace(/\s+/g, ' ').trim().startsWith(text))
  if (!chip) throw new Error(`No filter chip starting with ${text}`)
  return chip
}

function shownIds(wrapper: VueWrapper): number[] {
  const table = wrapper.findComponent({ name: 'VDataTable' })
  if (!table.exists()) return []
  return (table.props('items') as ConceptSetItem[]).map(i => i.conceptId)
}

function resetButton(wrapper: VueWrapper) {
  return wrapper.findAll('button').find(b => b.text() === 'Reset')
}

describe('ConceptSetTable source key resolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.open.mockClear()
    mocks.vocabularySource = null
    mocks.defaultSourceKey.mockReturnValue('DEFAULT_SRC')
  })

  it('falls back to the WebAPI vocabulary source when no source key is passed', async () => {
    mocks.vocabularySource = 'VOCAB_SRC'
    const wrapper = mountTable({ items: [item(7)] })

    await wrapper.find('[data-testid="concept-name-link-7"]').trigger('click')

    expect(mocks.open).toHaveBeenCalledWith('VOCAB_SRC', 7)
  })

  it('falls back to the configured default source key last', async () => {
    const wrapper = mountTable({ items: [item(7)] })

    await wrapper.find('[data-testid="concept-name-link-7"]').trigger('click')

    expect(mocks.open).toHaveBeenCalledWith('DEFAULT_SRC', 7)
  })

  it('prefers the explicit source key prop', async () => {
    mocks.vocabularySource = 'VOCAB_SRC'
    const wrapper = mountTable({ items: [item(7)], sourceKey: 'PROP_SRC' })

    await wrapper.find('[data-testid="concept-name-link-7"]').trigger('click')

    expect(mocks.open).toHaveBeenCalledWith('PROP_SRC', 7)
  })

  it('renders the name as plain text when no source can be resolved', () => {
    mocks.defaultSourceKey.mockReturnValue('')
    const wrapper = mountTable({ items: [item(7)] })

    expect(wrapper.find('[data-testid="concept-name-link-7"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Concept 7')
  })

  it('emits view-concept instead of opening the drawer when the parent listens', async () => {
    const onViewConcept = vi.fn()
    const wrapper = mountTable({ items: [item(7)], sourceKey: 'PROP_SRC', onViewConcept })

    await wrapper.find('[data-testid="concept-name-link-7"]').trigger('click')

    expect(wrapper.emitted('view-concept')).toEqual([[{ conceptId: 7, sourceKey: 'PROP_SRC' }]])
    expect(mocks.open).not.toHaveBeenCalled()
  })
})

describe('ConceptSetTable quick filters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.vocabularySource = null
    mocks.defaultSourceKey.mockReturnValue('DEFAULT_SRC')
  })

  it('offers sorted, de-duplicated domain and vocabulary chips with domain counts', () => {
    const wrapper = mountTable()

    expect(filterChips(wrapper).map(c => c.text().replace(/\s+/g, ' ').trim())).toEqual([
      'Condition 2',
      'Measurement 1',
      'ICD10CM',
      'LOINC',
      'SNOMED',
      'Standard',
      'Exclude',
    ])
  })

  it('narrows to the chosen domains and restores all rows when toggled off', async () => {
    const wrapper = mountTable()
    expect(resetButton(wrapper)).toBeUndefined()

    await chipByText(wrapper, 'Condition').trigger('click')
    expect(shownIds(wrapper)).toEqual([2, 3])
    expect(resetButton(wrapper)).toBeDefined()

    await chipByText(wrapper, 'Measurement').trigger('click')
    expect(shownIds(wrapper)).toEqual([1, 2, 3])

    await chipByText(wrapper, 'Condition').trigger('click')
    await chipByText(wrapper, 'Measurement').trigger('click')
    expect(shownIds(wrapper)).toEqual([1, 2, 3, 4])
    expect(resetButton(wrapper)).toBeUndefined()
  })

  it('narrows to the chosen vocabularies and restores all rows when toggled off', async () => {
    const wrapper = mountTable()

    await chipByText(wrapper, 'LOINC').trigger('click')
    expect(shownIds(wrapper)).toEqual([1])
    expect(resetButton(wrapper)).toBeDefined()

    await chipByText(wrapper, 'SNOMED').trigger('click')
    expect(shownIds(wrapper)).toEqual([1, 2])

    await chipByText(wrapper, 'LOINC').trigger('click')
    await chipByText(wrapper, 'SNOMED').trigger('click')
    expect(shownIds(wrapper)).toEqual([1, 2, 3, 4])
  })

  it('narrows to standard concepts and to excluded concepts', async () => {
    const wrapper = mountTable()

    await chipByText(wrapper, 'Standard').trigger('click')
    expect(shownIds(wrapper)).toEqual([1])
    expect(resetButton(wrapper)).toBeDefined()

    await chipByText(wrapper, 'Standard').trigger('click')
    await chipByText(wrapper, 'Exclude').trigger('click')
    expect(shownIds(wrapper)).toEqual([2])
    expect(resetButton(wrapper)).toBeDefined()
  })

  it('shows the filtered empty state and resets every filter', async () => {
    const wrapper = mountTable()

    await chipByText(wrapper, 'Standard').trigger('click')
    await chipByText(wrapper, 'Exclude').trigger('click')

    expect(shownIds(wrapper)).toEqual([])
    expect(wrapper.find('.concept-set-table__empty-text').text()).toBe(
      'No concepts match the active filters.'
    )

    await resetButton(wrapper)!.trigger('click')

    expect(shownIds(wrapper)).toEqual([1, 2, 3, 4])
    expect(resetButton(wrapper)).toBeUndefined()
  })

  it('clears domain and vocabulary filters on reset', async () => {
    const wrapper = mountTable()

    await chipByText(wrapper, 'Measurement').trigger('click')
    await chipByText(wrapper, 'SNOMED').trigger('click')
    expect(shownIds(wrapper)).toEqual([])

    await resetButton(wrapper)!.trigger('click')

    expect(shownIds(wrapper)).toEqual([1, 2, 3, 4])
  })
})

describe('ConceptSetTable columns and type badges', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('exposes the columns in order with their titles and sortability', () => {
    const wrapper = mountTable()
    const headers = wrapper.findComponent({ name: 'VDataTable' }).props('headers') as Array<{
      title: string
      key: string
      sortable: boolean
    }>

    expect(headers.map(({ title, key, sortable }) => ({ title, key, sortable }))).toEqual([
      { title: 'Descendants', key: 'includeDescendants', sortable: false },
      { title: 'Mapped', key: 'includeMapped', sortable: false },
      { title: 'Exclude', key: 'isExcluded', sortable: false },
      { title: 'Concept Id', key: 'conceptId', sortable: true },
      { title: 'Concept Code', key: 'conceptCode', sortable: true },
      { title: 'Concept Name', key: 'conceptName', sortable: true },
      { title: 'Domain', key: 'domainId', sortable: true },
      { title: 'Vocabulary', key: 'vocabularyId', sortable: true },
      { title: 'Type', key: 'standardConcept', sortable: true },
      { title: 'Validity', key: 'invalidReason', sortable: true },
      { title: '', key: 'actions', sortable: false },
    ])
  })

  it.each([
    ['S', 'Standard', 'primary'],
    ['C', 'Classification', 'info'],
    [null, 'Non-Standard', 'default'],
  ] as const)('labels standardConcept=%s as %s in %s', (standardConcept, label, color) => {
    const wrapper = mountTable({ items: [item(9, { standardConcept })] })

    const typeChip = wrapper
      .find('tbody')
      .findAllComponents({ name: 'VChip' })
      .find(chip => ['Standard', 'Classification', 'Non-Standard'].includes(chip.text()))

    expect(typeChip?.text()).toBe(label)
    expect(typeChip?.props('color')).toBe(color)
  })
})
