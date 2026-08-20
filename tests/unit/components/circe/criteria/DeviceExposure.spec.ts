import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import DeviceExposure from '@/components/circe/criteria/DeviceExposure.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type DeviceExposureModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { DeviceExposure?: DeviceExposureModel }
  const wrapper = mountComponent(DeviceExposure, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.device-exposure-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('DeviceExposure', () => {
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

  it('adds and removes First Exposure', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Exposure')
    await selectMenuItem(wrapper, 'First Exposure')

    expect(criteria.DeviceExposure?.First).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Exposure')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.DeviceExposure?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.DeviceExposure?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.DeviceExposure?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.DeviceExposure?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.DeviceExposure?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DeviceExposure?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
    await selectMenuItem(wrapper, 'Start Date')

    expect(criteria.DeviceExposure?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.DeviceExposure?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
  })

  it('adds, mutates, removes, and restores End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
    await selectMenuItem(wrapper, 'End Date')

    expect(criteria.DeviceExposure?.OccurrenceEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.DeviceExposure?.OccurrenceEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.OccurrenceEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.DeviceExposure?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.DeviceExposure?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.DeviceExposure?.DateAdjustment?.EndOffset).toBe(-2)

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Device Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Type')
    await selectMenuItem(wrapper, 'Device Type')

    expect(criteria.DeviceExposure?.DeviceType).toStrictEqual([])
    expect(criteria.DeviceExposure?.DeviceTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 112, CONCEPT_NAME: 'Wheelchair' }]
    binding.exclude.value = true
    await nextTick()

    expect(criteria.DeviceExposure?.DeviceType).toStrictEqual([{ CONCEPT_ID: 112, CONCEPT_NAME: 'Wheelchair' }])
    expect(criteria.DeviceExposure?.DeviceTypeExclude).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.DeviceType).toBeUndefined()
    expect(criteria.DeviceExposure?.DeviceTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Type')
  })

  it('adds, selects, removes, and restores Device Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Type Concept Set')
    await selectMenuItem(wrapper, 'Device Type Concept Set')

    expect(criteria.DeviceExposure?.DeviceTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DeviceExposure?.DeviceTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.DeviceTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Type Concept Set')
  })

  it('adds, mutates, removes, and restores Visit', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit')
    await selectMenuItem(wrapper, 'Visit')

    expect(criteria.DeviceExposure?.VisitType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 9201, CONCEPT_NAME: 'Inpatient visit' }]
    await nextTick()

    expect(criteria.DeviceExposure?.VisitType).toStrictEqual([{ CONCEPT_ID: 9201, CONCEPT_NAME: 'Inpatient visit' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.VisitType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit')
  })

  it('adds, selects, removes, and restores Visit Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Type Concept Set')

    expect(criteria.DeviceExposure?.VisitTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DeviceExposure?.VisitTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.VisitTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Type Concept Set')
  })

  it('adds, mutates, removes, and restores Unique Device ID', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unique Device ID')
    await selectMenuItem(wrapper, 'Unique Device ID')

    expect(criteria.DeviceExposure?.UniqueDeviceId).toStrictEqual({ Text: '', Op: 'contains' })

    const textFilter = wrapper.findComponent({ name: 'TextFilter' })
    await textFilter.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', '!contains')
    await nextTick()
    await textFilter.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', 'device-123')
    await nextTick()

    expect(criteria.DeviceExposure?.UniqueDeviceId).toStrictEqual({ Text: 'device-123', Op: '!contains' })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.UniqueDeviceId).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Unique Device ID')
  })

  it('adds, mutates, removes, and restores Quantity', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
    await selectMenuItem(wrapper, 'Quantity')

    expect(criteria.DeviceExposure?.Quantity).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '8')
    await nextTick()

    expect(criteria.DeviceExposure?.Quantity).toStrictEqual({ Value: 2, Op: 'bt', Extent: 8 })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.Quantity).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Quantity')
  })

  it('adds, selects, removes, and restores Device Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Source Concept')
    await selectMenuItem(wrapper, 'Device Source Concept')

    expect(criteria.DeviceExposure?.DeviceSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DeviceExposure?.DeviceSourceConcept).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.DeviceSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Device Source Concept')
  })

  it('adds, mutates, removes, and restores Provider Specialty', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
    await selectMenuItem(wrapper, 'Provider Specialty')

    expect(criteria.DeviceExposure?.ProviderSpecialty).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }]
    await nextTick()

    expect(criteria.DeviceExposure?.ProviderSpecialty).toStrictEqual([{ CONCEPT_ID: 300, CONCEPT_NAME: 'Cardiology' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.ProviderSpecialty).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.DeviceExposure?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DeviceExposure?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.DeviceExposure?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.DeviceExposure?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.DeviceExposure?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})