/**
 * ResultsHeader component tests
 *
 * Covers duration formatting branches (ms / seconds / minutes / unknown),
 * design-hash truncation, and the update:threshold emit contract.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ResultsHeader from '@/components/characterization-results/ResultsHeader.vue'
import type { CharacterizationExecution } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeExecution(
  overrides: Partial<CharacterizationExecution> = {},
): CharacterizationExecution {
  return {
    id: 1,
    sourceKey: 'EUNOMIA',
    status: 'COMPLETED',
    startTime: 1_700_000_000_000,
    endTime: 1_700_000_005_000,
    duration: 5000,
    designHash: 'abcdef1234567890fedcba',
    ...overrides,
  } as CharacterizationExecution
}

function mountHeader(props: {
  execution: CharacterizationExecution | null
  resultCount: number
  threshold: number
}) {
  return mount(ResultsHeader, {
    props,
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasCard: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('ResultsHeader', () => {
  it('renders em-dash when execution is null', () => {
    const wrapper = mountHeader({ execution: null, resultCount: 0, threshold: 0 })
    expect(wrapper.text()).toContain('—')
  })

  it('renders source key from execution', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ sourceKey: 'CDM_V5' }),
      resultCount: 3,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('CDM_V5')
    expect(wrapper.text()).toContain('3')
  })

  it('renders em-dash when startTime is missing or non-positive', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ startTime: undefined, endTime: 0 }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('—')
  })

  it('formats ms duration as "N ms" when < 1s', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ duration: 500 }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('500 ms')
  })

  it('formats seconds duration as "Ns" when < 1m', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ duration: 5_000 }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('5s')
  })

  it('formats minutes duration as "Xm Ys"', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ duration: 125_000 }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('2m 5s')
  })

  it('renders em-dash for negative duration', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ duration: -1 }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('—')
  })

  it('renders em-dash when duration is undefined', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ duration: undefined }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('—')
  })

  it('truncates long design hash with ellipsis', () => {
    const long = 'abcdefghijklmno'
    const wrapper = mountHeader({
      execution: makeExecution({ designHash: long }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('abcdefghijkl…')
  })

  it('renders short design hash verbatim', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ designHash: 'abc' }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('abc')
  })

  it('renders em-dash when design hash is missing', () => {
    const wrapper = mountHeader({
      execution: makeExecution({ designHash: undefined }),
      resultCount: 1,
      threshold: 0,
    })
    expect(wrapper.text()).toContain('—')
  })

  it('emits update:threshold when slider changes', async () => {
    const wrapper = mountHeader({
      execution: makeExecution(),
      resultCount: 10,
      threshold: 0,
    })
    const slider = wrapper.findComponent({ name: 'VSlider' })
    expect(slider.exists()).toBe(true)
    slider.vm.$emit('update:modelValue', 5)
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:threshold')).toEqual([[5]])
  })

  it('unwraps array slider value before emitting (defensive branch)', async () => {
    const wrapper = mountHeader({
      execution: makeExecution(),
      resultCount: 10,
      threshold: 0,
    })
    const slider = wrapper.findComponent({ name: 'VSlider' })
    slider.vm.$emit('update:modelValue', [7, 9])
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:threshold')).toEqual([[7]])
  })

  it('does not emit when slider value is non-numeric', async () => {
    const wrapper = mountHeader({
      execution: makeExecution(),
      resultCount: 10,
      threshold: 0,
    })
    const slider = wrapper.findComponent({ name: 'VSlider' })
    slider.vm.$emit('update:modelValue', 'oops')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:threshold')).toBeUndefined()
  })
})
