import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import DemographicCriteria from '@/components/circe/criteria/DemographicCriteria.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type DemographicCriteriaModel = Record<string, any>

function mountDemographicCriteria() {
  const criteria = reactive({}) as DemographicCriteriaModel

  const wrapper = mountComponent(DemographicCriteria, {
    props: {
      criteria,
      conceptSets: [{ id: 7, name: 'Gender concept set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountDemographicCriteria>['wrapper']) {
  await wrapper.get('.demographic-criteria__add-attribute-button').trigger('click')
  await nextTick()
}

describe('DemographicCriteria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the shared attribute renderer and remove action', async () => {
    const { wrapper } = mountDemographicCriteria()

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    const selectionTarget = { targetRef: { value: 7 } }

    criteriaAttributes.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    criteriaAttributes.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    await wrapper.get('.demographic-criteria__header button.v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('adds, mutates, removes, and restores Age', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()

    const textFields = numericRange.findAllComponents({ name: 'AtlasTextField' })
    await textFields[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '65')
    await nextTick()

    expect(criteria.Age).toStrictEqual({ Value: 18, Op: 'bt', Extent: 65 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age')

    await removeActiveAttribute(wrapper)
    expect(criteria.Age).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
  })

  it('adds, mutates, removes, and restores Gender', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
    await selectMenuItem(wrapper, 'Gender')

    expect(criteria.Gender).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }]
    await nextTick()

    expect(criteria.Gender).toStrictEqual([{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender')

    await removeActiveAttribute(wrapper)
    expect(criteria.Gender).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender')
  })

  it('adds, selects, removes, and restores Gender Concept Set', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.findComponent({ name: 'ConceptSetSelection' })
    await conceptSetSelection.get('[data-testid="concept-set-picker"]').trigger('click')
    await nextTick()

    const target = wrapper.emitted('select-concept-set')?.at(-1)?.[0]?.targetRef
    expect(target).toBeTruthy()
    target.value = 7
    await nextTick()

    expect(criteria.GenderCS).toStrictEqual({ CodesetId: 7, IsExclusion: false })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Gender concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(7)

    const excludeChip = conceptSetSelection.find('.concept-set-selection__exclude-chip')
    expect(excludeChip.text()).toBe('any of')
    await excludeChip.trigger('click')
    await nextTick()
    expect(criteria.GenderCS?.IsExclusion).toBe(true)
    expect(excludeChip.text()).toBe('not any of')

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.GenderCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
  })

  it('adds, mutates, removes, and restores Race', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Race')
    await selectMenuItem(wrapper, 'Race')

    expect(criteria.Race).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 8515, CONCEPT_NAME: 'ASIAN' }]
    await nextTick()

    expect(criteria.Race).toStrictEqual([{ CONCEPT_ID: 8515, CONCEPT_NAME: 'ASIAN' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Race')

    await removeActiveAttribute(wrapper)
    expect(criteria.Race).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Race')
  })

  it('adds, selects, removes, and restores Race Concept Set', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Race Concept Set')
    await selectMenuItem(wrapper, 'Race Concept Set')

    expect(criteria.RaceCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.findComponent({ name: 'ConceptSetSelection' })
    await conceptSetSelection.get('[data-testid="concept-set-picker"]').trigger('click')
    await nextTick()

    const target = wrapper.emitted('select-concept-set')?.at(-1)?.[0]?.targetRef
    expect(target).toBeTruthy()
    target.value = 7
    await nextTick()

    expect(criteria.RaceCS).toStrictEqual({ CodesetId: 7, IsExclusion: false })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Race Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.RaceCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Race Concept Set')
  })

  it('adds, mutates, removes, and restores Ethnicity', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Ethnicity')
    await selectMenuItem(wrapper, 'Ethnicity')

    expect(criteria.Ethnicity).toStrictEqual([])

    const conceptArray = wrapper.findComponent({ name: 'ConceptArray' })
    const binding = conceptArray.props('binding') as any
    binding.concepts.value = [{ CONCEPT_ID: 38003564, CONCEPT_NAME: 'Hispanic' }]
    await nextTick()

    expect(criteria.Ethnicity).toStrictEqual([{ CONCEPT_ID: 38003564, CONCEPT_NAME: 'Hispanic' }])

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Ethnicity')

    await removeActiveAttribute(wrapper)
    expect(criteria.Ethnicity).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Ethnicity')
  })

  it('adds, selects, removes, and restores Ethnicity Concept Set', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Ethnicity Concept Set')
    await selectMenuItem(wrapper, 'Ethnicity Concept Set')

    expect(criteria.EthnicityCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    const conceptSetSelection = wrapper.findComponent({ name: 'ConceptSetSelection' })
    await conceptSetSelection.get('[data-testid="concept-set-picker"]').trigger('click')
    await nextTick()

    const target = wrapper.emitted('select-concept-set')?.at(-1)?.[0]?.targetRef
    expect(target).toBeTruthy()
    target.value = 7
    await nextTick()

    expect(criteria.EthnicityCS).toStrictEqual({ CodesetId: 7, IsExclusion: false })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Ethnicity Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.EthnicityCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Ethnicity Concept Set')
  })

  it('adds, mutates, removes, and restores Occurrence Start Date', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence Start Date')
    await selectMenuItem(wrapper, 'Occurrence Start Date')

    expect(criteria.OccurrenceStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-01-01')
    await nextTick()

    expect(criteria.OccurrenceStartDate).toStrictEqual({ Value: '2024-01-01', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Occurrence Start Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.OccurrenceStartDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence Start Date')
  })

  it('adds, mutates, removes, and restores Occurrence End Date', async () => {
    const { wrapper, criteria } = mountDemographicCriteria()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence End Date')
    await selectMenuItem(wrapper, 'Occurrence End Date')

    expect(criteria.OccurrenceEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    const dateRange = wrapper.findComponent({ name: 'DateRange' })
    await dateRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await dateRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2024-12-31')
    await nextTick()

    expect(criteria.OccurrenceEndDate).toStrictEqual({ Value: '2024-12-31', Op: 'bt', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Occurrence End Date')

    await removeActiveAttribute(wrapper)
    expect(criteria.OccurrenceEndDate).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Occurrence End Date')
  })
})
