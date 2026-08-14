/**
 * Opening a cohort must not change it.
 *
 * The editors used to create their sparse-model containers from computed
 * getters that the template read, so merely rendering a loaded cohort stamped
 * `DemographicCriteriaList: []`, `Groups: []` and a default
 * `Occurrence: {Type: 2, Count: 1, IsDistinct: false}` onto every group and
 * criterion in it. The document came back from being looked at with changes in
 * it, which is what makes an untouched cohort report unsaved changes — and what
 * a save would then write to the server.
 *
 * The lazy creation still happens, but from the handlers that are about to put
 * something in the container rather than from the render path.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CorelatedCriteria from '@/components/circe/criteria/CorelatedCriteria.vue'
import type {
  CriteriaGroup as GroupModel,
  CorelatedCriteria as CorelatedModel,
} from '@/models/circe-types'

const vuetify = createVuetify({ components, directives })

// v-menu teleports its content and only renders it once opened, so the
// add-criteria entries are unreachable from a mounted wrapper without this.
const EagerMenu = {
  name: 'AtlasMenu',
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div class="menu-stub"><slot name="activator" :props="{}" /><slot /></div>',
}

function mountGroup(group: GroupModel, eagerMenu = false) {
  return mount(CriteriaGroup, {
    global: {
      plugins: [vuetify, createPinia()],
      stubs: {
        CriteriaRenderer: true,
        Window: true,
        ...(eagerMenu ? { AtlasMenu: EagerMenu } : {}),
      },
    },
    props: { group, conceptSets: [] },
  })
}

// A group shaped like one that came off the server: lists present where the
// user put something, absent where they did not.
const loadedGroup = (): GroupModel => ({
  Type: 'ALL',
  CriteriaList: [
    { Criteria: { ConditionOccurrence: { CodesetId: 1 } } },
    { Criteria: { DrugExposure: { CodesetId: 2 } }, Occurrence: { Type: 0, Count: 0 } },
  ],
})

describe('rendering a loaded cohort leaves it alone', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not add the containers the group did not have', () => {
    const group = loadedGroup()
    const before = JSON.stringify(group)

    mountGroup(group)

    expect(JSON.stringify(group)).toBe(before)
  })

  it('does not stamp a default Occurrence onto a criterion that has none', () => {
    const group = loadedGroup()

    mountGroup(group)

    expect(group.CriteriaList?.[0]?.Occurrence).toBeUndefined()
  })

  it('leaves an Occurrence the cohort did have exactly as it was', () => {
    const group = loadedGroup()

    mountGroup(group)

    expect(group.CriteriaList?.[1]?.Occurrence).toEqual({ Type: 0, Count: 0 })
  })

  it('leaves a group that is already fully populated untouched', () => {
    const group: GroupModel = {
      Type: 'AT_LEAST',
      Count: 2,
      CriteriaList: [],
      DemographicCriteriaList: [{ Age: { Value: 18, Op: 'gte' } }],
      Groups: [{ Type: 'ANY', CriteriaList: [] }],
    }
    const before = JSON.stringify(group)

    mountGroup(group)

    expect(JSON.stringify(group)).toBe(before)
  })

  it('still renders what the group does contain', () => {
    const wrapper = mountGroup(loadedGroup())

    expect(wrapper.findAllComponents(CorelatedCriteria)).toHaveLength(2)
  })
})

describe('the containers are still created when something goes into them', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // The counterpart to the above: not creating on read must not turn into not
  // creating at all, or adding a criterion to an empty group would fail.
  it('creates the criteria list when a criterion is added', async () => {
    const group: GroupModel = { Type: 'ALL' }
    const wrapper = mountGroup(group, true)

    const item = wrapper.findAll('.v-list-item').find(candidate => candidate.text() === 'Condition Occurrence')
    expect(item, 'no "Condition Occurrence" entry in the add-criteria menu').toBeDefined()
    await item!.trigger('click')

    expect(group.CriteriaList).toHaveLength(1)
  })

  it('creates the nested group list when a group is added', async () => {
    const group: GroupModel = { Type: 'ALL' }
    const wrapper = mountGroup(group)

    await wrapper.findAll('button').filter(b => b.text().includes('Group'))[0]!.trigger('click')

    expect(group.Groups).toHaveLength(1)
  })

  it('creates the Occurrence when the user sets one', async () => {
    const criteria: CorelatedModel = { Criteria: { ConditionOccurrence: {} } }
    const wrapper = mount(CorelatedCriteria, {
      global: {
        plugins: [vuetify, createPinia()],
        stubs: {
          CriteriaRenderer: true,
          Window: true,
          AtlasMenu: {
            name: 'AtlasMenu',
            props: { modelValue: { type: Boolean, default: false } },
            template: '<div><slot name="activator" :props="{}" /><slot /></div>',
          },
        },
      },
      props: { criteria, conceptSets: [] },
    })

    expect(criteria.Occurrence).toBeUndefined()

    await wrapper.find('.occurrence-chip--exactly').trigger('click')

    expect(criteria.Occurrence).toMatchObject({ Type: 0 })
  })
})
