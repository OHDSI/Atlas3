import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import DrugEra from '@/components/circe/criteria/DrugEra.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type DrugEraModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { DrugEra?: DrugEraModel }
  const wrapper = mountComponent(DrugEra, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.drug-era-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('DrugEra', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds and removes First Drug Era', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Drug Era')
    await selectMenuItem(wrapper, 'First Drug Era')

    expect(criteria.DrugEra?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'First Drug Era')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.First).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Drug Era')
  })

  it('adds, mutates, removes, and restores Age at Start', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
    await selectMenuItem(wrapper, 'Age at Start')

    expect(criteria.DrugEra?.AgeAtStart).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '21')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '30')
    await nextTick()

    expect(criteria.DrugEra?.AgeAtStart).toStrictEqual({ Value: 21, Op: 'bt', Extent: 30 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at Start')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.AgeAtStart).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at Start')
  })

  it('adds, mutates, removes, and restores Age at End', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
    await selectMenuItem(wrapper, 'Age at End')

    expect(criteria.DrugEra?.AgeAtEnd).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '40')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '60')
    await nextTick()

    expect(criteria.DrugEra?.AgeAtEnd).toStrictEqual({ Value: 40, Op: 'bt', Extent: 60 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age at End')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.AgeAtEnd).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age at End')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.DrugEra?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.DrugEra?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.DrugEra?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.DrugEra?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Start Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
    await selectMenuItem(wrapper, 'Start Date')

    expect(criteria.DrugEra?.EraStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.DrugEra?.EraStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.EraStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
  })

  it('adds, mutates, removes, and restores End Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
    await selectMenuItem(wrapper, 'End Date')

    expect(criteria.DrugEra?.EraEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.DrugEra?.EraEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.EraEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
  })

  it('adds, mutates, removes, and restores Occurrence Count', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence Count')
    await selectMenuItem(wrapper, 'Occurrence Count')

    expect(criteria.DrugEra?.OccurrenceCount).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '5')
    await nextTick()

    expect(criteria.DrugEra?.OccurrenceCount).toStrictEqual({ Value: 2, Op: 'bt', Extent: 5 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Occurrence Count')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.OccurrenceCount).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence Count')
  })

  it('adds, mutates, removes, and restores Gap Days', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gap Days')
    await selectMenuItem(wrapper, 'Gap Days')

    expect(criteria.DrugEra?.GapDays).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '12')
    await nextTick()

    expect(criteria.DrugEra?.GapDays).toStrictEqual({ Value: 3, Op: 'bt', Extent: 12 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gap Days')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.GapDays).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gap Days')
  })

  it('adds, mutates, removes, and restores Era Length', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Era Length')
    await selectMenuItem(wrapper, 'Era Length')

    expect(criteria.DrugEra?.EraLength).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '180')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '365')
    await nextTick()

    expect(criteria.DrugEra?.EraLength).toStrictEqual({ Value: 180, Op: 'bt', Extent: 365 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Era Length')

    await removeActiveAttribute(wrapper)
    expect(criteria.DrugEra?.EraLength).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Era Length')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.DrugEra?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.DrugEra?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
