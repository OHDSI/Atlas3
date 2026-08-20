import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import VisitDetail from '@/components/circe/criteria/VisitDetail.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type VisitDetailModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { VisitDetail?: VisitDetailModel }
  const wrapper = mountComponent(VisitDetail, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.visit-detail-editor__add-attribute-button').trigger('click')
  await nextTick()
}
async function mutateDateRange(wrapper: ReturnType<typeof mountEditor>['wrapper'], value: string) {
  const dateRange = wrapper.findComponent({ name: 'DateRange' })
  await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
  await nextTick()
  await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', value)
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

describe('VisitDetail', () => {
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

  it('adds and removes First Visit Detail', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Visit Detail')
    await selectMenuItem(wrapper, 'First Visit Detail')

    expect(criteria.VisitDetail?.First).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Visit Detail')
  })

  it('adds, mutates, removes, and restores Visit Detail Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Start Date')
    await selectMenuItem(wrapper, 'Visit Detail Start Date')

    expect(criteria.VisitDetail?.VisitDetailStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await mutateDateRange(wrapper, '2024-01-01')

    expect(criteria.VisitDetail?.VisitDetailStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.VisitDetailStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Start Date')
  })

  it('adds, mutates, removes, and restores Visit Detail End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail End Date')
    await selectMenuItem(wrapper, 'Visit Detail End Date')

    expect(criteria.VisitDetail?.VisitDetailEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await mutateDateRange(wrapper, '2024-12-31')

    expect(criteria.VisitDetail?.VisitDetailEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.VisitDetailEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail End Date')
  })

  it('adds, selects, removes, and restores Visit Detail Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Type Concept Set')
    await selectMenuItem(wrapper, 'Visit Detail Type Concept Set')

    expect(criteria.VisitDetail?.VisitDetailTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.VisitDetailTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.VisitDetailTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Type Concept Set')
  })

  it('adds, selects, removes, and restores Visit Detail Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Source Concept')
    await selectMenuItem(wrapper, 'Visit Detail Source Concept')

    expect(criteria.VisitDetail?.VisitDetailSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.VisitDetailSourceConcept).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.VisitDetailSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Source Concept')
  })

  it('adds, mutates, removes, and restores Visit Detail Length', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Length')
    await selectMenuItem(wrapper, 'Visit Detail Length')

    expect(criteria.VisitDetail?.VisitDetailLength).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '2', '6')

    expect(criteria.VisitDetail?.VisitDetailLength).toStrictEqual({ Value: 2, Op: 'bt', Extent: 6 })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.VisitDetailLength).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Visit Detail Length')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.VisitDetail?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.VisitDetail?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.VisitDetail?.DateAdjustment?.EndOffset).toBe(-2)

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.VisitDetail?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '18', '65')

    expect(criteria.VisitDetail?.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.VisitDetail?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, selects, removes, and restores Provider Specialty Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
    await selectMenuItem(wrapper, 'Provider Specialty Concept Set')

    expect(criteria.VisitDetail?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.ProviderSpecialtyCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.ProviderSpecialtyCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Provider Specialty Concept Set')
  })

  it('adds, selects, removes, and restores Place of Service Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Place of Service Concept Set')
    await selectMenuItem(wrapper, 'Place of Service Concept Set')

    expect(criteria.VisitDetail?.PlaceOfServiceCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.PlaceOfServiceCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.PlaceOfServiceCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Place of Service Concept Set')
  })

  it('adds, selects, removes, and restores Place of Service Location', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Place of Service Location')
    await selectMenuItem(wrapper, 'Place of Service Location')

    expect(criteria.VisitDetail?.PlaceOfServiceLocation).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.VisitDetail?.PlaceOfServiceLocation).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.VisitDetail?.PlaceOfServiceLocation).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Place of Service Location')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.VisitDetail?.CorrelatedCriteria).toStrictEqual({ Type: 'ALL' })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.VisitDetail?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})