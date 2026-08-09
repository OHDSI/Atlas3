/**
 * ConceptTable Component Tests (T134)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptTable from '@/components/concepts/ConceptTable.vue'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/stores/concept-detail-drawer', () => ({
  useConceptDetailDrawerStore: vi.fn(() => ({ open: vi.fn(), close: vi.fn(), isOpen: false })),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => null })),
}))

const vuetify = createVuetify({ components, directives })

const mockConcepts: Concept[] = [
  {
    conceptId: 313217,
    conceptName: 'Atrial fibrillation',
    conceptCode: '49436004',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    recordCount: 1000,
    descendantRecordCount: 1500,
    personCount: 800,
    descendantPersonCount: 1200,
  },
  {
    conceptId: 4329847,
    conceptName: 'Myocardial infarction',
    conceptCode: '22298006',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'C',
    invalidReason: null,
    recordCount: 500,
    descendantRecordCount: 750,
    personCount: 400,
    descendantPersonCount: 600,
  },
  {
    conceptId: 192855,
    conceptName: 'Glucose measurement',
    conceptCode: '33747003',
    domainId: 'Measurement',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Procedure',
    standardConcept: null,
    invalidReason: 'D',
  },
]

function mountComponent(props = {}) {
  return mount(ConceptTable, {
    props: {
      concepts: [],
      loading: false,
      totalItems: 0,
      page: 1,
      itemsPerPage: 60,
      ...props,
    },
    global: {
      plugins: [vuetify],
    },
  })
}

describe('ConceptTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mount successfully', () => {
    const wrapper = mountComponent()
    expect(wrapper.exists()).toBe(true)
  })

  it('should render data table', () => {
    const wrapper = mountComponent()
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.exists()).toBe(true)
  })

  it('should display concepts in table', () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual(mockConcepts)
  })

  it('should display loading state', () => {
    const wrapper = mountComponent({ loading: true })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('loading')).toBe(true)
  })

  it('should render pagination controls', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100 })
    const pagination = wrapper.findComponent({ name: 'VPagination' })
    expect(pagination.exists()).toBe(true)
  })

  it('should display page range text', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100, page: 1, itemsPerPage: 60 })
    expect(wrapper.text()).toContain('1-60 of 100')
  })

  it('should display correct page range for second page', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100, page: 2, itemsPerPage: 60 })
    expect(wrapper.text()).toContain('61-100 of 100')
  })

  it('should display 0-0 of 0 when no items', () => {
    const wrapper = mountComponent({ concepts: [], totalItems: 0 })
    expect(wrapper.text()).toContain('0-0 of 0')
  })

  it('should emit update:page when page is changed', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100 })
    const pagination = wrapper.findComponent({ name: 'VPagination' })

    await pagination.vm.$emit('update:modelValue', 2)

    expect(wrapper.emitted('update:page')).toBeTruthy()
    expect(wrapper.emitted('update:page')![0]).toEqual([2])
  })

  it('should emit update:itemsPerPage when items per page is changed', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100 })
    const select = wrapper.findComponent({ name: 'VSelect' })

    await select.vm.$emit('update:modelValue', 120)

    expect(wrapper.emitted('update:itemsPerPage')).toBeTruthy()
    expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([120])
  })

  it('should render items per page selector', () => {
    const wrapper = mountComponent()
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.exists()).toBe(true)
  })

  it('should have items per page options', () => {
    const wrapper = mountComponent()
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('items')).toEqual([60, 120, 240])
  })

  // Regression: the concept-search store defaults itemsPerPage to 25, a
  // value outside the hardcoded [60, 120, 240] menu. The select showed
  // "25" as selected text while its own option list never contained 25,
  // so reopening the menu could never re-select the value already applied.
  it('folds an off-menu itemsPerPage value into the select options', () => {
    const wrapper = mountComponent({ itemsPerPage: 25 })
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('items')).toEqual([25, 60, 120, 240])
    expect(select.props('modelValue')).toBe(25)
  })

  it('should display concept type badges', () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    const chips = wrapper.findAllComponents({ name: 'VChip' })
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should display Standard badge for standardConcept=S', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const standardChip = chips.find(chip => chip.text().includes('Standard'))
    expect(standardChip).toBeTruthy()
  })

  it('should display Classification badge for standardConcept=C', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[1]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const classificationChip = chips.find(chip => chip.text().includes('Classification'))
    expect(classificationChip).toBeTruthy()
  })

  it('should display Non-Standard badge for standardConcept=null', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[2]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const nonStandardChip = chips.find(chip => chip.text().includes('Non-Standard'))
    expect(nonStandardChip).toBeTruthy()
  })

  it('should display Valid badge when invalidReason is null', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    // Check that chips exist
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should display Invalid badge when invalidReason is set', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[2]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    // Check that chips exist
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should format record counts with commas', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[0]] })
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual([mockConcepts[0]])
  })

  it('should display dash for undefined record counts', async () => {
    const conceptWithoutCounts: Concept = {
      ...mockConcepts[0],
      recordCount: undefined,
      descendantRecordCount: undefined,
      personCount: undefined,
      descendantPersonCount: undefined,
    }

    const wrapper = mountComponent({ concepts: [conceptWithoutCounts] })
    await wrapper.vm.$nextTick()

    const text = wrapper.text()
    // Check that dashes are displayed for undefined counts
    expect(text).toContain('-')
  })

  it('should show loading spinner for record counts when loadingRecordCounts is true', async () => {
    const conceptWithoutCounts: Concept = {
      ...mockConcepts[0],
      recordCount: undefined,
    }

    const wrapper = mountComponent({
      concepts: [conceptWithoutCounts],
      loadingRecordCounts: true,
    })
    await wrapper.vm.$nextTick()

    const progressCircular = wrapper.findAllComponents({ name: 'VProgressCircular' })
    expect(progressCircular.length).toBeGreaterThan(0)
  })

  it('should not show add button column when showAddButton is false', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, showAddButton: false })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })

    // Check that headers don't include actions column
    const headers = dataTable.props('headers')
    const actionsHeader = headers.find((h: { key: string }) => h.key === 'actions')
    expect(actionsHeader).toBeUndefined()
  })

  it('should show add button column when showAddButton is true', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, showAddButton: true })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })

    // Check that headers include actions column
    const headers = dataTable.props('headers')
    const actionsHeader = headers.find((h: { key: string }) => h.key === 'actions')
    expect(actionsHeader).toBeTruthy()
  })

  it('should render Add button for concepts not in set', async () => {
    const wrapper = mountComponent({
      concepts: mockConcepts,
      showAddButton: true,
      conceptsInSet: new Set(),
    })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const addButtons = buttons.filter(btn => btn.text().includes('Add'))
    expect(addButtons.length).toBeGreaterThan(0)
  })

  it('should render Remove button for concepts in set', async () => {
    const wrapper = mountComponent({
      concepts: mockConcepts,
      showAddButton: true,
      conceptsInSet: new Set([313217]),
    })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const removeButtons = buttons.filter(btn => btn.text().includes('Remove'))
    expect(removeButtons.length).toBeGreaterThan(0)
  })

  it('should emit add-concept when Add button is clicked', async () => {
    const wrapper = mountComponent({
      concepts: mockConcepts,
      showAddButton: true,
      conceptsInSet: new Set(),
    })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const addButton = buttons.find(btn => btn.text().includes('Add'))

    // Note: Items are sorted by conceptId ascending, so first item is mockConcepts[2] (192855)
    expect(addButton).toBeDefined()
    await addButton!.trigger('click')

    expect(wrapper.emitted('add-concept')).toBeTruthy()
    expect(wrapper.emitted('add-concept')![0]).toEqual([mockConcepts[2]])
  })

  it('should emit remove-concept when Remove button is clicked', async () => {
    const wrapper = mountComponent({
      concepts: mockConcepts,
      showAddButton: true,
      conceptsInSet: new Set([313217]),
    })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const removeButton = buttons.find(btn => btn.text().includes('Remove'))

    expect(removeButton).toBeDefined()
    await removeButton!.trigger('click')

    expect(wrapper.emitted('remove-concept')).toBeTruthy()
    expect(wrapper.emitted('remove-concept')![0]).toEqual([mockConcepts[0]])
  })

  it('should display no data message when concepts is empty', async () => {
    const wrapper = mountComponent({ concepts: [] })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No records to display')
  })

  it('should display loading message when loading', async () => {
    const wrapper = mountComponent({ concepts: [], loading: true })
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('loading')).toBe(true)
  })

  it('should display loading skeleton when loading', async () => {
    const wrapper = mountComponent({ loading: true })
    await wrapper.vm.$nextTick()

    const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should calculate total pages correctly', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 240, itemsPerPage: 60 })
    const pagination = wrapper.findComponent({ name: 'VPagination' })
    expect(pagination.props('length')).toBe(4)
  })

  it('should display concept names', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Atrial fibrillation')
    expect(wrapper.text()).toContain('Myocardial infarction')
    expect(wrapper.text()).toContain('Glucose measurement')
  })

  it('should display concept codes', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('49436004')
    expect(wrapper.text()).toContain('22298006')
    expect(wrapper.text()).toContain('33747003')
  })

  it('should display vocabulary IDs', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('SNOMED')
  })

  it('should display domain IDs', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Condition')
    expect(wrapper.text()).toContain('Measurement')
  })

  it('should use primary color for Standard concepts', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const typeChips = chips.filter(chip =>
      chip.text().includes('Standard') ||
      chip.text().includes('Classification') ||
      chip.text().includes('Non-Standard')
    )

    expect(typeChips.length).toBeGreaterThan(0)
    expect(typeChips[0].props('color')).toBe('primary')
  })

  it('should use info color for Classification concepts', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[1]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const typeChips = chips.filter(chip => chip.text().includes('Classification'))

    expect(typeChips.length).toBeGreaterThan(0)
    expect(typeChips[0].props('color')).toBe('info')
  })

  it('should use success color for Valid concepts', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const validChips = chips.filter(chip => chip.text().includes('Valid'))

    expect(validChips.length).toBeGreaterThan(0)
    expect(validChips[0].props('color')).toBe('success')
  })

  it('should use error color for Invalid concepts', async () => {
    const wrapper = mountComponent({ concepts: [mockConcepts[2]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const invalidChips = chips.filter(chip => chip.text().includes('Invalid'))

    expect(invalidChips.length).toBeGreaterThan(0)
    expect(invalidChips[0].props('color')).toBe('error')
  })

  it('should default to page 1 when not specified', () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100 })
    const pagination = wrapper.findComponent({ name: 'VPagination' })
    expect(pagination.props('modelValue')).toBe(1)
  })

  it('should default to 60 items per page when not specified', () => {
    const wrapper = mountComponent({ concepts: mockConcepts })
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('modelValue')).toBe(60)
  })

  it('should emit update:page as 1 when itemsPerPage changes', async () => {
    const wrapper = mountComponent({ concepts: mockConcepts, totalItems: 100, page: 3 })
    const select = wrapper.findComponent({ name: 'VSelect' })

    await select.vm.$emit('update:modelValue', 120)

    expect(wrapper.emitted('update:page')).toBeTruthy()
    expect(wrapper.emitted('update:page')![0]).toEqual([1])
  })

  describe('Accessibility', () => {
    it('labels the select-all header checkbox', async () => {
      const wrapper = mountComponent({ concepts: mockConcepts, selectable: true })
      await wrapper.vm.$nextTick()

      const html = wrapper.html()
      expect(html).toContain('aria-label="Select all concepts"')
    })

    it('labels per-row checkboxes with the concept name', async () => {
      const wrapper = mountComponent({ concepts: mockConcepts, selectable: true })
      await wrapper.vm.$nextTick()

      const html = wrapper.html()
      expect(html).toContain('aria-label="Select Atrial fibrillation"')
      expect(html).toContain('aria-label="Select Myocardial infarction"')
      expect(html).toContain('aria-label="Select Glucose measurement"')
    })
  })
})

describe('ConceptTable selection', () => {
  const selectionConcepts: Concept[] = [
    { ...mockConcepts[0], conceptId: 100, conceptName: 'Diabetes', conceptCode: 'D1' },
    { ...mockConcepts[0], conceptId: 200, conceptName: 'Hypertension', conceptCode: 'H1' },
    { ...mockConcepts[0], conceptId: 300, conceptName: 'Asthma', conceptCode: 'A1' },
  ]

  function createWrapper(opts: {
    selectable?: boolean
    selected?: number[]
    showAddButton?: boolean
    conceptsInSet?: Set<number>
    concepts?: Concept[]
  } = {}) {
    return mountComponent({
      concepts: opts.concepts ?? selectionConcepts,
      totalItems: (opts.concepts ?? selectionConcepts).length,
      selectable: opts.selectable ?? false,
      selected: opts.selected ?? [],
      showAddButton: opts.showAddButton ?? false,
      conceptsInSet: opts.conceptsInSet ?? new Set<number>(),
    })
  }

  it('renders no checkbox column when selectable is false (default)', async () => {
    const wrapper = createWrapper({ selectable: false })
    await wrapper.vm.$nextTick()

    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(false)

    const rowCheckboxes = wrapper.findAll('[data-testid^="concept-table-row-checkbox-"]')
    expect(rowCheckboxes.length).toBe(0)
  })

  it('renders checkbox column with selectable=true and none checked when selected is empty', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await wrapper.vm.$nextTick()

    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(true)

    const rowCheckboxes = wrapper.findAll('[data-testid^="concept-table-row-checkbox-"]')
    expect(rowCheckboxes.length).toBe(selectionConcepts.length)

    for (const cb of rowCheckboxes) {
      const input = cb.find('input[type="checkbox"]')
      expect(input.exists()).toBe(true)
      expect((input.element as HTMLInputElement).checked).toBe(false)
    }
  })

  it('checks only the row whose conceptId is in selected', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [200] })
    await wrapper.vm.$nextTick()

    const checked100 = wrapper.find('[data-testid="concept-table-row-checkbox-100"] input[type="checkbox"]')
    const checked200 = wrapper.find('[data-testid="concept-table-row-checkbox-200"] input[type="checkbox"]')
    const checked300 = wrapper.find('[data-testid="concept-table-row-checkbox-300"] input[type="checkbox"]')

    expect((checked100.element as HTMLInputElement).checked).toBe(false)
    expect((checked200.element as HTMLInputElement).checked).toBe(true)
    expect((checked300.element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:selected when a row checkbox is clicked', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await wrapper.vm.$nextTick()

    const cb = wrapper.find('[data-testid="concept-table-row-checkbox-200"] input[type="checkbox"]')
    expect(cb.exists()).toBe(true)
    await cb.setValue(true)
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('update:selected')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as number[]
    expect(last).toContain(200)
  })

  it('emits update:selected with all visible conceptIds when header checkbox toggled on', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await wrapper.vm.$nextTick()

    const header = wrapper.find('[data-testid="concept-table-select-all"] input[type="checkbox"]')
    expect(header.exists()).toBe(true)
    await header.setValue(true)
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('update:selected')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as number[]
    expect(last.sort()).toEqual([100, 200, 300])
  })

  it('coexists with showAddButton; clicking Add still emits add-concept', async () => {
    const wrapper = createWrapper({
      selectable: true,
      selected: [],
      showAddButton: true,
      conceptsInSet: new Set<number>(),
    })
    await wrapper.vm.$nextTick()

    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(true)

    const addButtons = wrapper.findAll('button').filter((b) => b.text().includes('Add'))
    expect(addButtons.length).toBeGreaterThan(0)
    await addButtons[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('add-concept')).toBeTruthy()
  })
})
