import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import ConditionOccurrence from '@/components/circe/criteria/ConditionOccurrence.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CriteriaModel = Record<string, any>

function mountConditionOccurrence() {
  const criteria = reactive({}) as { ConditionOccurrence?: CriteriaModel }

  const wrapper = mountComponent(ConditionOccurrence, {
    props: {
      criteria,
      conceptSets: [{ id: 42, name: 'Condition type concept set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountConditionOccurrence>['wrapper']) {
  await wrapper.get('.condition-occurrence-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('ConditionOccurrence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested criteria renderer', async () => {
    const { wrapper } = mountConditionOccurrence()

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const headerSelectionTarget = { targetRef: { value: 41 } }

    headerConceptSet.vm.$emit('select', headerSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([headerSelectionTarget])

    headerConceptSet.vm.$emit('edit', headerSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([headerSelectionTarget])

    headerConceptSet.vm.$emit('clear')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    const nestedSelectionTarget = { targetRef: { value: 42 } }

    criteriaAttributes.vm.$emit('select-concept-set', nestedSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([nestedSelectionTarget])

    criteriaAttributes.vm.$emit('edit-concept-set', nestedSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([nestedSelectionTarget])

    criteriaAttributes.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    await wrapper.get('.condition-occurrence-editor__header button.v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.ConditionOccurrence?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()

    const numericInputs = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await numericInputs[0].vm.$emit('update:modelValue', '45')
    await nextTick()
    await numericInputs[1].vm.$emit('update:modelValue', '60')
    await nextTick()

    expect(criteria.ConditionOccurrence?.Age).toStrictEqual({ Value: 45, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.ConditionOccurrence?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.ConditionOccurrence?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.ConditionOccurrence?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.ConditionOccurrence?.GenderCS).toStrictEqual({ CodesetId: 42, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Condition type concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.GenderCS?.IsExclusion).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Condition Status', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Status')
    await selectMenuItem(wrapper, 'Condition Status')

    expect(criteria.ConditionOccurrence?.ConditionStatus).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 1111, CONCEPT_NAME: 'Active' }]
    await nextTick()

    expect(criteria.ConditionOccurrence?.ConditionStatus).toStrictEqual([{ CONCEPT_ID: 1111, CONCEPT_NAME: 'Active' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Status')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ConditionStatus).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Status')
  })

  it('adds, selects, removes, and restores Condition Status Concept Set', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Status Concept Set')
    await selectMenuItem(wrapper, 'Condition Status Concept Set')

    expect(criteria.ConditionOccurrence?.ConditionStatusCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionStatusCS).toStrictEqual({ CodesetId: 42, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Condition type concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionStatusCS?.IsExclusion).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Status Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ConditionStatusCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Status Concept Set')
  })

  it('adds, mutates, removes, and restores Condition Start Date', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Start Date')
    await selectMenuItem(wrapper, 'Condition Start Date')

    expect(criteria.ConditionOccurrence?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.ConditionOccurrence?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Start Date')
  })

  it('adds, mutates, removes, and restores Condition End Date', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition End Date')
    await selectMenuItem(wrapper, 'Condition End Date')

    expect(criteria.ConditionOccurrence?.OccurrenceEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.ConditionOccurrence?.OccurrenceEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.OccurrenceEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition End Date')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.ConditionOccurrence?.DateAdjustment).toStrictEqual({
      StartWith: 'START_DATE',
      StartOffset: 0,
      EndWith: 'END_DATE',
      EndOffset: 0,
    })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()

    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.ConditionOccurrence?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.ConditionOccurrence?.DateAdjustment?.EndOffset).toBe(-2)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Condition Type', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Type')
    await selectMenuItem(wrapper, 'Condition Type')

    expect(criteria.ConditionOccurrence?.ConditionType).toStrictEqual([])
    expect(criteria.ConditionOccurrence?.ConditionTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 123, CONCEPT_NAME: 'Condition type concept' }]
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionType).toStrictEqual([{ CONCEPT_ID: 123, CONCEPT_NAME: 'Condition type concept' }])

    const excludeChip = conceptArray.find('.concept-array__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionTypeExclude).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ConditionType).toBeUndefined()
    expect(criteria.ConditionOccurrence?.ConditionTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Type')
  })

  it('adds, selects, removes, and restores Condition Type Concept Set', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Type Concept Set')
    await selectMenuItem(wrapper, 'Condition Type Concept Set')

    expect(criteria.ConditionOccurrence?.ConditionTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionTypeCS).toStrictEqual({ CodesetId: 42, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Condition type concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.ConditionTypeCS?.IsExclusion).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ConditionTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Type Concept Set')
  })

  it('adds, mutates, removes, and restores Visit', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit')
    await selectMenuItem(wrapper, 'Visit')

    expect(criteria.ConditionOccurrence?.VisitType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 9001, CONCEPT_NAME: 'Inpatient visit' }]
    await nextTick()

    expect(criteria.ConditionOccurrence?.VisitType).toStrictEqual([{ CONCEPT_ID: 9001, CONCEPT_NAME: 'Inpatient visit' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Visit')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.VisitType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit')
  })

  it('adds, selects, removes, and restores Visit Type Concept Set', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Type Concept Set')

    expect(criteria.ConditionOccurrence?.VisitTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.ConditionOccurrence?.VisitTypeCS).toStrictEqual({ CodesetId: 42, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Condition type concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.VisitTypeCS?.IsExclusion).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Visit Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.VisitTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
  })

  it('adds, mutates, removes, and restores Stop Reason', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Stop Reason')
    await selectMenuItem(wrapper, 'Stop Reason')

    expect(criteria.ConditionOccurrence?.StopReason).toStrictEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '!contains')
    await nextTick()
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'surgery')
    await nextTick()

    expect(criteria.ConditionOccurrence?.StopReason).toStrictEqual({ Text: 'surgery', Op: '!contains' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Stop Reason')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.StopReason).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Stop Reason')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.ConditionOccurrence?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 2001, CONCEPT_NAME: 'Cardiology' }]
    await nextTick()
    expect(criteria.ConditionOccurrence?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 2001, CONCEPT_NAME: 'Cardiology' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Provider Specialty')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.ConditionOccurrence?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.ConditionOccurrence?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 42, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Condition type concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ConditionOccurrence?.ProviderSpecialtyCS?.IsExclusion).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Provider Specialty Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, selects, removes, and restores Condition Source Concept', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Source Concept')
    await selectMenuItem(wrapper, 'Condition Source Concept')

    expect(criteria.ConditionOccurrence?.ConditionSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()

    expect(criteria.ConditionOccurrence?.ConditionSourceConcept).toBe(42)

    expect(conceptSetSelection.exists()).toBe(true)
    expect(conceptSetSelection.get('[data-testid="selected-concept-set"]').text()).toContain('Condition type concept set')
    await conceptSetSelection.get('[data-testid="selected-concept-set"]').trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Condition Source Concept')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.ConditionSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Condition Source Concept')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.ConditionOccurrence?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.ConditionOccurrence?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })

  it('adds and removes First Diagnosis', async () => {
    const { wrapper, criteria } = mountConditionOccurrence()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Diagnosis')
    await selectMenuItem(wrapper, 'First Diagnosis')

    expect(criteria.ConditionOccurrence?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Diagnosis')

    await removeActiveAttribute(wrapper)
    expect(criteria.ConditionOccurrence?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Diagnosis')
  })
})