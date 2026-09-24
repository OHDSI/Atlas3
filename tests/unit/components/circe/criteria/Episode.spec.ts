import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import { chooseConceptSet, expectMenuItemAbsent, expectMenuItemPresent, removeActiveAttribute, selectMenuItem } from './criteria-editor-test-helpers'

import Episode from '@/components/circe/criteria/Episode.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

type EpisodeModel = Record<string, any>

function mountEpisodeEditor() {
  const criteria = reactive({}) as { Episode?: EpisodeModel }
  const wrapper = mountComponent(Episode, {
    props: {
      criteria,
      conceptSets: [{ id: 42, name: 'Episode concept set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, criteria }
}

async function openMenu(wrapper: ReturnType<typeof mountEpisodeEditor>['wrapper']) {
  await wrapper.get('.episode-editor__add-attribute-button').trigger('click')
  await nextTick()
}

describe('Episode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards concept-set events from the header and nested criteria renderer', async () => {
    const { wrapper } = mountEpisodeEditor()

    const headerConceptSet = wrapper.getComponent({ name: 'EventConceptSet' })
    const headerSelectionTarget = { targetRef: { value: 41 } }

    headerConceptSet.vm.$emit('select', headerSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([headerSelectionTarget])

    headerConceptSet.vm.$emit('edit', headerSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([headerSelectionTarget])

    headerConceptSet.vm.$emit('clear')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    const criteriaAttributes = wrapper.getComponent({ name: 'CriteriaAttributes' })
    const nestedSelectionTarget = { targetRef: { value: 42 } }

    criteriaAttributes.vm.$emit('select-concept-set', nestedSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([nestedSelectionTarget])

    criteriaAttributes.vm.$emit('edit-concept-set', nestedSelectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([nestedSelectionTarget])

    criteriaAttributes.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    await wrapper.get('.episode-editor__header button.v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('adds, mutates, removes, and restores the required Episode fields', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'First Episode')
    await selectMenuItem(wrapper, 'First Episode')

    expect(criteria.Episode?.First).toBe(true)

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Number')
    await selectMenuItem(wrapper, 'Episode Number')

    expect(criteria.Episode?.EpisodeNumber).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    const numericRange = wrapper.findComponent({ name: 'NumericRange' })
    await numericRange.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '2')
    await nextTick()
    await numericRange.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '4')
    await nextTick()

    expect(criteria.Episode?.EpisodeNumber).toStrictEqual({ Value: 2, Op: 'bt', Extent: 4 })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Episode Number')

    const episodeNumberRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('Episode Number'))
    expect(episodeNumberRow, 'Episode Number row was not rendered').toBeTruthy()
    await episodeNumberRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()
    expect(criteria.Episode?.EpisodeNumber).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Number')
  })

  it('adds, selects, removes, and restores Episode Object Concept Set', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Object Concept Set')
    await selectMenuItem(wrapper, 'Episode Object Concept Set')

    expect(criteria.Episode?.EpisodeObjectConceptCS).toStrictEqual({ CodesetId: undefined })

    const conceptSetSelection = wrapper.findAllComponents({ name: 'EventConceptSet' }).at(-1)
    expect(conceptSetSelection, 'Episode Object Concept Set row was not rendered').toBeTruthy()
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.Episode?.EpisodeObjectConceptCS).toStrictEqual({ CodesetId: 42 })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Episode concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Episode Object Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.Episode?.EpisodeObjectConceptCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Object Concept Set')
  })

  it('adds, selects, removes, and restores Episode Type Concept Set', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Type Concept Set')
    await selectMenuItem(wrapper, 'Episode Type Concept Set')

    expect(criteria.Episode?.EpisodeTypeCS).toStrictEqual({ CodesetId: undefined })

    const conceptSetSelection = wrapper.findAllComponents({ name: 'EventConceptSet' }).at(-1)
    expect(conceptSetSelection, 'Episode Type Concept Set row was not rendered').toBeTruthy()
    await chooseConceptSet(conceptSetSelection, wrapper, 42)
    await nextTick()
    expect(criteria.Episode?.EpisodeTypeCS).toStrictEqual({ CodesetId: 42 })

    const selectedConceptSet = conceptSetSelection.get('[data-testid="selected-concept-set"]')
    expect(selectedConceptSet.text()).toContain('Episode concept set')
    await selectedConceptSet.trigger('click')
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]?.targetRef.value).toBe(42)

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Episode Type Concept Set')

    await removeActiveAttribute(wrapper)
    expect(criteria.Episode?.EpisodeTypeCS).toBeUndefined()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Episode Type Concept Set')
  })

  it('adds and removes Episode Age', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Age')
    await selectMenuItem(wrapper, 'Age')

    expect(criteria.Episode?.Age).toStrictEqual({ Value: undefined, Op: 'gte', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Age')

    const activeRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('Age'))
    expect(activeRow, 'Age row was not rendered').toBeTruthy()
    await activeRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()

    expect(criteria.Episode?.Age).toBeUndefined()
  })

  it('adds and removes Episode Gender Concept Set', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Gender Concept Set')
    await selectMenuItem(wrapper, 'Gender Concept Set')

    expect(criteria.Episode?.GenderCS).toStrictEqual({ CodesetId: undefined, IsExclusion: false })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Gender Concept Set')

    const activeRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('Gender Concept Set'))
    expect(activeRow, 'Gender Concept Set row was not rendered').toBeTruthy()
    await activeRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()

    expect(criteria.Episode?.GenderCS).toBeUndefined()
  })

  it('adds and removes Episode Start Date', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Start Date')
    await selectMenuItem(wrapper, 'Start Date')

    expect(criteria.Episode?.EpisodeStartDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Start Date')

    const activeRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('Start Date'))
    expect(activeRow, 'Start Date row was not rendered').toBeTruthy()
    await activeRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()

    expect(criteria.Episode?.EpisodeStartDate).toBeUndefined()
  })

  it('adds and removes Episode End Date', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'End Date')
    await selectMenuItem(wrapper, 'End Date')

    expect(criteria.Episode?.EpisodeEndDate).toStrictEqual({ Value: '', Op: 'gte', Extent: undefined })

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'End Date')

    const activeRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('End Date'))
    expect(activeRow, 'End Date row was not rendered').toBeTruthy()
    await activeRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()

    expect(criteria.Episode?.EpisodeEndDate).toBeUndefined()
  })

  it('adds and removes Episode Date Adjustment', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Date Adjustment')
    await selectMenuItem(wrapper, 'Date Adjustment')

    expect(criteria.Episode?.DateAdjustment).toBeDefined()

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Date Adjustment')

    const activeRow = wrapper
      .findAll('.attribute-container')
      .find(row => row.text().includes('Date Adjustment'))
    expect(activeRow, 'Date Adjustment row was not rendered').toBeTruthy()
    await activeRow!.get('.attribute-actions .v-btn').trigger('click')
    await nextTick()

    expect(criteria.Episode?.DateAdjustment).toBeUndefined()
  })

  it('adds and removes Episode nested criteria', async () => {
    const { wrapper, criteria } = mountEpisodeEditor()

    await openMenu(wrapper)
    await expectMenuItemPresent(wrapper, 'Nested Criteria')
    await selectMenuItem(wrapper, 'Nested Criteria')

    expect(criteria.Episode?.CorrelatedCriteria).toBeDefined()

    await openMenu(wrapper)
    await expectMenuItemAbsent(wrapper, 'Nested Criteria')

    const criteriaGroup = wrapper.getComponent({ name: 'CriteriaGroup' })
    await criteriaGroup.get('.group-header .v-btn--variant-text').trigger('click')
    await nextTick()

    expect(criteria.Episode?.CorrelatedCriteria).toBeUndefined()
  })
})