import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import Death from '@/components/circe/criteria/Death.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type DeathModel = Record<string, any>

function mountEditor() {
  const criteria = reactive({}) as { Death?: DeathModel }
  const wrapper = mountComponent(Death, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEditor>['wrapper']) {
  await wrapper.get('.death-editor__add-attribute-button').trigger('click')
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

describe('Death', () => {
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

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Death?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await mutateNumericRange(wrapper, '45', '60')

    expect(criteria.Death?.Age).toStrictEqual({ Value: 45, Op: 'bt', Extent: 60 })

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.Death?.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    ;(conceptArray.props('binding') as any).concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.Death?.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.Death?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Death?.GenderCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Death Date', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Date')
    await selectMenuItem(wrapper, 'Death Date')

    expect(criteria.Death?.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await mutateDateRange(wrapper, '2024-01-01')

    expect(criteria.Death?.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Date')
  })

  it('adds, mutates, removes, and restores Date Adjustment', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.Death?.DateAdjustment).toStrictEqual({ StartWith: 'START_DATE', StartOffset: 0, EndWith: 'END_DATE', EndOffset: 0 })

    const dateAdjustment = wrapper.findComponent({ name: 'DateAdjustment' })
    await dateAdjustment.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()
    const textFields = dateAdjustment.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-2')
    await nextTick()

    expect(criteria.Death?.DateAdjustment?.StartOffset).toBe(3)
    expect(criteria.Death?.DateAdjustment?.EndOffset).toBe(-2)

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.DateAdjustment).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
  })

  it('adds, mutates, removes, and restores Death Type', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Type')
    await selectMenuItem(wrapper, 'Death Type')

    expect(criteria.Death?.DeathType).toStrictEqual([])
    expect(criteria.Death?.DeathTypeExclude).toBe(false)

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 38003585, CONCEPT_NAME: 'Natural death' }]
    binding.exclude.value = true
    await nextTick()

    expect(criteria.Death?.DeathType).toStrictEqual([{ CONCEPT_ID: 38003585, CONCEPT_NAME: 'Natural death' }])
    expect(criteria.Death?.DeathTypeExclude).toBe(true)

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.DeathType).toBeUndefined()
    expect(criteria.Death?.DeathTypeExclude).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Type')
  })

  it('adds, selects, removes, and restores Death Type Concept Set', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Type Concept Set')
    await selectMenuItem(wrapper, 'Death Type Concept Set')

    expect(criteria.Death?.DeathTypeCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Death?.DeathTypeCS).toStrictEqual({ CodesetId: 1, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.DeathTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Type Concept Set')
  })

  it('adds, selects, removes, and restores Death Source Concept', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Source Concept')
    await selectMenuItem(wrapper, 'Death Source Concept')

    expect(criteria.Death?.DeathSourceConcept).toBeUndefined()

    const conceptSetSelection = wrapper.getComponent({ name: 'ConceptSetSelection' })
    await chooseConceptSet(conceptSetSelection, wrapper)
    await nextTick()
    expect(criteria.Death?.DeathSourceConcept).toBe(1)

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Concept Set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(1)

    await removeActiveAttribute(wrapper)
    expect(criteria.Death?.DeathSourceConcept).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Death Source Concept')
  })

  it('adds and removes Nested Criteria as a CriteriaGroup field', async () => {
    const { wrapper, criteria } = mountEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.Death?.CorrelatedCriteria).toStrictEqual({})

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    wrapper.findComponent({ name: 'CriteriaGroup' }).vm.$emit('remove')
    await nextTick()
    expect(criteria.Death?.CorrelatedCriteria).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
  })
})
