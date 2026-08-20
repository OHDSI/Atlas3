import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import ObservationPeriod from '@/components/circe/criteria/ObservationPeriod.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type ObservationPeriodModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { ObservationPeriod?: ObservationPeriodModel }
  const wrapper = mountComponent(ObservationPeriod, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.observation-period-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('ObservationPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds and removes First Observation Period', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Observation Period')
    await selectMenuItem(wrapper, 'First Observation Period')

    expect(criteria.ObservationPeriod?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Observation Period')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Observation Period')
  })

  it('adds, mutates, removes, and restores Period Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Start Date')
    await selectMenuItem(wrapper, 'Period Start Date')

    expect(criteria.ObservationPeriod?.PeriodStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.ObservationPeriod?.PeriodStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.PeriodStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Start Date')
  })

  it('adds, mutates, removes, and restores Period End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period End Date')
    await selectMenuItem(wrapper, 'Period End Date')

    expect(criteria.ObservationPeriod?.PeriodEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.ObservationPeriod?.PeriodEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.PeriodEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period End Date')
  })

  it('adds, mutates, removes, and restores User Defined Period', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'User Defined Period')
    await selectMenuItem(wrapper, 'User Defined Period')

    expect(criteria.ObservationPeriod?.UserDefinedPeriod).toStrictEqual({ StartDate: '', EndDate: '' })

    const textFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(textFields).toHaveLength(2)
    await textFields[0].vm.$emit('update:modelValue', '2024-02-01')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '2024-02-28')
    await nextTick()

    expect(criteria.ObservationPeriod?.UserDefinedPeriod).toStrictEqual({ StartDate: '2024-02-01', EndDate: '2024-02-28' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'User Defined Period')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.UserDefinedPeriod).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'User Defined Period')
  })

  it('adds, mutates, removes, and restores Period Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Type')
    await selectMenuItem(wrapper, 'Period Type')

    expect(criteria.ObservationPeriod?.PeriodType).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 300, CONCEPT_NAME: 'Observation Period Type' }]
    await nextTick()

    expect(criteria.ObservationPeriod?.PeriodType).toStrictEqual([{ CONCEPT_ID: 300, CONCEPT_NAME: 'Observation Period Type' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Type')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.PeriodType).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Type')
  })

  it('adds, selects, removes, and restores Period Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Type Concept Set')
    await selectMenuItem(wrapper, 'Period Type Concept Set')

    expect(criteria.ObservationPeriod?.PeriodTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.ObservationPeriod?.PeriodTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.PeriodTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Type Concept Set')
  })

  it('adds, mutates, removes, and restores Period Length', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Length')
    await selectMenuItem(wrapper, 'Period Length')

    expect(criteria.ObservationPeriod?.PeriodLength).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '7')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '14')
    await nextTick()

    expect(criteria.ObservationPeriod?.PeriodLength).toStrictEqual({ Value: 7, Op: 'bt', Extent: 14 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Length')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.PeriodLength).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Length')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.ObservationPeriod?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.ObservationPeriod?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.ObservationPeriod?.DateAdjustment?.EndOffset).toBe(-2)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Age at Start', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
    await selectMenuItem(wrapper, 'Age at Start')

    expect(criteria.ObservationPeriod?.AgeAtStart).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.ObservationPeriod?.AgeAtStart).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at Start')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.AgeAtStart).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
  })

  it('adds, mutates, removes, and restores Age at End', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
    await selectMenuItem(wrapper, 'Age at End')

    expect(criteria.ObservationPeriod?.AgeAtEnd).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '40')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '60')
    await nextTick()

    expect(criteria.ObservationPeriod?.AgeAtEnd).toStrictEqual({ Value: 40, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at End')

    await removeActiveAttribute(wrapper)
    expect(criteria.ObservationPeriod?.AgeAtEnd).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.ObservationPeriod?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.ObservationPeriod?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
