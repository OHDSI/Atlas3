import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import CensorWindowEditor from '@/components/cohort-builder/CensorWindowEditor.vue'
import type { CensorWindow, CollapseSettings } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CensorWindowEditor (Cohort Eras)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function createWrapper(opts: {
    censorWindow?: CensorWindow | null
    collapseSettings?: CollapseSettings
  } = {}) {
    return mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        censorWindow: opts.censorWindow ?? null,
        collapseSettings: opts.collapseSettings ?? { collapseType: 'ERA', eraPad: 0 },
      },
    })
  }

  it('renders the era pad row by default', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.era-pad-row').exists()).toBe(true)
    expect(wrapper.find('.era-pad-row__input').exists()).toBe(true)
  })

  it('shows the era pad value from collapseSettings', async () => {
    const wrapper = createWrapper({ collapseSettings: { collapseType: 'ERA', eraPad: 30 } })
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.era-pad-row__input input').element as HTMLInputElement
    expect(input.value).toBe('30')
  })

  it('hides trim options behind a toggle when no censor dates are set', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.trim-toggle').exists()).toBe(true)
    expect(wrapper.find('.trim-rows').exists()).toBe(false)
  })

  it('shows trim options inline when a censor date is preset', () => {
    const wrapper = createWrapper({ censorWindow: { startDate: '2020-01-01', endDate: null } })
    expect(wrapper.find('.trim-toggle').exists()).toBe(false)
    expect(wrapper.find('.trim-rows').exists()).toBe(true)
  })

  it('reveals trim options after clicking the add-trim-options link', async () => {
    const wrapper = createWrapper()
    await wrapper.find('.trim-toggle').trigger('click')
    expect(wrapper.find('.trim-rows').exists()).toBe(true)
  })

  it('emits collapseSettings on era pad blur', async () => {
    const wrapper = createWrapper()
    const input = wrapper.find('.era-pad-row__input input')
    await input.setValue('14')
    await input.trigger('blur')
    const emitted = wrapper.emitted('update:collapseSettings')
    expect(emitted).toBeTruthy()
    expect(emitted![emitted!.length - 1]).toEqual([{ collapseType: 'ERA', eraPad: 14 }])
  })

  it('emits censorWindow with both date strings when start and end are set', async () => {
    const wrapper = createWrapper({
      censorWindow: { startDate: '2020-01-01', endDate: '2020-12-31' },
    })
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.trim-row__input input')
    expect(inputs.length).toBe(2)
    await inputs[0].setValue('2021-01-01')
    const emitted = wrapper.emitted('update:censorWindow')
    expect(emitted).toBeTruthy()
    const last = emitted![emitted!.length - 1][0] as CensorWindow
    expect(last.startDate).toBe('2021-01-01')
    expect(last.endDate).toBe('2020-12-31')
  })

  it('emits undefined when both censor dates are cleared', async () => {
    const wrapper = createWrapper({ censorWindow: { startDate: '2020-01-01', endDate: null } })
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.trim-row__input input')
    await inputs[0].setValue('')
    const emitted = wrapper.emitted('update:censorWindow')
    expect(emitted).toBeTruthy()
    const last = emitted![emitted!.length - 1][0]
    expect(last).toBeUndefined()
  })

  it('emits a warning validation error when start date is after end date', async () => {
    const wrapper = createWrapper({
      censorWindow: { startDate: '2020-01-01', endDate: '2020-12-31' },
    })
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.trim-row__input input')
    // Push the start date past the end date — should emit an order warning
    await inputs[0].setValue('2021-06-01')
    const errors = wrapper.emitted('validation-error')
    expect(errors).toBeTruthy()
    const last = errors![errors!.length - 1][0] as Array<{ severity: string }>
    expect(last.length).toBe(1)
    expect(last[0].severity).toBe('warning')
  })

  it('disables inputs when disabled prop is set', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        censorWindow: null,
        collapseSettings: { collapseType: 'ERA', eraPad: 0 },
        disabled: true,
      },
    })
    const eraInput = wrapper.find('.era-pad-row__input input')
    expect((eraInput.element as HTMLInputElement).disabled).toBe(true)
  })
})
