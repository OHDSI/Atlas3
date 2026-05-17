/**
 * IncidenceRateDesignRail interaction tests
 *
 * Triggers each inline button / list / picker handler so v8 reports the
 * script-block arrow functions as executed. Existing spec mounts the rail
 * statically and leaves function coverage at 0%.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import IncidenceRateDesignRail from '@/components/incidence-rate/IncidenceRateDesignRail.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

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
  IncidenceRateCohortList: {
    name: 'IncidenceRateCohortList',
    props: ['cohorts'],
    emits: ['remove'],
    template:
      '<div class="stub-cohort-list">' +
      '<button class="stub-remove" @click="$emit(\'remove\', (cohorts && cohorts[0] && cohorts[0].id) || 1)" />' +
      '</div>',
  },
  IncidenceRateCohortPicker: {
    name: 'IncidenceRateCohortPicker',
    props: ['modelValue'],
    emits: ['update:modelValue', 'select'],
    template:
      '<div class="stub-picker" :data-open="String(modelValue)">' +
      '<button class="stub-select" @click="$emit(\'select\', { id: 999, name: \'picked\' })" />' +
      '</div>',
  },
  IncidenceRateTimeAtRiskEditor: true,
  IncidenceRateStudyWindowEditor: true,
  IncidenceRateStratifyRulesList: {
    name: 'IncidenceRateStratifyRulesList',
    props: ['rules', 'readonly'],
    emits: ['add', 'edit', 'remove', 'move'],
    template:
      '<div class="stub-strata">' +
      '<button class="stub-strata-add" @click="$emit(\'add\')" />' +
      '<button class="stub-strata-edit" @click="$emit(\'edit\', 2)" />' +
      '<button class="stub-strata-remove" @click="$emit(\'remove\', 0)" />' +
      '<button class="stub-strata-move" @click="$emit(\'move\', 0, 1)" />' +
      '</div>',
  },
}

function setup() {
  setActivePinia(createPinia())
  const store = useIncidenceRateStore()
  store.createNewIR()
  const wrapper = mount(IncidenceRateDesignRail, {
    global: { plugins: [vuetify], stubs },
  })
  return { store, wrapper }
}

describe('IncidenceRateDesignRail interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the target picker when Add (targets) is clicked', async () => {
    const { wrapper } = setup()
    const addButtons = wrapper.findAll('.stub-add')
    expect(wrapper.findAll('.stub-picker')[0]!.attributes('data-open')).toBe('false')
    await addButtons[0]!.trigger('click')
    expect(wrapper.findAll('.stub-picker')[0]!.attributes('data-open')).toBe('true')
  })

  it('opens the outcome picker when Add (outcomes) is clicked', async () => {
    const { wrapper } = setup()
    const addButtons = wrapper.findAll('.stub-add')
    await addButtons[1]!.trigger('click')
    expect(wrapper.findAll('.stub-picker')[1]!.attributes('data-open')).toBe('true')
  })

  it('adds a target cohort id when the target picker selects', async () => {
    const { store, wrapper } = setup()
    await wrapper.findAll('.stub-select')[0]!.trigger('click')
    expect(store.currentIR!.expression.targetIds).toContain(999)
  })

  it('adds an outcome cohort id when the outcome picker selects', async () => {
    const { store, wrapper } = setup()
    await wrapper.findAll('.stub-select')[1]!.trigger('click')
    expect(store.currentIR!.expression.outcomeIds).toContain(999)
  })

  it('removes a target cohort id when the target list emits remove', async () => {
    const { store, wrapper } = setup()
    store.addTargetCohortId(42, 'tgt')
    await flushPromises()
    await wrapper.findAll('.stub-remove')[0]!.trigger('click')
    expect(store.currentIR!.expression.targetIds).not.toContain(42)
  })

  it('removes an outcome cohort id when the outcome list emits remove', async () => {
    const { store, wrapper } = setup()
    store.addOutcomeCohortId(7, 'oc')
    await flushPromises()
    await wrapper.findAll('.stub-remove')[1]!.trigger('click')
    expect(store.currentIR!.expression.outcomeIds).not.toContain(7)
  })

  it('emits strata:add when the strata list signals add', async () => {
    const { wrapper } = setup()
    await wrapper.find('.stub-strata-add').trigger('click')
    expect(wrapper.emitted('strata:add')).toBeTruthy()
  })

  it('emits strata:edit with index when the strata list signals edit', async () => {
    const { wrapper } = setup()
    await wrapper.find('.stub-strata-edit').trigger('click')
    expect(wrapper.emitted('strata:edit')).toBeTruthy()
    expect(wrapper.emitted('strata:edit')![0]).toEqual([2])
  })

  it('removes a stratify rule when the strata list signals remove', async () => {
    const { store, wrapper } = setup()
    store.addStratifyRule({ name: 'R', expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } as never })
    await flushPromises()
    await wrapper.find('.stub-strata-remove').trigger('click')
    expect(store.currentIR!.expression.strata).toHaveLength(0)
  })

  it('moves a stratify rule when the strata list signals move', async () => {
    const { store, wrapper } = setup()
    store.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } as never })
    store.addStratifyRule({ name: 'B', expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } as never })
    await flushPromises()
    await wrapper.find('.stub-strata-move').trigger('click')
    expect(store.currentIR!.expression.strata[0]!.name).toBe('B')
    expect(store.currentIR!.expression.strata[1]!.name).toBe('A')
  })
})
