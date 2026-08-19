import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import ConditionEra from '@/components/circe/criteria/ConditionEra.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type ConditionEraModel = Record<string, any>

function mountConditionEra() {
  const criteria = reactive({}) as { ConditionEra?: ConditionEraModel }

  const wrapper = mountComponent(ConditionEra, {
    props: {
      criteria,
      conceptSets: [{ id: 7, name: 'Gender concept set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountConditionEra>['wrapper']) {
  await wrapper.get('.condition-era-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('ConditionEra', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested criteria renderer', async () => {
    const { wrapper } = mountConditionEra()

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const selectionTarget = { targetRef: { value: 7 } }

    headerConceptSet.vm.$emit('select', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('edit', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('clear')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    criteriaAttributes.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    await wrapper.get('.condition-era-editor__header button.v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('adds, mutates, removes, and restores Age at Start', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
    await selectMenuItem(wrapper, 'Age at Start')

    expect(criteria.ConditionEra?.AgeAtStart).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()

    const numericInputs = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await numericInputs[0].vm.$emit('update:modelValue', '21')
    await nextTick()
    await numericInputs[1].vm.$emit('update:modelValue', '30')
    await nextTick()

    expect(criteria.ConditionEra?.AgeAtStart).toStrictEqual({ Value: 21, Op: 'bt', Extent: 30 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at Start')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.AgeAtStart).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
  })

  it('adds, mutates, removes, and restores Age at End', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
    await selectMenuItem(wrapper, 'Age at End')

    expect(criteria.ConditionEra?.AgeAtEnd).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()

    const numericInputs = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await numericInputs[0].vm.$emit('update:modelValue', '40')
    await nextTick()
    await numericInputs[1].vm.$emit('update:modelValue', '60')
    await nextTick()

    expect(criteria.ConditionEra?.AgeAtEnd).toStrictEqual({ Value: 40, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at End')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.AgeAtEnd).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.ConditionEra?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.ConditionEra?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.ConditionEra?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 7)
    await nextTick()
    expect(criteria.ConditionEra?.GenderCS).toStrictEqual({ CodesetId: 7, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Gender concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(7)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.text()).toBe('any of')
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionEra?.GenderCS?.IsExclusion).toBe(true)
    expect(excludeChip.text()).toBe('not any of')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Start Date', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
    await selectMenuItem(wrapper, 'Start Date')

    expect(criteria.ConditionEra?.EraStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.ConditionEra?.EraStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.EraStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
  })

  it('adds, mutates, removes, and restores End Date', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
    await selectMenuItem(wrapper, 'End Date')

    expect(criteria.ConditionEra?.EraEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.ConditionEra?.EraEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.EraEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.ConditionEra?.DateAdjustment).toStrictEqual({
      StartWith: 'START_DATE',
      StartOffset: 0,
      EndWith: 'END_DATE',
      EndOffset: 0,
    })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()

    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '4')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-1')
    await nextTick()

    expect(criteria.ConditionEra?.DateAdjustment?.StartOffset).toBe(4)
    expect(criteria.ConditionEra?.DateAdjustment?.EndOffset).toBe(-1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Condition Count', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Count')
    await selectMenuItem(wrapper, 'Condition Count')

    expect(criteria.ConditionEra?.OccurrenceCount).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '5')
    await nextTick()

    expect(criteria.ConditionEra?.OccurrenceCount).toStrictEqual({ Value: 2, Op: 'bt', Extent: 5 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Count')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.OccurrenceCount).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Count')
  })

  it('adds, mutates, removes, and restores Era Length', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Era Length')
    await selectMenuItem(wrapper, 'Era Length')

    expect(criteria.ConditionEra?.EraLength).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '365')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '730')
    await nextTick()

    expect(criteria.ConditionEra?.EraLength).toStrictEqual({ Value: 365, Op: 'bt', Extent: 730 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Era Length')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.EraLength).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Era Length')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.ConditionEra?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.ConditionEra?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })

  it('adds and removes First Diagnosis', async () => {
    const { wrapper, criteria } = mountConditionEra()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Diagnosis')
    await selectMenuItem(wrapper, 'First Diagnosis')

    expect(criteria.ConditionEra?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Diagnosis')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionEra?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Diagnosis')
  })
})
