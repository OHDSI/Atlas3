import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import DrugExposure from '@/components/circe/criteria/DrugExposure.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CriteriaRecord = Record<string, Record<string, unknown> | undefined>

function mountEditor() {
  const criteria = reactive({}) as CriteriaRecord
  const wrapper = mountComponent(DrugExposure, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.drug-exposure-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('DrugExposure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested attribute rows', async () => {
    const { wrapper } = mountEditor()

    expect(wrapper.text()).toContain('a drug exposure of')

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const selectionTarget = { targetRef: { value: 1 } }

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

    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('adds and removes First Exposure', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Exposure')
    await selectMenuItem(wrapper, 'First Exposure')

    expect(criteria.DrugExposure?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Exposure')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Exposure')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.DrugExposure?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    const numericInputs = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await numericInputs[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await numericInputs[1].vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.DrugExposure?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.DrugExposure?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.DrugExposure?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, mutates, removes, and restores stop reason', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Stop Reason')
    await selectMenuItem(wrapper, 'Stop Reason')

    expect(criteria.DrugExposure?.StopReason).toEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '!contains')
    await nextTick()
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'discontinued')
    await nextTick()
    expect(criteria.DrugExposure?.StopReason).toEqual({ Text: 'discontinued', Op: '!contains' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Stop Reason')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.StopReason).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Stop Reason')
  })

  it('adds, mutates, removes, and restores Drug Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Type')
    await selectMenuItem(wrapper, 'Drug Type')

    expect(criteria.DrugExposure?.DrugType).toStrictEqual([])
    expect(criteria.DrugExposure?.DrugTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 1234, CONCEPT_NAME: 'Drug type concept' }]
    await nextTick()
    expect(criteria.DrugExposure?.DrugType).toStrictEqual([{ CONCEPT_ID: 1234, CONCEPT_NAME: 'Drug type concept' }])

    const excludeChip = conceptArray.find('.concept-array__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.DrugExposure?.DrugTypeExclude).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Drug Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DrugType).toBeUndefined()
    expect(criteria.DrugExposure?.DrugTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Type')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.DrugExposure?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.DrugExposure?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()

    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.DrugExposure?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.DrugExposure?.DateAdjustment?.EndOffset).toBe(-2)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
    await selectMenuItem(wrapper, 'Start Date')

    expect(criteria.DrugExposure?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.DrugExposure?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
  })

  it('adds, mutates, removes, and restores End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
    await selectMenuItem(wrapper, 'End Date')

    expect(criteria.DrugExposure?.OccurrenceEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.DrugExposure?.OccurrenceEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.OccurrenceEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
  })

  it('adds, mutates, removes, and restores Refills', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Refills')
    await selectMenuItem(wrapper, 'Refills')

    expect(criteria.DrugExposure?.Refills).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'eq')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()

    expect(criteria.DrugExposure?.Refills).toStrictEqual({ Value: 2, Op: 'eq', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.Refills).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Refills')
  })

  it('adds, mutates, removes, and restores Quantity', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
    await selectMenuItem(wrapper, 'Quantity')

    expect(criteria.DrugExposure?.Quantity).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '10')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '20')
    await nextTick()

    expect(criteria.DrugExposure?.Quantity).toStrictEqual({ Value: 10, Op: 'bt', Extent: 20 })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.Quantity).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
  })

  it('adds, mutates, removes, and restores Days Supply', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Days Supply')
    await selectMenuItem(wrapper, 'Days Supply')

    expect(criteria.DrugExposure?.DaysSupply).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '30')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '90')
    await nextTick()

    expect(criteria.DrugExposure?.DaysSupply).toStrictEqual({ Value: 30, Op: 'bt', Extent: 90 })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DaysSupply).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Days Supply')
  })

  it('adds, mutates, removes, and restores Route', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Route')
    await selectMenuItem(wrapper, 'Route')

    expect(criteria.DrugExposure?.RouteConcept).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 100, CONCEPT_NAME: 'Oral' }]
    await nextTick()

    expect(criteria.DrugExposure?.RouteConcept).toStrictEqual([{ CONCEPT_ID: 100, CONCEPT_NAME: 'Oral' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.RouteConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Route')
  })

  it('adds, mutates, removes, and restores Effective Drug Dose', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Effective Drug Dose')
    await selectMenuItem(wrapper, 'Effective Drug Dose')

    expect(criteria.DrugExposure?.EffectiveDrugDose).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '5')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '15')
    await nextTick()

    expect(criteria.DrugExposure?.EffectiveDrugDose).toStrictEqual({ Value: 5, Op: 'bt', Extent: 15 })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.EffectiveDrugDose).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Effective Drug Dose')
  })

  it('adds, mutates, removes, and restores Dose Unit', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit')
    await selectMenuItem(wrapper, 'Dose Unit')

    expect(criteria.DrugExposure?.DoseUnit).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 200, CONCEPT_NAME: 'mg' }]
    await nextTick()

    expect(criteria.DrugExposure?.DoseUnit).toStrictEqual([{ CONCEPT_ID: 200, CONCEPT_NAME: 'mg' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DoseUnit).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit')
  })

  it('adds, selects, removes, and restores Dose Unit Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit Concept Set')
    await selectMenuItem(wrapper, 'Dose Unit Concept Set')

    expect(criteria.DrugExposure?.DoseUnitCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.DoseUnitCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DoseUnitCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit Concept Set')
  })

  it('adds, mutates, removes, and restores Lot Number', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Lot Number')
    await selectMenuItem(wrapper, 'Lot Number')

    expect(criteria.DrugExposure?.LotNumber).toStrictEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'LOT-42')
    await nextTick()

    expect(criteria.DrugExposure?.LotNumber).toStrictEqual({ Text: 'LOT-42', Op: 'contains' })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.LotNumber).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Lot Number')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.DrugExposure?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }]
    await nextTick()

    expect(criteria.DrugExposure?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Drug Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Type Concept Set')
    await selectMenuItem(wrapper, 'Drug Type Concept Set')

    expect(criteria.DrugExposure?.DrugTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.DrugTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Drug Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DrugTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Type Concept Set')
  })

  it('adds, selects, removes, and restores Route Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Route Concept Set')
    await selectMenuItem(wrapper, 'Route Concept Set')

    expect(criteria.DrugExposure?.RouteConceptCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.RouteConceptCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.RouteConceptCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Route Concept Set')
  })

  it('adds, selects, removes, and restores Dose Unit Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit Concept Set')
    await selectMenuItem(wrapper, 'Dose Unit Concept Set')

    expect(criteria.DrugExposure?.DoseUnitCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.DoseUnitCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DoseUnitCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Dose Unit Concept Set')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.DrugExposure?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, selects, removes, and restores Drug Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Source Concept')
    await selectMenuItem(wrapper, 'Drug Source Concept')

    expect(criteria.DrugExposure?.DrugSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugExposure?.DrugSourceConcept).toBe(1)

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Drug Source Concept')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugExposure?.DrugSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Drug Source Concept')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.DrugExposure?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.DrugExposure?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
