/**
 * Temporal-window behaviour, re-homed from the deleted
 * tests/component/cohort-builder/TemporalWindowEditor.spec.ts (and the
 * EndWindowEditor spec beside it) onto cohort-editor/criteria/Window.vue,
 * criteria/window-utils.ts and the window menu in criteria/CorelatedCriteria.vue.
 *
 * Two preset cases are `it.fails`. They exercise thread T17: two of the quick
 * presets produce windows that contradict the label the user picked.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import WindowEditor from '@/components/cohort-editor/criteria/Window.vue'
import CorelatedCriteria from '@/components/cohort-editor/criteria/CorelatedCriteria.vue'
import {
  cloneWindow,
  createDefaultWindow,
  formatWindowExpression,
  getWindowPresetOptions,
} from '@/components/cohort-editor/criteria/window-utils'
import type {
  CorelatedCriteria as CorelatedCriteriaModel,
  Window as WindowModel,
} from '@/components/cohort-editor/circe.types'

const vuetify = createVuetify({ components, directives })

// v-menu teleports and lazily renders its content, so the day fields inside the
// window chips are unreachable from a mounted wrapper without this.
const EagerMenu = {
  name: 'AtlasMenu',
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div class="menu-stub"><slot name="activator" :props="{}" /><slot /></div>',
}

function mountWindow(window: WindowModel) {
  return mount(WindowEditor, {
    global: { plugins: [vuetify, createPinia()], stubs: { AtlasMenu: EagerMenu } },
    props: { window },
  })
}

// Chip order in the template: event anchor, start days, start direction,
// end days, end direction, index anchor.
const CHIP = { eventAnchor: 0, startDays: 1, startDirection: 2, endDays: 3, endDirection: 4, indexAnchor: 5 }

function chips(wrapper: ReturnType<typeof mountWindow>) {
  return wrapper.findAll('.window-editor__chip')
}

function findPreset(labelPrefix: string) {
  const preset = getWindowPresetOptions().find(option => option.label.startsWith(labelPrefix))
  expect(preset, `no window preset labelled "${labelPrefix}"`).toBeDefined()
  return preset!
}

function presetNamed(labelPrefix: string) {
  return findPreset(labelPrefix).value
}

describe('window defaults and cloning', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('opens a new window unbounded in both directions', () => {
    expect(createDefaultWindow()).toEqual({
      Start: { Days: null, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
  })

  it('clones a window deeply so editing the copy leaves the original alone', () => {
    const source: WindowModel = { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 }, UseIndexEnd: true, UseEventEnd: false }
    const copy = cloneWindow(source)

    copy.Start!.Days = 90
    copy.UseIndexEnd = false

    expect(source.Start!.Days).toBe(30)
    expect(source.UseIndexEnd).toBe(true)
  })

  it('fills in the missing half of a partial window with its own default direction', () => {
    expect(cloneWindow({ Start: { Days: 7, Coeff: -1 } })).toEqual({
      Start: { Days: 7, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
  })
})

describe('window summaries', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('says so when there is no window at all', () => {
    expect(formatWindowExpression(undefined)).toBe('No window')
  })

  it('reads a bounded window back in the order the user set it', () => {
    const summary = formatWindowExpression({
      Start: { Days: 30, Coeff: -1 },
      End: { Days: 1, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })

    expect(summary).toBe('event starts between 30 days before and 1 day after index start')
  })

  it('reads an unset day count as all days rather than as zero', () => {
    const summary = formatWindowExpression(createDefaultWindow())

    expect(summary).toBe('event starts between all days before and all days after index start')
  })

  it('names the anchors the window is actually measured from', () => {
    const summary = formatWindowExpression({
      Start: { Days: 0, Coeff: 1 },
      End: { Days: 0, Coeff: 1 },
      UseIndexEnd: true,
      UseEventEnd: true,
    })

    expect(summary).toBe('event ends between 0 days after and 0 days after index end')
  })
})

describe('window presets', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it.each([
    ['Short-term baseline', 30, -1, 0, 1],
    ['Medium-term baseline', 180, -1, 0, 1],
    ['Long-term baseline', 365, -1, 0, 1],
  ] as const)('%s looks back the number of days its label promises', (label, startDays, startCoeff, endDays, endCoeff) => {
    const { startWindow, endWindow } = presetNamed(label)

    expect(startWindow.Start).toEqual({ Days: startDays, Coeff: startCoeff })
    expect(startWindow.End).toEqual({ Days: endDays, Coeff: endCoeff })
    expect(endWindow).toBeUndefined()
  })

  it('leaves the look-back unbounded for all time prior to index', () => {
    const { startWindow } = presetNamed('All time prior to index')

    expect(startWindow.Start).toEqual({ Days: null, Coeff: -1 })
    expect(startWindow.End).toEqual({ Days: 0, Coeff: 1 })
  })

  it('pins both ends to the index date for the on-index-date preset', () => {
    const { startWindow, endWindow } = presetNamed('On index date')

    expect(startWindow.Start).toEqual({ Days: 0, Coeff: 1 })
    expect(startWindow.End).toEqual({ Days: 0, Coeff: 1 })
    expect(endWindow?.Start).toEqual({ Days: 0, Coeff: 1 })
    expect(endWindow?.End).toEqual({ Days: 0, Coeff: 1 })
  })

  // T17 (src/components/cohort-editor/criteria/window-utils.ts:66): the acute
  // follow-up preset is built as createWindow(0, 'after', 0, 'after'), so the
  // window it produces ends on the index date. Picking "0 to 30 days after"
  // silently gives the cohort a zero-width window, not a 30-day one.
  it.fails('acute follow-up reaches the 30 days its label promises', () => {
    const { startWindow } = presetNamed('Acute follow-up')

    expect(startWindow.Start).toEqual({ Days: 0, Coeff: 1 })
    expect(startWindow.End).toEqual({ Days: 30, Coeff: 1 })
  })

  // T17 (window-utils.ts:78): "All time after index" is built the same way, so
  // instead of an unbounded look-forward (Days: null) it is bounded at the index
  // date and is indistinguishable from the "On index date" preset.
  it.fails('all time after index is unbounded going forward', () => {
    const { startWindow } = presetNamed('All time after index')

    expect(startWindow.Start).toEqual({ Days: 0, Coeff: 1 })
    expect(startWindow.End).toEqual({ Days: null, Coeff: 1 })
  })

  // T17, both defects at once: three differently-labelled presets currently
  // produce the same start window, so the choice the user made is not recoverable
  // from the cohort.
  it.fails('differently-labelled presets produce different windows', () => {
    const onIndex = JSON.stringify(presetNamed('On index date').startWindow)
    const acute = JSON.stringify(presetNamed('Acute follow-up').startWindow)
    const allAfter = JSON.stringify(presetNamed('All time after index').startWindow)

    expect(new Set([onIndex, acute, allAfter]).size).toBe(3)
  })

  it('hands out a fresh window each time so two criteria never share one', () => {
    const first = getWindowPresetOptions()[0]!.value.startWindow
    const second = getWindowPresetOptions()[0]!.value.startWindow

    expect(first).not.toBe(second)
    expect(first.Start).not.toBe(second.Start)
  })
})

describe('Window editor', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows an unset day count as all days', () => {
    const wrapper = mountWindow(createDefaultWindow())

    expect(chips(wrapper)[CHIP.startDays]!.text()).toBe('all days')
    expect(chips(wrapper)[CHIP.endDays]!.text()).toBe('all days')
  })

  it('singularises a one-day bound', () => {
    const wrapper = mountWindow({ Start: { Days: 1, Coeff: -1 }, End: { Days: 30, Coeff: 1 } })

    expect(chips(wrapper)[CHIP.startDays]!.text()).toBe('1 day')
    expect(chips(wrapper)[CHIP.endDays]!.text()).toBe('30 days')
  })

  it.each([
    [CHIP.startDirection, -1, 'Before'],
    [CHIP.endDirection, 1, 'After'],
  ] as const)('labels the direction from the coefficient', (index, coeff, expected) => {
    const wrapper = mountWindow({ Start: { Days: 0, Coeff: coeff }, End: { Days: 0, Coeff: coeff } })

    expect(chips(wrapper)[index]!.text()).toBe(expected)
  })

  it('flips the start direction between the two coefficients', async () => {
    const window: WindowModel = { Start: { Days: 30, Coeff: 1 }, End: { Days: 0, Coeff: 1 } }
    const wrapper = mountWindow(window)

    await chips(wrapper)[CHIP.startDirection]!.trigger('click')
    expect(window.Start!.Coeff).toBe(-1)

    await chips(wrapper)[CHIP.startDirection]!.trigger('click')
    expect(window.Start!.Coeff).toBe(1)
  })

  it('flips the end direction independently of the start', async () => {
    const window: WindowModel = { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 } }
    const wrapper = mountWindow(window)

    await chips(wrapper)[CHIP.endDirection]!.trigger('click')

    expect(window.End!.Coeff).toBe(-1)
    expect(window.Start!.Coeff).toBe(-1)
  })

  it('toggles the event and index anchors onto the window', async () => {
    const window: WindowModel = createDefaultWindow()
    const wrapper = mountWindow(window)

    await chips(wrapper)[CHIP.eventAnchor]!.trigger('click')
    expect(window.UseEventEnd).toBe(true)
    expect(chips(wrapper)[CHIP.eventAnchor]!.text()).toBe('Event ends')

    await chips(wrapper)[CHIP.indexAnchor]!.trigger('click')
    expect(window.UseIndexEnd).toBe(true)
    expect(chips(wrapper)[CHIP.indexAnchor]!.text()).toBe('Index ends')
  })

  it('writes a typed day count into the window as a number', async () => {
    const window: WindowModel = createDefaultWindow()
    const wrapper = mountWindow(window)
    const inputs = wrapper.findAll('input[type="number"]')

    await inputs[0]!.setValue('45')
    await inputs[1]!.setValue('90')

    expect(window.Start!.Days).toBe(45)
    expect(window.End!.Days).toBe(90)
  })

  it('clears a day count back to all time rather than to zero', async () => {
    const window: WindowModel = { Start: { Days: 30, Coeff: -1 }, End: { Days: 30, Coeff: 1 } }
    const wrapper = mountWindow(window)

    await wrapper.findAll('input[type="number"]')[0]!.setValue('')

    expect(window.Start!.Days).toBeNull()
    expect(chips(wrapper)[CHIP.startDays]!.text()).toBe('all days')
  })

  it('clears a day count from the chip without opening the editor', async () => {
    const window: WindowModel = { Start: { Days: 30, Coeff: -1 }, End: { Days: 30, Coeff: 1 } }
    const wrapper = mountWindow(window)

    await wrapper.findAll('.window-editor__clear-icon')[0]!.trigger('click')

    expect(window.Start!.Days).toBeNull()
  })

  it('offers no clear affordance when there is nothing to clear', () => {
    const wrapper = mountWindow(createDefaultWindow())

    expect(wrapper.findAll('.window-editor__clear-icon')).toHaveLength(0)
  })

  // `windowDirection` reads a missing endpoint as "after" (any Coeff that is not
  // -1 is treated as 1) while `ensureEndpoint` materialises a missing Start with
  // Coeff -1. A window that arrives with no Start therefore shows "After" on the
  // chip but records "before" the moment the user types a day count into it.
  // Not one of the numbered review threads; surfaced by this port.
  it.fails('agrees with itself about the direction of an endpoint it had to create', async () => {
    const window: WindowModel = {}
    const wrapper = mountWindow(window)

    expect(chips(wrapper)[CHIP.startDirection]!.text()).toBe('After')

    await wrapper.findAll('input[type="number"]')[0]!.setValue('45')

    expect(window.Start).toEqual({ Days: 45, Coeff: 1 })
  })
})

describe('CorelatedCriteria window menu', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const RendererStub = { name: 'CriteriaRendererStub', template: '<div />' }

  function mountCriteria(criteria: CorelatedCriteriaModel) {
    return mount(CorelatedCriteria, {
      global: {
        plugins: [vuetify, createPinia()],
        stubs: { AtlasMenu: EagerMenu, CriteriaRenderer: RendererStub },
      },
      props: { criteria, conceptSets: [] },
    })
  }

  it('gives a criteria with no window an unbounded default one', () => {
    const criteria: CorelatedCriteriaModel = { Criteria: { ConditionOccurrence: {} } }
    mountCriteria(criteria)

    expect(criteria.StartWindow).toEqual(createDefaultWindow())
    expect(criteria.EndWindow).toBeUndefined()
  })

  it('summarises the start window on the chip', () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: { ConditionOccurrence: {} },
      StartWindow: { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 } },
    }
    const wrapper = mountCriteria(criteria)

    expect(wrapper.find('.corelated-criteria-editor__window-chip').text())
      .toBe('event starts between 30 days before and 0 days after index start')
  })

  it('summarises both windows on the chip once there are two', () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: { ConditionOccurrence: {} },
      StartWindow: { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 } },
      EndWindow: { Start: { Days: 0, Coeff: 1 }, End: { Days: 90, Coeff: 1 } },
    }
    const wrapper = mountCriteria(criteria)

    expect(wrapper.find('.corelated-criteria-editor__window-chip').text()).toBe(
      'event starts between 30 days before and 0 days after index start '
      + 'and event starts between 0 days after and 90 days after index start'
    )
  })

  it('adds and then removes the second window without touching the first', async () => {
    const startWindow: WindowModel = { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 } }
    const criteria: CorelatedCriteriaModel = { Criteria: { ConditionOccurrence: {} }, StartWindow: startWindow }
    const wrapper = mountCriteria(criteria)

    const addWindow = wrapper.findAll('button').find(button => button.text() === 'Add Temporal Window')
    expect(addWindow).toBeDefined()
    await addWindow!.trigger('click')

    expect(criteria.EndWindow).toEqual(createDefaultWindow())
    expect(wrapper.findAllComponents(WindowEditor)).toHaveLength(2)

    const removeWindow = wrapper.findAllComponents(WindowEditor)[1]!.find('button')
    await removeWindow.trigger('click')

    expect(criteria.EndWindow).toBeUndefined()
    expect(criteria.StartWindow).toBe(startWindow)
  })

  it('replaces the start window when a preset is picked', async () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: { ConditionOccurrence: {} },
      StartWindow: createDefaultWindow(),
    }
    const wrapper = mountCriteria(criteria)

    wrapper.findAllComponents({ name: 'AtlasSelect' })[0]!.vm.$emit('update:modelValue', findPreset('Long-term baseline').label)
    await wrapper.vm.$nextTick()

    expect(criteria.StartWindow).toEqual({
      Start: { Days: 365, Coeff: -1 },
      End: { Days: 0, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
  })

  it('drops a stale end window when the chosen preset does not have one', async () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: { ConditionOccurrence: {} },
      StartWindow: createDefaultWindow(),
      EndWindow: createDefaultWindow(),
    }
    const wrapper = mountCriteria(criteria)

    wrapper.findAllComponents({ name: 'AtlasSelect' })[0]!.vm.$emit('update:modelValue', findPreset('Short-term baseline').label)
    await wrapper.vm.$nextTick()

    expect(criteria.EndWindow).toBeUndefined()
  })

  it('brings an end window with it when the chosen preset has one', async () => {
    const criteria: CorelatedCriteriaModel = {
      Criteria: { ConditionOccurrence: {} },
      StartWindow: createDefaultWindow(),
    }
    const wrapper = mountCriteria(criteria)

    wrapper.findAllComponents({ name: 'AtlasSelect' })[0]!.vm.$emit('update:modelValue', findPreset('1-year follow-up').label)
    await wrapper.vm.$nextTick()

    expect(criteria.EndWindow).toEqual({
      Start: { Days: 0, Coeff: 1 },
      End: { Days: 365, Coeff: 1 },
      UseIndexEnd: false,
      UseEventEnd: false,
    })
  })

  it('ignores a cleared preset selection instead of wiping the window', async () => {
    const startWindow = { Start: { Days: 30, Coeff: -1 }, End: { Days: 0, Coeff: 1 }, UseIndexEnd: false, UseEventEnd: false }
    const criteria: CorelatedCriteriaModel = { Criteria: { ConditionOccurrence: {} }, StartWindow: startWindow }
    const wrapper = mountCriteria(criteria)

    wrapper.findAllComponents({ name: 'AtlasSelect' })[0]!.vm.$emit('update:modelValue', null)
    await wrapper.vm.$nextTick()

    expect(criteria.StartWindow).toEqual(startWindow)
  })
})

