/**
 * Group match-logic behaviour, re-homed from the deleted
 * tests/component/cohort-builder/GroupCriteriaUI.spec.ts and
 * tests/unit/components/cohort-builder/GroupCriteriaUI.spec.ts onto
 * cohort-editor/criteria/CriteriaGroup.vue, which now owns Type/Count.
 *
 * Thread T18 (group Type defaulted for display only, "At least" reaching the
 * server with no Count) is covered by the three cases that assert the editor
 * keeps the model sparse while normalizeForCirce supplies what circe-be needs.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CorelatedCriteria from '@/components/circe/criteria/CorelatedCriteria.vue'
import type { CriteriaGroup as CriteriaGroupModel } from '@/models/circe-types'
import { normalizeForCirce } from '@/components/cohort-editor/normalize'
import { InlineAtlasMenuStub } from '../../helpers/component-wrapper'

const vuetify = createVuetify({ components, directives })

function mountGroup(group: CriteriaGroupModel, depth?: number) {
  return mount(CriteriaGroup, {
    global: {
      plugins: [vuetify, createPinia()],
      stubs: { AtlasMenu: InlineAtlasMenuStub, CriteriaRenderer: true, Window: true },
    },
    props: { group, conceptSets: [], ...(depth === undefined ? {} : { depth }) },
  })
}

function matchLabel(wrapper: ReturnType<typeof mountGroup>) {
  return wrapper.find('.match-type-label')
}

describe('CriteriaGroup match type', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['ALL', undefined, 'All'],
    ['ANY', undefined, 'Any'],
    ['AT_LEAST', 2, 'At least 2'],
    ['AT_MOST', 3, 'At most 3'],
  ] as const)('renders a %s group as "%s"', (type, count, expected) => {
    const group: CriteriaGroupModel = { Type: type, CriteriaList: [] }
    if (count !== undefined) group.Count = count

    const wrapper = mountGroup(group)

    expect(matchLabel(wrapper).text()).toBe(expected)
    expect(matchLabel(wrapper).attributes('data-type')).toBe(type)
  })

  it('marks the count as unknown when an AT_LEAST group has none', () => {
    const wrapper = mountGroup({ Type: 'AT_LEAST', CriteriaList: [] })

    expect(matchLabel(wrapper).text()).toBe('At least ?')
  })

  it('falls back to ALL for display when the group has no Type', () => {
    const wrapper = mountGroup({ CriteriaList: [] })

    expect(matchLabel(wrapper).text()).toBe('All')
    expect(matchLabel(wrapper).attributes('data-type')).toBe('ALL')
  })

  it.each([
    ['.match-chip--all', 'ALL'],
    ['.match-chip--any', 'ANY'],
    ['.match-chip--at_least', 'AT_LEAST'],
    ['.match-chip--at_most', 'AT_MOST'],
  ] as const)('writes %s into the group model', async (selector, expected) => {
    const group: CriteriaGroupModel = { Type: 'ALL', Count: 1, CriteriaList: [] }
    const wrapper = mountGroup(group)

    await wrapper.find(selector).trigger('click')

    expect(group.Type).toBe(expected)
  })

  it('writes the typed count into the group model', async () => {
    const group: CriteriaGroupModel = { Type: 'AT_LEAST', Count: 1, CriteriaList: [] }
    const wrapper = mountGroup(group)

    await wrapper.find('input[type="number"]').setValue('3')

    expect(group.Count).toBe(3)
  })

  it('offers a count field only for the counted match types', () => {
    expect(mountGroup({ Type: 'ALL', CriteriaList: [] }).find('input[type="number"]').exists()).toBe(false)
    expect(mountGroup({ Type: 'ANY', CriteriaList: [] }).find('input[type="number"]').exists()).toBe(false)
    expect(mountGroup({ Type: 'AT_LEAST', CriteriaList: [] }).find('input[type="number"]').exists()).toBe(true)
    expect(mountGroup({ Type: 'AT_MOST', CriteriaList: [] }).find('input[type="number"]').exists()).toBe(true)
  })

  // T18 was that a group the user saw as "All" serialised with no Type at all,
  // and an "At least" group could reach generation with no Count. The editor
  // deliberately still leaves both unset — keeping the document sparse is what
  // stops merely opening a cohort from dirtying it — so the fix lives at the
  // save boundary. These three cases pin both halves of that contract together,
  // since the component half is only safe because the boundary half exists.
  it('leaves a displayed-only ALL out of the model, and fills it on the way out', () => {
    const group: CriteriaGroupModel = { CriteriaList: [] }
    const wrapper = mountGroup(group)

    expect(matchLabel(wrapper).text()).toBe('All')
    expect(group.Type).toBeUndefined()

    const saved = normalizeForCirce({ InclusionRules: [{ name: 'r', expression: group }] })
    expect(saved.InclusionRules?.[0]?.expression?.Type).toBe('ALL')
  })

  it('does not invent a count when At least is chosen, and fills it on the way out', async () => {
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [] }
    const wrapper = mountGroup(group)

    await wrapper.find('.match-chip--at_least').trigger('click')

    expect(group.Type).toBe('AT_LEAST')
    expect(group.Count).toBeUndefined()

    const saved = normalizeForCirce({ InclusionRules: [{ name: 'r', expression: group }] })
    expect(saved.InclusionRules?.[0]?.expression?.Count).toBe(0)
  })

  it('clearing the count removes it rather than writing a zero', async () => {
    const group: CriteriaGroupModel = { Type: 'AT_LEAST', Count: 2, CriteriaList: [] }
    const wrapper = mountGroup(group)

    await wrapper.find('input[type="number"]').setValue('')

    expect(group.Count).toBeUndefined()
    expect(matchLabel(wrapper).text()).toBe('At least ?')
  })

  // A fractional or negative occurrence count is meaningless to
  // `HAVING COUNT(index_id) >= ?`, so the previous value stands rather than
  // being replaced by something generation cannot use. (Non-numeric text never
  // reaches the setter: a number input hands over an empty string instead,
  // which is the clearing case above.)
  it.each(['1.5', '-2'])('ignores %s rather than writing a nonsense count', async value => {
    const group: CriteriaGroupModel = { Type: 'AT_LEAST', Count: 2, CriteriaList: [] }
    const wrapper = mountGroup(group)

    await wrapper.find('input[type="number"]').setValue(value)

    expect(group.Count).toBe(2)
  })
})

describe('CriteriaGroup membership', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function clickAddCriteria(wrapper: ReturnType<typeof mountGroup>, title: string) {
    const item = wrapper.findAll('.v-list-item').find(candidate => candidate.text() === title)
    expect(item, `no "${title}" entry in the add-criteria menu`).toBeDefined()
    return item!.trigger('click')
  }

  it('shows the empty-group message until something is added', () => {
    const wrapper = mountGroup({ Type: 'ALL', CriteriaList: [], Groups: [], DemographicCriteriaList: [] })

    expect(wrapper.text()).toContain('No correlated criteria in this group yet.')
  })

  // The group's lists used to be created by the computeds the template read, so
  // rendering an empty group wrote three empty arrays into it — and rendering a
  // loaded cohort did the same to every group in it, which is what made an
  // untouched cohort report unsaved changes. They are created from the add
  // handlers now; see render-does-not-mutate.spec.ts.
  it('leaves an empty group empty rather than writing arrays into it on render', () => {
    const group: CriteriaGroupModel = { Type: 'ALL' }
    mountGroup(group)

    expect(group).toEqual({ Type: 'ALL' })
  })

  it('adds a correlated criteria of the chosen domain with a usable default', async () => {
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [] }
    const wrapper = mountGroup(group)

    await clickAddCriteria(wrapper, 'Drug Exposure')

    expect(group.CriteriaList).toHaveLength(1)
    const added = group.CriteriaList![0]!
    expect(Object.keys(added.Criteria ?? {})).toEqual(['DrugExposure'])
    expect(added.Occurrence).toEqual({ Type: 2, Count: 1 })
    expect(added.StartWindow).toEqual({
      Start: { Days: null, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
    expect(added.RestrictVisit).toBe(false)
    expect(added.IgnoreObservationPeriod).toBe(false)
  })

  it('adds demographic criteria to their own list, not to the criteria list', async () => {
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [] }
    const wrapper = mountGroup(group)

    await clickAddCriteria(wrapper, 'Demographic Criteria')

    expect(group.DemographicCriteriaList).toHaveLength(1)
    expect(group.CriteriaList).toHaveLength(0)
  })

  it('adds a nested group carrying an explicit ALL type', async () => {
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [] }
    const wrapper = mountGroup(group)

    const addGroup = wrapper.findAll('button').find(button => button.text() === 'Add Group')
    expect(addGroup).toBeDefined()
    await addGroup!.trigger('click')

    expect(group.Groups).toHaveLength(1)
    expect(group.Groups![0]!.Type).toBe('ALL')
    expect(group.Groups![0]!.CriteriaList).toEqual([])
    expect(group.Groups![0]!.Groups).toEqual([])
  })

  it('removes the criteria at the index the child reports, keeping the rest', async () => {
    const first = { Criteria: { ConditionOccurrence: {} } }
    const second = { Criteria: { DrugExposure: {} } }
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [first, second] }
    const wrapper = mountGroup(group)

    const children = wrapper.findAllComponents(CorelatedCriteria)
    expect(children).toHaveLength(2)
    children[0]!.vm.$emit('remove')
    await wrapper.vm.$nextTick()

    expect(group.CriteriaList).toHaveLength(1)
    expect(Object.keys(group.CriteriaList![0]!.Criteria ?? {})).toEqual(['DrugExposure'])
  })

  it('emits remove when the group delete button is pressed', async () => {
    const wrapper = mountGroup({ Type: 'ALL', CriteriaList: [] })

    const headerButtons = wrapper.findAll('.group-header button')
    await headerButtons[headerButtons.length - 1]!.trigger('click')

    expect(wrapper.emitted('remove')).toBeTruthy()
  })
})

describe('CriteriaGroup nesting', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders nested groups recursively, one level deeper each time', () => {
    const group: CriteriaGroupModel = {
      Type: 'ALL',
      CriteriaList: [],
      Groups: [{ Type: 'ANY', CriteriaList: [], Groups: [{ Type: 'AT_LEAST', Count: 1, CriteriaList: [] }] }],
    }
    const wrapper = mountGroup(group)

    const nested = wrapper.findAllComponents(CriteriaGroup)
    expect(nested).toHaveLength(2)
    expect(nested[0]!.props('depth')).toBe(1)
    expect(nested[1]!.props('depth')).toBe(2)
    expect(wrapper.findAll('.match-type-label').map(label => label.attributes('data-type')))
      .toEqual(['ALL', 'ANY', 'AT_LEAST'])
  })

  it('removes the nested group at the index the child reports', async () => {
    const group: CriteriaGroupModel = {
      Type: 'ALL',
      CriteriaList: [],
      Groups: [{ Type: 'ANY', CriteriaList: [] }, { Type: 'AT_MOST', Count: 1, CriteriaList: [] }],
    }
    const wrapper = mountGroup(group)

    wrapper.findAllComponents(CriteriaGroup)[0]!.vm.$emit('remove')
    await wrapper.vm.$nextTick()

    expect(group.Groups).toHaveLength(1)
    expect(group.Groups![0]!.Type).toBe('AT_MOST')
  })

  it('warns once nesting passes the supported depth', () => {
    const shallow = mountGroup({ Type: 'ALL', CriteriaList: [] }, 10)
    expect(shallow.text()).not.toContain('Deep nesting detected')

    const deep = mountGroup({ Type: 'ALL', CriteriaList: [] }, 11)
    expect(deep.text()).toContain('Deep nesting detected (11)')
  })

  it('relays concept-set selection from any depth up to its own parent', async () => {
    const group: CriteriaGroupModel = { Type: 'ALL', CriteriaList: [], Groups: [{ Type: 'ANY', CriteriaList: [] }] }
    const wrapper = mountGroup(group)

    wrapper.findAllComponents(CriteriaGroup)[0]!.vm.$emit('select-concept-set', undefined)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('select-concept-set')).toHaveLength(1)
  })
})
