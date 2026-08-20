import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import ProcedureOccurrence from '@/components/circe/criteria/ProcedureOccurrence.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type CriteriaRecord = Record<string, Record<string, unknown> | undefined>

function mountEditor() {
  const criteria = reactive({}) as CriteriaRecord
  const wrapper = mountComponent(ProcedureOccurrence, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

function getSetupState(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  return (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.procedure-occurrence-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('ProcedureOccurrence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested attribute rows', async () => {
    const { wrapper } = mountEditor()

    expect(wrapper.text()).toContain('a procedure occurrence of')

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const selectionTarget = { targetRef: { value: 42 } }

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

  it('covers the header delete action and Age attribute helper functions', async () => {
    const { wrapper, criteria } = mountEditor()
    const setup = getSetupState(wrapper)

    const ageAttribute = (setup.attributeSpecs as Array<{ key: string; componentProps: () => Record<string, unknown>; clear: () => void }>)
      .find(attribute => attribute.key === 'Age')
    const sourceConceptAttribute = (setup.attributeSpecs as Array<{ key: string; componentProps: () => Record<string, unknown>; clear: () => void }>)
      .find(attribute => attribute.key === 'ProcedureSourceConcept')

    expect(ageAttribute).toBeTruthy()
    expect(sourceConceptAttribute).toBeTruthy()

    const ageProps = ageAttribute!.componentProps()
    expect(ageProps).toBeTruthy()

    ageAttribute!.clear()
    expect(criteria.ProcedureOccurrence?.Age).toBeUndefined()

    const sourceConceptProps = sourceConceptAttribute!.componentProps()
    expect(sourceConceptProps).toMatchObject({
      selectLabel: 'Select Concept Set',
      compact: true,
    })

    sourceConceptAttribute!.clear()
    expect(criteria.ProcedureOccurrence?.ProcedureSourceConcept).toBeUndefined()

    const deleteButton = wrapper.findAllComponents({ name: 'AtlasButton' }).find(button => button.props('icon') === 'mdi-delete')
    expect(deleteButton).toBeTruthy()
    await deleteButton!.trigger('click')
    await nextTick()

    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('adds, mutates, removes, and restores Procedure Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Date')
    await selectMenuItem(wrapper, 'Procedure Date')

    expect(criteria.ProcedureOccurrence?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.ProcedureOccurrence?.OccurrenceStartDate).toMatchObject({ Value: '2024-01-01', Op: 'bt' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Procedure Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Date')
  })

  it('adds, mutates, removes, and restores Procedure Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Type')
    await selectMenuItem(wrapper, 'Procedure Type')

    expect(criteria.ProcedureOccurrence?.ProcedureType).toStrictEqual([])
    expect(criteria.ProcedureOccurrence?.ProcedureTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 200, CONCEPT_NAME: 'Procedure Type' }]
    await nextTick()

    expect(criteria.ProcedureOccurrence?.ProcedureType).toStrictEqual([{ CONCEPT_ID: 200, CONCEPT_NAME: 'Procedure Type' }])

    const excludeChip = conceptArray.find('.concept-array__exclude-chip')
    expect(excludeChip.exists()).toBe(true)
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.ProcedureOccurrence?.ProcedureTypeExclude).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Procedure Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ProcedureType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Type')
  })

  it('adds, selects, removes, and restores Procedure Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Type Concept Set')
    await selectMenuItem(wrapper, 'Procedure Type Concept Set')

    expect(criteria.ProcedureOccurrence?.ProcedureTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.findComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ProcedureOccurrence?.ProcedureTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Procedure Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ProcedureTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Type Concept Set')
  })

  it('adds, mutates, removes, and restores Quantity and Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
    await selectMenuItem(wrapper, 'Quantity')

    expect(criteria.ProcedureOccurrence?.Quantity).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '5')
    await nextTick()
    expect(criteria.ProcedureOccurrence?.Quantity).toStrictEqual({ Value: 2, Op: 'bt', Extent: 5 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Quantity')
    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.Quantity).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.ProcedureOccurrence?.DateAdjustment).toStrictEqual({
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

    expect(criteria.ProcedureOccurrence?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.ProcedureOccurrence?.DateAdjustment?.EndOffset).toBe(-2)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')
    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.DateAdjustment).toBeUndefined()
  })

  it('adds, mutates, removes, and restores Nested Criteria', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.ProcedureOccurrence?.CorrelatedCriteria).toBeTruthy()

    const criteriaGroup = wrapper.findComponent({ name: 'CriteriaGroup' })
    await criteriaGroup.vm.$emit('remove')
    await nextTick()
    expect(criteria.ProcedureOccurrence?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })

  it('adds, mutates, removes, and restores First Procedure', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Procedure')
    await selectMenuItem(wrapper, 'First Procedure')

    expect(criteria.ProcedureOccurrence?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Procedure')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Procedure')
  })

  it('adds, mutates, removes, and restores Modifier', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Modifier')
    await selectMenuItem(wrapper, 'Modifier')

    expect(criteria.ProcedureOccurrence?.Modifier).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 1001, CONCEPT_NAME: 'Modifier concept' }]
    await nextTick()

    expect(criteria.ProcedureOccurrence?.Modifier).toStrictEqual([{ CONCEPT_ID: 1001, CONCEPT_NAME: 'Modifier concept' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Modifier')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.Modifier).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Modifier')
  })

  it('adds, selects, removes, and restores Modifier Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Modifier Concept Set')
    await selectMenuItem(wrapper, 'Modifier Concept Set')

    expect(criteria.ProcedureOccurrence?.ModifierCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ProcedureOccurrence?.ModifierCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Modifier Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ModifierCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Modifier Concept Set')
  })

  it('adds, selects, removes, and restores Procedure Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Source Concept')
    await selectMenuItem(wrapper, 'Procedure Source Concept')

    expect(criteria.ProcedureOccurrence?.ProcedureSourceConcept).toBeUndefined()

    criteria.ProcedureOccurrence!.ProcedureSourceConcept = 1
    await nextTick()
    expect(criteria.ProcedureOccurrence?.ProcedureSourceConcept).toBe(1)

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Procedure Source Concept')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ProcedureSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Procedure Source Concept')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.ProcedureOccurrence?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '45')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '60')
    await nextTick()

    expect(criteria.ProcedureOccurrence?.Age).toStrictEqual({ Value: 45, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.ProcedureOccurrence?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.ProcedureOccurrence?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.ProcedureOccurrence?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ProcedureOccurrence?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.ProcedureOccurrence?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 3001, CONCEPT_NAME: 'Provider specialty' }]
    await nextTick()

    expect(criteria.ProcedureOccurrence?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 3001, CONCEPT_NAME: 'Provider specialty' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Provider Specialty')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.ProcedureOccurrence?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ProcedureOccurrence?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Provider Specialty Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, mutates, removes, and restores Visit Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
    await selectMenuItem(wrapper, 'Visit Type')

    expect(criteria.ProcedureOccurrence?.VisitType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 4001, CONCEPT_NAME: 'Visit type' }]
    await nextTick()

    expect(criteria.ProcedureOccurrence?.VisitType).toStrictEqual([{ CONCEPT_ID: 4001, CONCEPT_NAME: 'Visit type' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Visit Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.VisitType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type')
  })

  it('adds, selects, removes, and restores Visit Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Type Concept Set')

    expect(criteria.ProcedureOccurrence?.VisitTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ProcedureOccurrence?.VisitTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Visit Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ProcedureOccurrence?.VisitTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
  })
})
