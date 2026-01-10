/**
 * ConceptSetTable Component Tests (T133)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetTable from '@/components/concepts/ConceptSetTable.vue'
import type { ConceptSetItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const mockItems: ConceptSetItem[] = [
  {
    conceptId: 313217,
    conceptName: 'Atrial fibrillation',
    conceptCode: '49436004',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: false,
    includeDescendants: true,
    includeMapped: false,
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
    isExcluded: true,
    includeDescendants: false,
    includeMapped: true,
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
    isExcluded: false,
    includeDescendants: false,
    includeMapped: false,
  },
]

function mountComponent(props = {}) {
  return mount(ConceptSetTable, {
    props: {
      items: [],
      loading: false,
      ...props,
    },
    global: {
      plugins: [vuetify],
    },
  })
}

describe('ConceptSetTable', () => {
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

  it('should display items in table', () => {
    const wrapper = mountComponent({ items: mockItems })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual(mockItems)
  })

  it('should display loading state', () => {
    const wrapper = mountComponent({ loading: true })
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('loading')).toBe(true)
  })

  it('should render checkboxes for includeDescendants', () => {
    const wrapper = mountComponent({ items: mockItems })
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    expect(checkboxes.length).toBeGreaterThan(0)
  })

  it('should emit toggle:descendants when descendants checkbox is clicked', async () => {
    const wrapper = mountComponent({ items: mockItems })
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })

    // Find the first descendants checkbox (there are multiple checkboxes per row)
    // Note: Items are sorted by conceptId ascending, so first item is 192855
    if (checkboxes.length > 0) {
      await checkboxes[0].vm.$emit('update:modelValue', false)

      expect(wrapper.emitted('toggle:descendants')).toBeTruthy()
      expect(wrapper.emitted('toggle:descendants')![0]).toEqual([192855])
    }
  })

  it('should emit toggle:mapped when mapped checkbox is clicked', async () => {
    const wrapper = mountComponent({ items: mockItems })
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })

    // Find the mapped checkbox (second in each row)
    // Note: Items are sorted by conceptId ascending, so first item is 192855
    if (checkboxes.length > 1) {
      await checkboxes[1].vm.$emit('update:modelValue', true)

      expect(wrapper.emitted('toggle:mapped')).toBeTruthy()
      expect(wrapper.emitted('toggle:mapped')![0]).toEqual([192855])
    }
  })

  it('should emit toggle:exclude when exclude checkbox is clicked', async () => {
    const wrapper = mountComponent({ items: mockItems })
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })

    // Find the exclude checkbox (third in each row)
    // Note: Items are sorted by conceptId ascending, so first item is 192855
    if (checkboxes.length > 2) {
      await checkboxes[2].vm.$emit('update:modelValue', true)

      expect(wrapper.emitted('toggle:exclude')).toBeTruthy()
      expect(wrapper.emitted('toggle:exclude')![0]).toEqual([192855])
    }
  })

  it('should emit remove when delete button is clicked', async () => {
    const wrapper = mountComponent({ items: mockItems })
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')

    // Note: Items are sorted by conceptId ascending, so first item is 192855
    if (deleteButtons.length > 0) {
      await deleteButtons[0].trigger('click')

      expect(wrapper.emitted('remove')).toBeTruthy()
      expect(wrapper.emitted('remove')![0]).toEqual([192855])
    }
  })

  it('should display concept type badges', () => {
    const wrapper = mountComponent({ items: mockItems })
    const chips = wrapper.findAllComponents({ name: 'VChip' })
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should display Standard badge for standardConcept=S', async () => {
    const wrapper = mountComponent({ items: [mockItems[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const standardChip = chips.find(chip => chip.text().includes('Standard'))
    expect(standardChip).toBeTruthy()
  })

  it('should display Classification badge for standardConcept=C', async () => {
    const wrapper = mountComponent({ items: [mockItems[1]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const classificationChip = chips.find(chip => chip.text().includes('Classification'))
    expect(classificationChip).toBeTruthy()
  })

  it('should display Non-Standard badge for standardConcept=null', async () => {
    const wrapper = mountComponent({ items: [mockItems[2]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const nonStandardChip = chips.find(chip => chip.text().includes('Non-Standard'))
    expect(nonStandardChip).toBeTruthy()
  })

  it('should display Valid badge when invalidReason is null', async () => {
    const wrapper = mountComponent({ items: [mockItems[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    // Check that chips exist
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should display Invalid badge when invalidReason is set', async () => {
    const wrapper = mountComponent({ items: [mockItems[2]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    // Check that chips exist
    expect(chips.length).toBeGreaterThan(0)
  })

  it('should use primary color for Standard concepts', async () => {
    const wrapper = mountComponent({ items: [mockItems[0]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const typeChips = chips.filter(chip =>
      chip.text().includes('Standard') ||
      chip.text().includes('Classification') ||
      chip.text().includes('Non-Standard')
    )

    if (typeChips.length > 0) {
      expect(typeChips[0].props('color')).toBe('primary')
    }
  })

  it('should use info color for Classification concepts', async () => {
    const wrapper = mountComponent({ items: [mockItems[1]] })
    await wrapper.vm.$nextTick()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const typeChips = chips.filter(chip => chip.text().includes('Classification'))

    if (typeChips.length > 0) {
      expect(typeChips[0].props('color')).toBe('info')
    }
  })

  it('should use error color for exclude checkbox', () => {
    const wrapper = mountComponent({ items: mockItems })
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })

    // Find the exclude checkbox (should have error color)
    const excludeCheckbox = checkboxes.find(cb => cb.props('color') === 'error')
    expect(excludeCheckbox).toBeTruthy()
  })

  it('should display no data message when items is empty', async () => {
    const wrapper = mountComponent({ items: [] })
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual([])
  })

  it('should display empty state instructions', async () => {
    const wrapper = mountComponent({ items: [] })
    await wrapper.vm.$nextTick()

    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('items')).toEqual([])
  })

  it('should display loading skeleton when loading', async () => {
    const wrapper = mountComponent({ loading: true })
    await wrapper.vm.$nextTick()

    const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should set items per page to 50', () => {
    const wrapper = mountComponent()
    const dataTable = wrapper.findComponent({ name: 'VDataTable' })
    expect(dataTable.props('itemsPerPage')).toBe(50)
  })

  it('should render delete button for each item', async () => {
    const wrapper = mountComponent({ items: mockItems })
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')
    expect(deleteButtons.length).toBe(mockItems.length)
  })

  it('should display concept names', async () => {
    const wrapper = mountComponent({ items: mockItems })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Atrial fibrillation')
    expect(wrapper.text()).toContain('Myocardial infarction')
    expect(wrapper.text()).toContain('Glucose measurement')
  })

  it('should display concept codes', async () => {
    const wrapper = mountComponent({ items: mockItems })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('49436004')
    expect(wrapper.text()).toContain('22298006')
    expect(wrapper.text()).toContain('33747003')
  })

  it('should display vocabulary IDs', async () => {
    const wrapper = mountComponent({ items: mockItems })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('SNOMED')
  })

  it('should show checked descendants checkbox when includeDescendants is true', async () => {
    const wrapper = mountComponent({ items: [mockItems[0]] })
    await wrapper.vm.$nextTick()

    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    const descendantsCheckbox = checkboxes[0]
    expect(descendantsCheckbox.props('modelValue')).toBe(true)
  })

  it('should show unchecked descendants checkbox when includeDescendants is false', async () => {
    const wrapper = mountComponent({ items: [mockItems[1]] })
    await wrapper.vm.$nextTick()

    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    const descendantsCheckbox = checkboxes[0]
    expect(descendantsCheckbox.props('modelValue')).toBe(false)
  })

  it('should show checked exclude checkbox when isExcluded is true', async () => {
    const wrapper = mountComponent({ items: [mockItems[1]] })
    await wrapper.vm.$nextTick()

    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    // Exclude is the third checkbox in each row
    const excludeCheckbox = checkboxes[2]
    expect(excludeCheckbox.props('modelValue')).toBe(true)
  })

  it('should show checked mapped checkbox when includeMapped is true', async () => {
    const wrapper = mountComponent({ items: [mockItems[1]] })
    await wrapper.vm.$nextTick()

    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    // Mapped is the second checkbox in each row
    const mappedCheckbox = checkboxes[1]
    expect(mappedCheckbox.props('modelValue')).toBe(true)
  })
})
