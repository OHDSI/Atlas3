import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import Specimen from '@/components/circe/criteria/Specimen.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type SpecimenModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { Specimen?: SpecimenModel }
  const wrapper = mountComponent(Specimen, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.specimen-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('Specimen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested attribute renderer', async () => {
    const { wrapper } = mountEditor()
    const selectionTarget = { targetRef: { value: 42 } }

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    headerConceptSet.vm.$emit('select', selectionTarget)
    expect(wrapper.emitted('select-concept-set')?.at(-1)?.[0]).toBe(selectionTarget)

    headerConceptSet.vm.$emit('edit', selectionTarget)
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]).toBe(selectionTarget)

    headerConceptSet.vm.$emit('clear')
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toStrictEqual([])

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    criteriaAttributes.vm.$emit('select-concept-set', selectionTarget)
    expect(wrapper.emitted('select-concept-set')?.at(-1)?.[0]).toBe(selectionTarget)

    criteriaAttributes.vm.$emit('edit-concept-set', selectionTarget)
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]).toBe(selectionTarget)

    criteriaAttributes.vm.$emit('clear-concept-set')
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toStrictEqual([])
  })

  it('adds and removes First Specimen', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Specimen')
    await selectMenuItem(wrapper, 'First Specimen')

    expect(criteria.Specimen?.First).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Specimen')
  })

  it('adds, mutates, removes, and restores Specimen Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Date')
    await selectMenuItem(wrapper, 'Specimen Date')

    expect(criteria.Specimen?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.Specimen?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Date')
  })

  it('adds, mutates, removes, and restores Specimen Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Type')
    await selectMenuItem(wrapper, 'Specimen Type')

    expect(criteria.Specimen?.SpecimenType).toStrictEqual([])
    expect(criteria.Specimen?.SpecimenTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 100, CONCEPT_NAME: 'Blood specimen' }]
    binding.exclude.value = true
    await nextTick()

    expect(criteria.Specimen?.SpecimenType).toStrictEqual([{ CONCEPT_ID: 100, CONCEPT_NAME: 'Blood specimen' }])
    expect(criteria.Specimen?.SpecimenTypeExclude).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.SpecimenType).toBeUndefined()
    expect(criteria.Specimen?.SpecimenTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Type')
  })

  it('adds, selects, removes, and restores Specimen Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Type Concept Set')
    await selectMenuItem(wrapper, 'Specimen Type Concept Set')

    expect(criteria.Specimen?.SpecimenTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.SpecimenTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.SpecimenTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Type Concept Set')
  })

  it('adds, mutates, removes, and restores Quantity', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
    await selectMenuItem(wrapper, 'Quantity')

    expect(criteria.Specimen?.Quantity).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '8')
    await nextTick()

    expect(criteria.Specimen?.Quantity).toStrictEqual({ Value: 2, Op: 'bt', Extent: 8 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.Quantity).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
  })

  it('adds, mutates, removes, and restores Unit', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
    await selectMenuItem(wrapper, 'Unit')

    expect(criteria.Specimen?.Unit).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 9001, CONCEPT_NAME: 'Milliliter' }]
    await nextTick()

    expect(criteria.Specimen?.Unit).toStrictEqual([{ CONCEPT_ID: 9001, CONCEPT_NAME: 'Milliliter' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.Unit).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit')
  })

  it('adds, selects, removes, and restores Unit Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
    await selectMenuItem(wrapper, 'Unit Concept Set')

    expect(criteria.Specimen?.UnitCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.UnitCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.UnitCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unit Concept Set')
  })

  it('adds, mutates, removes, and restores Anatomic Site', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Anatomic Site')
    await selectMenuItem(wrapper, 'Anatomic Site')

    expect(criteria.Specimen?.AnatomicSite).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 1234, CONCEPT_NAME: 'Blood' }]
    await nextTick()

    expect(criteria.Specimen?.AnatomicSite).toStrictEqual([{ CONCEPT_ID: 1234, CONCEPT_NAME: 'Blood' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.AnatomicSite).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Anatomic Site')
  })

  it('adds, selects, removes, and restores Anatomic Site Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Anatomic Site Concept Set')
    await selectMenuItem(wrapper, 'Anatomic Site Concept Set')

    expect(criteria.Specimen?.AnatomicSiteCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.AnatomicSiteCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.AnatomicSiteCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Anatomic Site Concept Set')
  })

  it('adds, mutates, removes, and restores Disease Status', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Disease Status')
    await selectMenuItem(wrapper, 'Disease Status')

    expect(criteria.Specimen?.DiseaseStatus).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 222, CONCEPT_NAME: 'Positive' }]
    await nextTick()

    expect(criteria.Specimen?.DiseaseStatus).toStrictEqual([{ CONCEPT_ID: 222, CONCEPT_NAME: 'Positive' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.DiseaseStatus).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Disease Status')
  })

  it('adds, selects, removes, and restores Disease Status Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Disease Status Concept Set')
    await selectMenuItem(wrapper, 'Disease Status Concept Set')

    expect(criteria.Specimen?.DiseaseStatusCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.DiseaseStatusCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.DiseaseStatusCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Disease Status Concept Set')
  })

  it('adds, mutates, removes, and restores Source ID', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Source ID')
    await selectMenuItem(wrapper, 'Source ID')

    expect(criteria.Specimen?.SourceId).toStrictEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '!contains')
    await nextTick()
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'specimen-1')
    await nextTick()

    expect(criteria.Specimen?.SourceId).toStrictEqual({ Text: 'specimen-1', Op: '!contains' })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.SourceId).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Source ID')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.Specimen?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '4')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-1')
    await nextTick()

    expect(criteria.Specimen?.DateAdjustment?.StartOffset).toBe(4)
    expect(criteria.Specimen?.DateAdjustment?.EndOffset).toBe(-1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, selects, removes, and restores Specimen Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Source Concept')
    await selectMenuItem(wrapper, 'Specimen Source Concept')

    expect(criteria.Specimen?.SpecimenSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.SpecimenSourceConcept).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.SpecimenSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Specimen Source Concept')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Specimen?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '30')
    await nextTick()

    expect(criteria.Specimen?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 30 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.Specimen?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.Specimen?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.Specimen?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Specimen?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.Specimen?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.Specimen?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.Specimen?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})