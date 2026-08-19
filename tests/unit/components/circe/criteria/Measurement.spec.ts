import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import Measurement from '@/components/circe/criteria/Measurement.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CriteriaRecord = Record<string, Record<string, unknown> | undefined>

function mountEditor() {
  const criteria = reactive({}) as CriteriaRecord
  const wrapper = mountComponent(Measurement, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.measurement-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('Measurement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested attribute rows', async () => {
    const { wrapper } = mountEditor()

    expect(wrapper.text()).toContain('a measurement of')

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const selectionTarget = { targetRef: { value: 1 } }

    headerConceptSet.vm.$emit('select', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('edit', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('clear', selectionTarget)
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

  it('adds and removes First Measurement', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Measurement')
    await selectMenuItem(wrapper, 'First Measurement')

    expect(criteria.Measurement?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Measurement')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Measurement')
  })

  it('adds, mutates, removes, and restores Measurement Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Date')
    await selectMenuItem(wrapper, 'Measurement Date')

    expect(criteria.Measurement?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.Measurement?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Measurement Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Date')
  })

  it('adds, mutates, removes, and restores Measurement Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Type')
    await selectMenuItem(wrapper, 'Measurement Type')

    expect(criteria.Measurement?.MeasurementType).toStrictEqual([])
    expect(criteria.Measurement?.MeasurementTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 1001, CONCEPT_NAME: 'Glucose' }]
    await nextTick()
    expect(criteria.Measurement?.MeasurementType).toStrictEqual([{ CONCEPT_ID: 1001, CONCEPT_NAME: 'Glucose' }])

    const excludeChip = conceptArray.find('.concept-array__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.Measurement?.MeasurementTypeExclude).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Measurement Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.MeasurementType).toBeUndefined()
    expect(criteria.Measurement?.MeasurementTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Type')
  })

  it('adds, selects, removes, and restores Measurement Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Type Concept Set')
    await selectMenuItem(wrapper, 'Measurement Type Concept Set')

    expect(criteria.Measurement?.MeasurementTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.MeasurementTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Measurement Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.MeasurementTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Type Concept Set')
  })

  it('adds, mutates, removes, and restores Operator', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Operator')
    await selectMenuItem(wrapper, 'Operator')

    expect(criteria.Measurement?.Operator).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 900, CONCEPT_NAME: 'Eq' }]
    await nextTick()

    expect(criteria.Measurement?.Operator).toStrictEqual([{ CONCEPT_ID: 900, CONCEPT_NAME: 'Eq' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.Operator).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Operator')
  })

  it('adds, selects, removes, and restores Operator Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Operator Concept Set')
    await selectMenuItem(wrapper, 'Operator Concept Set')

    expect(criteria.Measurement?.OperatorCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.OperatorCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.OperatorCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Operator Concept Set')
  })

  it('adds, mutates, removes, and restores Value as Number', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Number')
    await selectMenuItem(wrapper, 'Value as Number')

    expect(criteria.Measurement?.ValueAsNumber).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '7')
    await nextTick()

    expect(criteria.Measurement?.ValueAsNumber).toStrictEqual({ Value: 2, Op: 'bt', Extent: 7 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.ValueAsNumber).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Number')
  })

  it('adds, mutates, removes, and restores Value as Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept')
    await selectMenuItem(wrapper, 'Value as Concept')

    expect(criteria.Measurement?.ValueAsConcept).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 700, CONCEPT_NAME: 'Positive' }]
    await nextTick()

    expect(criteria.Measurement?.ValueAsConcept).toStrictEqual([{ CONCEPT_ID: 700, CONCEPT_NAME: 'Positive' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.ValueAsConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept')
  })

  it('adds, selects, removes, and restores Value as Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept Set')
    await selectMenuItem(wrapper, 'Value as Concept Set')

    expect(criteria.Measurement?.ValueAsConceptCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.ValueAsConceptCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.ValueAsConceptCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept Set')
  })

  it('adds, mutates, removes, and restores Unit', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
    await selectMenuItem(wrapper, 'Unit')

    expect(criteria.Measurement?.Unit).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 800, CONCEPT_NAME: 'mg/dL' }]
    await nextTick()

    expect(criteria.Measurement?.Unit).toStrictEqual([{ CONCEPT_ID: 800, CONCEPT_NAME: 'mg/dL' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.Unit).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
  })

  it('adds, selects, removes, and restores Unit Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
    await selectMenuItem(wrapper, 'Unit Concept Set')

    expect(criteria.Measurement?.UnitCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.UnitCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.UnitCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
  })

  it('adds, mutates, removes, and restores Range Low', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range Low')
    await selectMenuItem(wrapper, 'Range Low')

    expect(criteria.Measurement?.RangeLow).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '1')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '4')
    await nextTick()

    expect(criteria.Measurement?.RangeLow).toStrictEqual({ Value: 1, Op: 'bt', Extent: 4 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.RangeLow).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range Low')
  })

  it('adds, mutates, removes, and restores Range High', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range High')
    await selectMenuItem(wrapper, 'Range High')

    expect(criteria.Measurement?.RangeHigh).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '5')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '9')
    await nextTick()

    expect(criteria.Measurement?.RangeHigh).toStrictEqual({ Value: 5, Op: 'bt', Extent: 9 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.RangeHigh).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range High')
  })

  it('adds, mutates, removes, and restores Range Low Ratio', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range Low Ratio')
    await selectMenuItem(wrapper, 'Range Low Ratio')

    expect(criteria.Measurement?.RangeLowRatio).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '1')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '4')
    await nextTick()

    expect(criteria.Measurement?.RangeLowRatio).toStrictEqual({ Value: 1, Op: 'bt', Extent: 4 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.RangeLowRatio).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range Low Ratio')
  })

  it('adds, mutates, removes, and restores Range High Ratio', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range High Ratio')
    await selectMenuItem(wrapper, 'Range High Ratio')

    expect(criteria.Measurement?.RangeHighRatio).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '8')
    await nextTick()

    expect(criteria.Measurement?.RangeHighRatio).toStrictEqual({ Value: 2, Op: 'bt', Extent: 8 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.RangeHighRatio).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Range High Ratio')
  })

  it('adds and removes Abnormal', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Abnormal')
    await selectMenuItem(wrapper, 'Abnormal')

    expect(criteria.Measurement?.Abnormal).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Abnormal')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.Abnormal).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Abnormal')
  })

  it('adds, selects, removes, and restores Measurement Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Source Concept')
    await selectMenuItem(wrapper, 'Measurement Source Concept')

    expect(criteria.Measurement?.MeasurementSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.MeasurementSourceConcept).toBe(1)

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Measurement Source Concept')

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.MeasurementSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Measurement Source Concept')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Measurement?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.Measurement?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.Measurement?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.Measurement?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.Measurement?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.Measurement?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }]
    await nextTick()

    expect(criteria.Measurement?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.Measurement?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, mutates, removes, and restores Visit Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
    await selectMenuItem(wrapper, 'Visit Type')

    expect(criteria.Measurement?.VisitType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 400, CONCEPT_NAME: 'Inpatient visit' }]
    await nextTick()

    expect(criteria.Measurement?.VisitType).toStrictEqual([{ CONCEPT_ID: 400, CONCEPT_NAME: 'Inpatient visit' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.VisitType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
  })

  it('adds, selects, removes, and restores Visit Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Type Concept Set')

    expect(criteria.Measurement?.VisitTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Measurement?.VisitTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Measurement?.VisitTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.Measurement?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.Measurement?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
