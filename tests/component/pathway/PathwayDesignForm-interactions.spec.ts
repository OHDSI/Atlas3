/**
 * PathwayDesignForm interaction tests
 *
 * Exercises every inline @click / @select / @rename / @remove / @update
 * handler so v8 reports the script-block functions as executed. The existing
 * render-only spec leaves these at 0% function coverage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import PathwayDesignForm from '@/components/pathway/PathwayDesignForm.vue'
import { usePathwayStore } from '@/stores/pathway'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasButton: {
    name: 'AtlasButton',
    props: ['disabled'],
    emits: ['click'],
    template:
      '<button class="stub-add" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  PathwayCohortList: {
    name: 'PathwayCohortList',
    props: ['cohorts', 'readonly'],
    emits: ['rename', 'remove'],
    template:
      '<div class="stub-list">' +
      '<button class="stub-rename" @click="$emit(\'rename\', (cohorts && cohorts[0] && cohorts[0].id) || 1, \'renamed\')" />' +
      '<button class="stub-remove" @click="$emit(\'remove\', (cohorts && cohorts[0] && cohorts[0].id) || 1)" />' +
      '</div>',
  },
  PathwayCohortPicker: {
    name: 'PathwayCohortPicker',
    props: ['modelValue', 'excludedIds'],
    emits: ['update:modelValue', 'select'],
    template:
      '<div class="stub-picker" :data-open="String(modelValue)">' +
      '<button class="stub-select" @click="$emit(\'select\', [{ id: 999, name: \'picked\' }])" />' +
      '</div>',
  },
  PathwaySettings: {
    name: 'PathwaySettings',
    props: ['modelValue', 'readonly'],
    emits: ['update:modelValue'],
    template:
      '<button class="stub-settings" @click="$emit(\'update:modelValue\', { ...modelValue, combinationWindow: 999 })" />',
  },
}

function setup() {
  setActivePinia(createPinia())
  const store = usePathwayStore()
  store.createNewPathway()
  const wrapper = mount(PathwayDesignForm, {
    global: { plugins: [vuetify], stubs },
  })
  return { store, wrapper }
}

describe('PathwayDesignForm interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens target picker when the Add target button is clicked', async () => {
    const { wrapper } = setup()
    const pickers = wrapper.findAll('.stub-picker')
    expect(pickers[0]!.attributes('data-open')).toBe('false')

    const addButtons = wrapper.findAll('.stub-add')
    await addButtons[0]!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.stub-picker')[0]!.attributes('data-open')).toBe('true')
  })

  it('opens event picker when the Add event button is clicked', async () => {
    const { wrapper } = setup()
    const addButtons = wrapper.findAll('.stub-add')
    await addButtons[1]!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.stub-picker')[1]!.attributes('data-open')).toBe('true')
  })

  it('adds a target cohort via the picker select handler', async () => {
    const { store, wrapper } = setup()
    const pickerSelectButtons = wrapper.findAll('.stub-select')
    await pickerSelectButtons[0]!.trigger('click')
    expect(store.currentPathway!.targetCohorts).toHaveLength(1)
    expect(store.currentPathway!.targetCohorts[0]!.id).toBe(999)
  })

  it('adds an event cohort via the picker select handler', async () => {
    const { store, wrapper } = setup()
    const pickerSelectButtons = wrapper.findAll('.stub-select')
    await pickerSelectButtons[1]!.trigger('click')
    expect(store.currentPathway!.eventCohorts).toHaveLength(1)
    expect(store.currentPathway!.eventCohorts[0]!.id).toBe(999)
  })

  it('renames a target cohort via list rename event', async () => {
    const { store, wrapper } = setup()
    store.addTargetCohort({ id: 42, name: 'orig' })
    await flushPromises()
    await wrapper.findAll('.stub-rename')[0]!.trigger('click')
    expect(store.currentPathway!.targetCohorts[0]!.name).toBe('renamed')
  })

  it('removes a target cohort via list remove event', async () => {
    const { store, wrapper } = setup()
    store.addTargetCohort({ id: 42, name: 'orig' })
    await flushPromises()
    await wrapper.findAll('.stub-remove')[0]!.trigger('click')
    expect(store.currentPathway!.targetCohorts).toHaveLength(0)
  })

  it('renames an event cohort via list rename event', async () => {
    const { store, wrapper } = setup()
    store.addEventCohort({ id: 55, name: 'orig' })
    await flushPromises()
    await wrapper.findAll('.stub-rename')[1]!.trigger('click')
    expect(store.currentPathway!.eventCohorts[0]!.name).toBe('renamed')
  })

  it('removes an event cohort via list remove event', async () => {
    const { store, wrapper } = setup()
    store.addEventCohort({ id: 55, name: 'orig' })
    await flushPromises()
    await wrapper.findAll('.stub-remove')[1]!.trigger('click')
    expect(store.currentPathway!.eventCohorts).toHaveLength(0)
  })

  it('propagates settings updates to the store', async () => {
    const { store, wrapper } = setup()
    await wrapper.find('.stub-settings').trigger('click')
    expect(store.currentPathway!.combinationWindow).toBe(999)
  })

  it('passes computed target/event cohort lists to PathwayCohortList', async () => {
    const { store, wrapper } = setup()
    store.addTargetCohort({ id: 1, name: 'A' })
    store.addEventCohort({ id: 2, name: 'B' })
    await flushPromises()
    const lists = wrapper.findAllComponents({ name: 'PathwayCohortList' })
    expect(lists[0]!.props('cohorts')).toEqual([{ id: 1, name: 'A' }])
    expect(lists[1]!.props('cohorts')).toEqual([{ id: 2, name: 'B' }])
  })

  it('passes excluded ids to PathwayCohortPicker based on current cohorts', async () => {
    const { store, wrapper } = setup()
    store.addTargetCohort({ id: 7, name: 'A' })
    store.addEventCohort({ id: 8, name: 'B' })
    await flushPromises()
    const pickers = wrapper.findAllComponents({ name: 'PathwayCohortPicker' })
    expect(pickers[0]!.props('excludedIds')).toEqual([7])
    expect(pickers[1]!.props('excludedIds')).toEqual([8])
  })
})
