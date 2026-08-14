/**
 * Occurrence / cardinality behaviour, re-homed from the deleted
 * tests/component/cohort-builder/CardinalityEditor.spec.ts onto
 * cohort-editor/criteria/CorelatedCriteria.vue, which now owns the occurrence
 * type, count and distinct-count column.
 *
 * The old editor spoke in symbolic types (AT_LEAST/AT_MOST/EXACTLY); circe
 * serialises them as the integers 2/1/0, so the mapping between the two is the
 * thing worth guarding here.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CorelatedCriteria from '@/components/circe/criteria/CorelatedCriteria.vue'
import type { CorelatedCriteria as CorelatedCriteriaModel } from '@/models/circe-types'

const vuetify = createVuetify({ components, directives })

// v-menu teleports and lazily renders its content, so the occurrence menu is
// unreachable from a mounted wrapper. Render activator and content inline.
const EagerMenu = {
  name: 'AtlasMenu',
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div class="menu-stub"><slot name="activator" :props="{}" /><slot /></div>',
}

const RendererStub = {
  name: 'CriteriaRendererStub',
  emits: ['remove'],
  template: '<div class="renderer-stub" />',
}

function mountCriteria(criteria: CorelatedCriteriaModel) {
  return mount(CorelatedCriteria, {
    global: {
      plugins: [vuetify, createPinia()],
      // The domain editor and the window editor own their own number fields;
      // stub them so the only one left is the occurrence count.
      stubs: { AtlasMenu: EagerMenu, CriteriaRenderer: RendererStub, Window: true },
    },
    props: { criteria, conceptSets: [] },
  })
}

function occurrenceLabel(wrapper: ReturnType<typeof mountCriteria>) {
  return wrapper.find('.occurrence-label')
}

const CONDITION = { ConditionOccurrence: {} }

describe('CorelatedCriteria occurrence', () => {
  beforeEach(() => setActivePinia(createPinia()))

  // The default is shown but not written: stamping it on render meant a loaded
  // cohort gained an Occurrence on every correlated criterion that did not have
  // one. ensureOccurrence writes it when the user sets one instead.
  it('shows at least one for a criteria with no occurrence, without writing it', () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION }
    const wrapper = mountCriteria(criteria)

    expect(occurrenceLabel(wrapper).text()).toBe('At least 1')
    expect(criteria.Occurrence).toBeUndefined()
  })

  it.each([
    [0, 0, 'EXACTLY', 'Exactly 0'],
    [1, 3, 'AT_MOST', 'At most 3'],
    [2, 2, 'AT_LEAST', 'At least 2'],
  ] as const)('reads occurrence type %i as %s', (type, count, key, label) => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: type, Count: count } }
    const wrapper = mountCriteria(criteria)

    expect(occurrenceLabel(wrapper).attributes('data-type')).toBe(key)
    expect(occurrenceLabel(wrapper).text()).toBe(label)
  })

  it('treats an occurrence with no type as EXACTLY rather than inventing one', () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Count: 5 } }
    const wrapper = mountCriteria(criteria)

    expect(occurrenceLabel(wrapper).attributes('data-type')).toBe('EXACTLY')
    expect(occurrenceLabel(wrapper).text()).toBe('Exactly 5')
  })

  it.each([
    ['.occurrence-chip--exactly', 0],
    ['.occurrence-chip--at_most', 1],
    ['.occurrence-chip--at_least', 2],
  ] as const)('%s writes circe type %i into the model', async (selector, expected) => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 2, Count: 1 } }
    const wrapper = mountCriteria(criteria)

    await wrapper.find(selector).trigger('click')

    expect(criteria.Occurrence!.Type).toBe(expected)
  })

  it('preserves a zero count when the occurrence type changes', async () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 0, Count: 0 } }
    const wrapper = mountCriteria(criteria)

    expect((wrapper.find('input[type="number"]').element as HTMLInputElement).value).toBe('0')

    await wrapper.find('.occurrence-chip--at_most').trigger('click')

    expect(criteria.Occurrence!.Count).toBe(0)
  })

  it('writes the typed count into the model as a number', async () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 2, Count: 1 } }
    const wrapper = mountCriteria(criteria)

    await wrapper.find('input[type="number"]').setValue('3')

    expect(criteria.Occurrence!.Count).toBe(3)
  })

  it('falls back to zero rather than null when the count is emptied', async () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 2, Count: 4 } }
    const wrapper = mountCriteria(criteria)

    await wrapper.find('input[type="number"]').setValue('')

    expect(criteria.Occurrence!.Count).toBe(0)
    expect(occurrenceLabel(wrapper).text()).toBe('At least 0')
  })
})

describe('CorelatedCriteria distinct counting', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function distinctChip(wrapper: ReturnType<typeof mountCriteria>) {
    return wrapper.find('.corelated-criteria-editor__distinct-chip')
  }

  it('counts all events until distinct counting is turned on', () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 2, Count: 1 } }
    const wrapper = mountCriteria(criteria)

    expect(distinctChip(wrapper).text()).toBe('Using all events')
    expect(criteria.Occurrence!.CountColumn).toBeUndefined()
  })

  it('picks the standard concept as the default distinct column', async () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION, Occurrence: { Type: 2, Count: 1 } }
    const wrapper = mountCriteria(criteria)

    await distinctChip(wrapper).trigger('click')

    expect(criteria.Occurrence!.IsDistinct).toBe(true)
    expect(criteria.Occurrence!.CountColumn).toBe('DOMAIN_CONCEPT')
    expect(distinctChip(wrapper).text()).toBe('Using distinct events')
  })

  it('keeps a distinct column the cohort already chose', async () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: CONDITION,
      Occurrence: { Type: 2, Count: 1, CountColumn: 'VISIT_ID' },
    }
    const wrapper = mountCriteria(criteria)

    await distinctChip(wrapper).trigger('click')

    expect(criteria.Occurrence!.CountColumn).toBe('VISIT_ID')
    expect(occurrenceLabel(wrapper).text()).toBe('At least 1 of distinct Visit')
  })

  it('turns distinct counting back off without discarding the column', async () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: CONDITION,
      Occurrence: { Type: 2, Count: 1, IsDistinct: true, CountColumn: 'START_DATE' },
    }
    const wrapper = mountCriteria(criteria)

    expect(occurrenceLabel(wrapper).text()).toBe('At least 1 of distinct Start Date')

    await distinctChip(wrapper).trigger('click')

    expect(criteria.Occurrence!.IsDistinct).toBe(false)
    expect(criteria.Occurrence!.CountColumn).toBe('START_DATE')
  })
})

describe('CorelatedCriteria event flags', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function flagChips(wrapper: ReturnType<typeof mountCriteria>) {
    return wrapper.findAll('.corelated-criteria-editor__flags .v-chip')
  }

  it('reads both flags as off when the criteria omits them', () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION }
    const wrapper = mountCriteria(criteria)

    const [restrictVisit, ignoreObservation] = flagChips(wrapper)
    expect(restrictVisit!.text()).toBe('restrict to the same visit occurrence')
    expect(ignoreObservation!.text()).toBe('allow events from outside observation period')
    expect(criteria.RestrictVisit).toBeUndefined()
    expect(criteria.IgnoreObservationPeriod).toBeUndefined()
  })

  it('writes each flag into the model when toggled', async () => {
    const criteria: CorelatedCriteriaModel = { Criteria: CONDITION }
    const wrapper = mountCriteria(criteria)

    await flagChips(wrapper)[0]!.trigger('click')
    expect(criteria.RestrictVisit).toBe(true)
    expect(criteria.IgnoreObservationPeriod).toBeUndefined()

    await flagChips(wrapper)[1]!.trigger('click')
    expect(criteria.IgnoreObservationPeriod).toBe(true)

    await flagChips(wrapper)[0]!.trigger('click')
    expect(criteria.RestrictVisit).toBe(false)
  })

  it('emits remove upward when the domain editor asks to be removed', async () => {
    const wrapper = mountCriteria({ Criteria: CONDITION })

    wrapper.findComponent(RendererStub).vm.$emit('remove')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
