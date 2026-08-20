import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import Observation from '@/components/circe/criteria/Observation.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CriteriaRecord = Record<string, Record<string, unknown> | undefined>

function mountEditor() {
  const criteria = reactive({}) as CriteriaRecord
  const wrapper = mountComponent(Observation, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.observation-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('Observation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested attribute rows', async () => {
    const { wrapper } = mountEditor()

    expect(wrapper.text()).toContain('an observation of')

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const selectionTarget = { targetRef: { value: 1 } }

    headerConceptSet.vm.$emit('select', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.slice(-1)[0]).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('edit', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]).toEqual([selectionTarget])

    headerConceptSet.vm.$emit('clear')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.slice(-1)[0]).toEqual([])

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    criteriaAttributes.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.slice(-1)[0]).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.slice(-1)[0]).toEqual([])

    expect(wrapper.emitted('remove')).toBeFalsy()
  })

  it('adds and removes First Observation', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Observation')
    await selectMenuItem(wrapper, 'First Observation')

    expect(criteria.Observation?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Observation')

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Observation')
  })

  it('adds, mutates, removes, and restores Observation Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Date')
    await selectMenuItem(wrapper, 'Observation Date')

    expect(criteria.Observation?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    const dateTextFields = dateRange.findAllComponents({ name: 'AtlasTextField' })
    await dateTextFields[0]!.vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.Observation?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Observation Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Date')
  })

  it('adds, mutates, removes, and restores Observation Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Type')
    await selectMenuItem(wrapper, 'Observation Type')

    expect(criteria.Observation?.ObservationType).toStrictEqual([])
    expect(criteria.Observation?.ObservationTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 111, CONCEPT_NAME: 'Type A' }]
    await nextTick()
    expect(criteria.Observation?.ObservationType).toStrictEqual([{ CONCEPT_ID: 111, CONCEPT_NAME: 'Type A' }])

    const excludeChip = conceptArray.find('.concept-array__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.Observation?.ObservationTypeExclude).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Observation Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ObservationType).toBeUndefined()
    expect(criteria.Observation?.ObservationTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Type')
  })

  it('adds, selects, removes, and restores Observation Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Type Concept Set')
    await selectMenuItem(wrapper, 'Observation Type Concept Set')

    expect(criteria.Observation?.ObservationTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.ObservationTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Observation Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ObservationTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Type Concept Set')
  })

  it('adds, mutates, removes, and restores Value as Number', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Number')
    await selectMenuItem(wrapper, 'Value as Number')

    expect(criteria.Observation?.ValueAsNumber).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    const numericTextFields = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await numericTextFields[0]!.vm.$emit('update:modelValue', '10')
    await nextTick()
    await numericTextFields[1]!.vm.$emit('update:modelValue', '20')
    await nextTick()

    expect(criteria.Observation?.ValueAsNumber).toStrictEqual({ Value: 10, Op: 'bt', Extent: 20 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ValueAsNumber).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Number')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.Observation?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()

    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0]!.vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1]!.vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect((criteria.Observation?.DateAdjustment as any)?.StartOffset).toBe(3)
    expect((criteria.Observation?.DateAdjustment as any)?.EndOffset).toBe(-2)

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Value as String', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as String')
    await selectMenuItem(wrapper, 'Value as String')

    expect(criteria.Observation?.ValueAsString).toStrictEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'positive')
    await nextTick()
    expect(criteria.Observation?.ValueAsString).toStrictEqual({ Text: 'positive', Op: 'contains' })

    await textFilter.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '!contains')
    await nextTick()
    expect(criteria.Observation?.ValueAsString).toStrictEqual({ Text: 'positive', Op: '!contains' })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ValueAsString).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as String')
  })

  it('adds, mutates, removes, and restores Value as Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept')
    await selectMenuItem(wrapper, 'Value as Concept')

    expect(criteria.Observation?.ValueAsConcept).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 800, CONCEPT_NAME: 'Positive' }]
    await nextTick()

    expect(criteria.Observation?.ValueAsConcept).toStrictEqual([{ CONCEPT_ID: 800, CONCEPT_NAME: 'Positive' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ValueAsConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept')
  })

  it('adds, selects, removes, and restores Value as Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept Set')
    await selectMenuItem(wrapper, 'Value as Concept Set')

    expect(criteria.Observation?.ValueAsConceptCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.ValueAsConceptCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ValueAsConceptCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Value as Concept Set')
  })

  it('adds, mutates, removes, and restores Qualifier', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Qualifier')
    await selectMenuItem(wrapper, 'Qualifier')

    expect(criteria.Observation?.Qualifier).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 700, CONCEPT_NAME: 'Qualifier' }]
    await nextTick()

    expect(criteria.Observation?.Qualifier).toStrictEqual([{ CONCEPT_ID: 700, CONCEPT_NAME: 'Qualifier' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.Qualifier).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Qualifier')
  })

  it('adds, selects, removes, and restores Qualifier Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Qualifier Concept Set')
    await selectMenuItem(wrapper, 'Qualifier Concept Set')

    expect(criteria.Observation?.QualifierCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.QualifierCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.QualifierCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Qualifier Concept Set')
  })

  it('adds, mutates, removes, and restores Unit', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
    await selectMenuItem(wrapper, 'Unit')

    expect(criteria.Observation?.Unit).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 900, CONCEPT_NAME: 'mg' }]
    await nextTick()

    expect(criteria.Observation?.Unit).toStrictEqual([{ CONCEPT_ID: 900, CONCEPT_NAME: 'mg' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.Unit).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
  })

  it('adds, selects, removes, and restores Unit Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
    await selectMenuItem(wrapper, 'Unit Concept Set')

    expect(criteria.Observation?.UnitCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.UnitCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.UnitCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
  })

  it('adds, selects, removes, and restores Observation Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Source Concept')
    await selectMenuItem(wrapper, 'Observation Source Concept')

    expect(criteria.Observation?.ObservationSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.ObservationSourceConcept).toBe(1)

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Observation Source Concept')

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ObservationSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Observation Source Concept')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Observation?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    const ageTextFields = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await ageTextFields[0]!.vm.$emit('update:modelValue', '18')
    await nextTick()
    await ageTextFields[1]!.vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.Observation?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.Observation?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.Observation?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.Observation?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.Observation?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }]
    await nextTick()

    expect(criteria.Observation?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.Observation?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, mutates, removes, and restores Visit Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
    await selectMenuItem(wrapper, 'Visit Type')

    expect(criteria.Observation?.VisitType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 400, CONCEPT_NAME: 'Inpatient visit' }]
    await nextTick()

    expect(criteria.Observation?.VisitType).toStrictEqual([{ CONCEPT_ID: 400, CONCEPT_NAME: 'Inpatient visit' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.VisitType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
  })

  it('adds, selects, removes, and restores Visit Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Type Concept Set')

    expect(criteria.Observation?.VisitTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Observation?.VisitTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Observation?.VisitTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.Observation?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.Observation?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
