import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CorelatedCriteria from '@/components/circe/criteria/CorelatedCriteria.vue'
import ConditionOccurrence from '@/components/circe/criteria/ConditionOccurrence.vue'
import fixture from '../../cohort-editor/fixtures/editor-surface.json'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

function cloneFixture() {
  return JSON.parse(JSON.stringify(fixture)) as typeof fixture
}

function mountWithVuetify(component: unknown, props: Record<string, unknown>) {
  return mountComponent(component as never, {
    props,
    // Inline the menu so the correlated-criteria overlay stays queryable in
    // unit tests without recreating Vuetify's body-teleport behavior.
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })
}

describe('Criteria editor hierarchy', () => {
  it('renders nested criteria groups from JSON and forwards selection events unchanged', async () => {
    const data = cloneFixture()
    const wrapper = mountWithVuetify(CriteriaGroup, {
      group: data.criteriaGroup,
      conceptSets: data.conceptSets,
    })

    expect(wrapper.find('.match-type-label').text()).toBe('at least 2')

    const groupNodes = wrapper.findAll('.criteria-group-editor')
    expect(groupNodes).toHaveLength(2)

    const groupLabels = wrapper.findAll('.match-type-label').map(node => node.text())
    expect(groupLabels).toEqual(expect.arrayContaining(['at least 2', 'any']))

    const corelatedCriteria = wrapper.findComponent(CorelatedCriteria)
    expect(corelatedCriteria.props('criteria')).toStrictEqual(data.criteriaGroup.CriteriaList[0])

    const selectionTarget = { targetRef: { value: 42 } }
    corelatedCriteria.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()

    expect(wrapper.emitted('select-concept-set')?.[0]).toEqual([selectionTarget])

    corelatedCriteria.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.[0]).toEqual([selectionTarget])

    corelatedCriteria.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.[0]).toEqual([])

    await wrapper.get('.criteria-group-editor .v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.[0]).toEqual([])

  })

  it('renders correlated criteria through the renderer and forwards concept-set events', async () => {
    const data = cloneFixture()
    const criteria = data.criteriaGroup.CriteriaList[0]
    const wrapper = mountWithVuetify(CorelatedCriteria, {
      criteria,
      conceptSets: data.conceptSets,
    })

    expect(wrapper.find('.occurrence-label').text()).toBe('at most 3 of distinct Visit')
    expect(wrapper.text()).toContain('restrict to the same visit occurrence')
    expect(wrapper.text()).toContain('allow events from outside observation period')

    const conditionOccurrence = wrapper.findComponent(ConditionOccurrence)
    expect(conditionOccurrence.props('criteria')).toStrictEqual(criteria.Criteria)

    const selectionTarget = { targetRef: { value: 42 } }
    conditionOccurrence.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()

    expect(wrapper.emitted('select-concept-set')?.[0]).toEqual([selectionTarget])

    conditionOccurrence.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.[0]).toEqual([selectionTarget])

    conditionOccurrence.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.[0]).toEqual([])
  })

  it('updates correlated criteria occurrence through the inline menu stub', async () => {
    const criteria = {
      Criteria: {
        ConditionOccurrence: {},
      },
    }

    const wrapper = mountWithVuetify(CorelatedCriteria, {
      criteria,
      conceptSets: [],
    })

    const occurrenceCount = wrapper.findAllComponents({ name: 'AtlasTextField' })[0]
    await occurrenceCount.vm.$emit('update:modelValue', '3')
    await nextTick()
    expect(criteria.Occurrence).toStrictEqual({ Type: 2, Count: 3, IsDistinct: false })

  })
})