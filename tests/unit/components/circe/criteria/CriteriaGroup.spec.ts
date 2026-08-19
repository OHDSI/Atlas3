import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'

import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

function mountGroup() {
  const group = {
    Type: 'AT_LEAST',
    Count: 2,
    CriteriaList: [
      {
        Criteria: { ConditionOccurrence: {} },
        Occurrence: { Type: 2, Count: 3, IsDistinct: false },
        RestrictVisit: false,
        IgnoreObservationPeriod: false,
      },
    ],
    DemographicCriteriaList: [{}],
    Groups: [
      {
        Type: 'ANY',
        CriteriaList: [],
        Groups: [],
      },
    ],
  }

  return mountComponent(CriteriaGroup as never, {
    props: {
      group,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })
}

function mountEmptyGroup(depth?: number) {
  const group = reactive({
    Type: 'ALL',
    CriteriaList: [],
    Groups: [],
    DemographicCriteriaList: [],
  })

  const wrapper = mountComponent(CriteriaGroup as never, {
    props: {
      group,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
      ...(depth !== undefined ? { depth } : {}),
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, group }
}

function mountSparseGroup(depth?: number) {
  const group = reactive({
    Type: 'ALL',
  }) as Record<string, unknown>

  const wrapper = mountComponent(CriteriaGroup as never, {
    props: {
      group,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
      ...(depth !== undefined ? { depth } : {}),
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })

  return { wrapper, group }
}

function getSetupState(wrapper: ReturnType<typeof mountGroup>['wrapper']) {
  return (wrapper.vm as unknown as { $: { setupState: Record<string, unknown> } }).$.setupState
}

async function selectAddMenuItem(wrapper: ReturnType<typeof mountGroup>['wrapper'], title: string) {
  const item = wrapper.findAllComponents({ name: 'AtlasListItem' }).find(component => component.text().includes(title))
  expect(item, `missing menu item ${title}`).toBeTruthy()
  await item!.trigger('click')
  await nextTick()
}

async function clickAddGroup(wrapper: ReturnType<typeof mountGroup>['wrapper']) {
  const addGroupButton = wrapper.findAllComponents({ name: 'AtlasButton' }).find(button => button.text().includes('Nested Group'))
  expect(addGroupButton).toBeTruthy()
  await addGroupButton!.trigger('click')
  await nextTick()
}

describe('CriteriaGroup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nested groups and forwards child concept-set and remove events', async () => {
    const wrapper = mountGroup()
    const setup = getSetupState(wrapper)

    expect(wrapper.find('.match-type-label').text()).toBe('at least 2')
    expect(wrapper.findAll('.match-type-label').map(node => node.text())).toEqual(expect.arrayContaining(['at least 2', 'any']))

    const matchTypeMenu = wrapper.findAllComponents({ name: 'AtlasMenu' })[0]
    await matchTypeMenu.vm.$emit('update:modelValue', true)
    await nextTick()
    expect(setup.showMatchTypeMenu).toBe(true)

    const corelatedCriteria = wrapper.findComponent({ name: 'CorelatedCriteria' })
    const selectionTarget = { targetRef: { value: 42 } }

    corelatedCriteria.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    corelatedCriteria.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    corelatedCriteria.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    const demographicCriteria = wrapper.findComponent({ name: 'DemographicCriteria' })
    demographicCriteria.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    demographicCriteria.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    demographicCriteria.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    const nestedGroup = wrapper.findAllComponents(CriteriaGroup as never).find(component => component.element !== wrapper.element)
    expect(nestedGroup).toBeTruthy()
    nestedGroup.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    nestedGroup.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    nestedGroup.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    await wrapper.get('.criteria-group-editor .v-btn--variant-text').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('updates the group match type and count through the inline menu stub', async () => {
    const wrapper = mountGroup()

    await wrapper.get('.match-type-label').trigger('click')
    await nextTick()

    await wrapper.get('.match-chip--any').trigger('click')
    await nextTick()
    expect(wrapper.find('.match-type-label').text()).toBe('any')

    await wrapper.get('.match-chip--at_least').trigger('click')
    await nextTick()
    const countField = wrapper.findComponent({ name: 'AtlasTextField' })
    await countField.vm.$emit('update:modelValue', '5')
    await nextTick()

    expect(wrapper.find('.match-type-label').text()).toBe('at least 5')

    await wrapper.get('.match-chip--at_most').trigger('click')
    await nextTick()
    expect(wrapper.find('.match-type-label').text()).toBe('at most 5')

    await wrapper.get('.match-chip--all').trigger('click')
    await nextTick()
    expect(wrapper.find('.match-type-label').text()).toBe('all')
  })

  it('adds and removes demographic, correlated, and nested groups', async () => {
    const { wrapper, group } = mountEmptyGroup()

    await selectAddMenuItem(wrapper, 'Demographic Criteria')
    expect(group.DemographicCriteriaList).toHaveLength(1)

    wrapper.findComponent({ name: 'DemographicCriteria' }).vm.$emit('remove')
    await nextTick()
    expect(group.DemographicCriteriaList).toHaveLength(0)

    await selectAddMenuItem(wrapper, 'Procedure Occurrence')
    expect(group.CriteriaList).toHaveLength(1)
    expect(group.CriteriaList[0].Criteria.ProcedureOccurrence).toBeDefined()

    wrapper.findComponent({ name: 'CorelatedCriteria' }).vm.$emit('remove')
    await nextTick()
    expect(group.CriteriaList).toHaveLength(0)

    await clickAddGroup(wrapper)
    expect(group.Groups).toHaveLength(1)

    await wrapper.findAll('.criteria-group-editor .v-btn--variant-text')[1].trigger('click')
    await nextTick()
    expect(group.Groups).toHaveLength(0)
  })

  it('covers the internal CriteriaGroup helpers through setup state', async () => {
    const { wrapper, group } = mountSparseGroup()
    const setup = getSetupState(wrapper)

    expect(setup.groupType).toBe('ALL')

    setup.groupType = 'ANY'
    await nextTick()
    expect(setup.groupType).toBe('ANY')

    setup.groupType = 'AT_LEAST'
    setup.groupCount = '3'
    await nextTick()
    expect(setup.groupType).toBe('AT_LEAST')
    expect(group.Count).toBe(3)

    setup.groupCount = 'abc'
    await nextTick()
    expect(group.Count).toBe(3)

    setup.groupCount = ''
    await nextTick()
    expect(group.Count).toBeUndefined()

    setup.ensureCriteriaList()
    setup.ensureNestedGroups()
    setup.ensureDemographicCriteriaList()

    setup.addDemographicCriteria()
    expect(group.DemographicCriteriaList).toHaveLength(1)
    expect(setup.createDefaultDemographicCriteria()).toEqual({})

    setup.addCriteria('ProcedureOccurrence')
    expect(group.CriteriaList).toHaveLength(1)
    expect(group.CriteriaList?.[0].Criteria.ProcedureOccurrence).toBeDefined()

    expect(setup.createDefaultCorelatedCriteria()).toMatchObject({
      Criteria: { ConditionOccurrence: {} },
      Occurrence: { Type: 2, Count: 1 },
      RestrictVisit: false,
      IgnoreObservationPeriod: false,
    })

    setup.addNestedGroup()
    expect(group.Groups).toHaveLength(1)

    setup.removeCriteria(0)
    setup.removeDemographicCriteria(0)
    setup.removeNestedGroup(0)

    expect(group.CriteriaList).toHaveLength(0)
    expect(group.DemographicCriteriaList).toHaveLength(0)
    expect(group.Groups).toHaveLength(0)
  })

  it('shows the deep nesting warning when the depth exceeds the threshold', () => {
    const { wrapper } = mountEmptyGroup(11)
    expect(wrapper.text()).toContain('Nesting depth is')
    expect(wrapper.text()).toContain('(11)')
  })
})
