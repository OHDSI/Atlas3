import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import PayerPlanPeriod from '@/components/circe/criteria/PayerPlanPeriod.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type PayerPlanPeriodModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { PayerPlanPeriod?: PayerPlanPeriodModel }
  const wrapper = mountComponent(PayerPlanPeriod, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.payer-plan-period-editor__add-attribute-button').trigger('click')
  await nextTick()
}

async function mutateNumericRange(
  wrapper: ReturnType<typeof mountEditor>['wrapper'],
  firstValue: string,
  secondValue: string,
) {
  const numericRange = wrapper.findComponent({ name: 'NumericRange' })
  await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
  await nextTick()
  await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', firstValue)
  await nextTick()
  await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', secondValue)
  await nextTick()
}

async function mutateDateRange(wrapper: ReturnType<typeof mountEditor>['wrapper'], value: string) {
  const dateRange = wrapper.findComponent({ name: 'DateRange' })
  await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
  await nextTick()
  await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', value)
  await nextTick()
}

async function mutatePeriod(
  wrapper: ReturnType<typeof mountEditor>['wrapper'],
  startDate: string,
  endDate: string,
) {
  const textFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
  expect(textFields).toHaveLength(2)
  await textFields[0].vm.$emit('update:modelValue', startDate)
  await nextTick()
  await textFields[1].vm.$emit('update:modelValue', endDate)
  await nextTick()
}

async function chooseConceptSetFromWrapper(wrapper: ReturnType<typeof mountEditor>['wrapper'], selectedId = 1) {
  const picker = wrapper.get('[data-testid="concept-set-picker"]')
  await picker.trigger('click')
  await nextTick()

  const target = wrapper.emitted('select-concept-set')?.slice(-1)[0]?.[0]?.targetRef
  expect(target, 'missing select-concept-set targetRef').toBeTruthy()
  target.value = selectedId
  await nextTick()

  return target
}

async function testConceptArrayAttribute(
  wrapper: ReturnType<typeof mountEditor>['wrapper'],
  criteria: ReturnType<typeof mountEditor>['criteria'],
  key: keyof NonNullable<ReturnType<typeof mountEditor>['criteria']['PayerPlanPeriod']>,
  label: string,
  conceptId: number,
  conceptName: string,
) {
  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
  await selectMenuItem(wrapper, label)

  expect(criteria.PayerPlanPeriod?.[key]).toStrictEqual([])

  const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
  ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: conceptId, CONCEPT_NAME: conceptName }]
  await nextTick()

  expect(criteria.PayerPlanPeriod?.[key]).toStrictEqual([{ CONCEPT_ID: conceptId, CONCEPT_NAME: conceptName }])

  await openMenu(wrapper)
  await expectMenuItemAbsent(wrapper, label)

  await removeActiveAttribute(wrapper)
  expect(criteria.PayerPlanPeriod?.[key]).toBeUndefined()

  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
}

async function testConceptSetSelectionAttribute(
  wrapper: ReturnType<typeof mountEditor>['wrapper'],
  criteria: ReturnType<typeof mountEditor>['criteria'],
  label: string,
) {
  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
  await selectMenuItem(wrapper, label)
  await nextTick()

  expect(criteria.PayerPlanPeriod?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

  await chooseConceptSetFromWrapper(wrapper)
  await nextTick()
  expect(criteria.PayerPlanPeriod?.GenderCS?.CodesetId).toBe(1)

  const selectedConceptSet = wrapper.get('[data-testid="selected-concept-set"]')
  expect(selectedConceptSet.text()).toContain('Concept Set')
  await selectedConceptSet.trigger('click')
  await nextTick()
  expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]?.[0]?.targetRef.value).toBe(1)

  await openMenu(wrapper)
  await expectMenuItemAbsent(wrapper, label)

  await removeActiveAttribute(wrapper)
  expect(criteria.PayerPlanPeriod?.GenderCS).toBeUndefined()

  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
}

async function testConceptSetIdAttribute(
  wrapper: ReturnType<typeof mountEditor>['wrapper'],
  criteria: ReturnType<typeof mountEditor>['criteria'],
  key: 'PayerConcept' | 'PlanConcept' | 'SponsorConcept' | 'StopReasonConcept' | 'PayerSourceConcept' | 'PlanSourceConcept' | 'SponsorSourceConcept' | 'StopReasonSourceConcept',
  label: string,
) {
  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
  await selectMenuItem(wrapper, label)
  await nextTick()

  expect(criteria.PayerPlanPeriod?.[key]).toBeUndefined()

  await chooseConceptSetFromWrapper(wrapper)
  await nextTick()
  expect(criteria.PayerPlanPeriod?.[key]).toBe(1)

  const selectedConceptSet = wrapper.get('[data-testid="selected-concept-set"]')
  expect(selectedConceptSet.text()).toContain('Concept Set')
  await selectedConceptSet.trigger('click')
  await nextTick()
  expect(wrapper.emitted('edit-concept-set')?.slice(-1)[0]?.[0]?.targetRef.value).toBe(1)

  await openMenu(wrapper)
  await expectMenuItemAbsent(wrapper, label)

  await removeActiveAttribute(wrapper)
  expect(criteria.PayerPlanPeriod?.[key]).toBeUndefined()

  await openMenu(wrapper)
  await expectMenuItemPresent(wrapper, label)
}

describe('PayerPlanPeriod', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds and removes First Payer Plan Period', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Payer Plan Period')
    await selectMenuItem(wrapper, 'First Payer Plan Period')

    expect(criteria.PayerPlanPeriod?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Payer Plan Period')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Payer Plan Period')
  })

  it('adds, mutates, removes, and restores Period Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Start Date')
    await selectMenuItem(wrapper, 'Period Start Date')

    expect(criteria.PayerPlanPeriod?.PeriodStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await mutateDateRange(wrapper, '2024-01-01')

    expect(criteria.PayerPlanPeriod?.PeriodStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.PeriodStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Start Date')
  })

  it('adds, mutates, removes, and restores Period End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period End Date')
    await selectMenuItem(wrapper, 'Period End Date')

    expect(criteria.PayerPlanPeriod?.PeriodEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await mutateDateRange(wrapper, '2024-12-31')

    expect(criteria.PayerPlanPeriod?.PeriodEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.PeriodEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period End Date')
  })

  it('adds, mutates, removes, and restores User Defined Period', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'User Defined Period')
    await selectMenuItem(wrapper, 'User Defined Period')

    expect(criteria.PayerPlanPeriod?.UserDefinedPeriod).toStrictEqual({ StartDate: '', EndDate: '' })

    await mutatePeriod(wrapper, '2024-02-01', '2024-02-28')

    expect(criteria.PayerPlanPeriod?.UserDefinedPeriod).toStrictEqual({ StartDate: '2024-02-01', EndDate: '2024-02-28' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'User Defined Period')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.UserDefinedPeriod).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'User Defined Period')
  })

  it('adds, mutates, removes, and restores Period Length', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Length')
    await selectMenuItem(wrapper, 'Period Length')

    expect(criteria.PayerPlanPeriod?.PeriodLength).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '7', '14')

    expect(criteria.PayerPlanPeriod?.PeriodLength).toStrictEqual({ Value: 7, Op: 'bt', Extent: 14 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Period Length')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.PeriodLength).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Period Length')
  })

  it('adds, mutates, removes, and restores Age at Start', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
    await selectMenuItem(wrapper, 'Age at Start')

    expect(criteria.PayerPlanPeriod?.AgeAtStart).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '18', '65')

    expect(criteria.PayerPlanPeriod?.AgeAtStart).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at Start')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.AgeAtStart).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
  })

  it('adds, mutates, removes, and restores Age at End', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
    await selectMenuItem(wrapper, 'Age at End')

    expect(criteria.PayerPlanPeriod?.AgeAtEnd).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '40', '60')

    expect(criteria.PayerPlanPeriod?.AgeAtEnd).toStrictEqual({ Value: 40, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at End')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.AgeAtEnd).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptArrayAttribute(wrapper, criteria, 'Gender', 'Gender', 8507, 'MALE')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetSelectionAttribute(wrapper, criteria, 'Gender Concept Set')
  })

  it('adds, selects, removes, and restores Payer Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'PayerConcept', 'Payer Concept')
  })

  it('adds, selects, removes, and restores Plan Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'PlanConcept', 'Plan Concept')
  })

  it('adds, selects, removes, and restores Sponsor Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'SponsorConcept', 'Sponsor Concept')
  })

  it('adds, selects, removes, and restores Stop Reason Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'StopReasonConcept', 'Stop Reason Concept')
  })

  it('adds, selects, removes, and restores Payer Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'PayerSourceConcept', 'Payer Source Concept')
  })

  it('adds, selects, removes, and restores Plan Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'PlanSourceConcept', 'Plan Source Concept')
  })

  it('adds, selects, removes, and restores Sponsor Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'SponsorSourceConcept', 'Sponsor Source Concept')
  })

  it('adds, selects, removes, and restores Stop Reason Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await testConceptSetIdAttribute(wrapper, criteria, 'StopReasonSourceConcept', 'Stop Reason Source Concept')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.PayerPlanPeriod?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.PayerPlanPeriod?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.PayerPlanPeriod?.DateAdjustment?.EndOffset).toBe(-2)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    await removeActiveAttribute(wrapper)
    expect(criteria.PayerPlanPeriod?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.PayerPlanPeriod?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.PayerPlanPeriod?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
