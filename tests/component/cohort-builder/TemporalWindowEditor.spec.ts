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

import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
import type { TemporalWindow } from '@/models/event.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('TemporalWindowEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (temporalWindow?: TemporalWindow) => {
    return mount(TemporalWindowEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: temporalWindow,
      },
    })
  }

  it('should render start window controls', () => {
    const wrapper = createWrapper()
    // Check that component has text fields for both start and end days
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThanOrEqual(2)
  })

  it('should render end window controls', () => {
    const wrapper = createWrapper()
    // Check that component has selects and text fields (for both start and end windows)
    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(selects.length).toBeGreaterThan(0)
    expect(textFields.length).toBeGreaterThanOrEqual(2)
  })

  it('should display provided temporal window values', () => {
    const temporalWindow: TemporalWindow = {
      startWindow: {
        days: 0,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindow)

    expect(wrapper.html()).toContain('0')
    expect(wrapper.html()).toContain('90')
  })

  it('should handle null days (all time)', () => {
    const temporalWindow: TemporalWindow = {
      startWindow: {
        days: null,
        beforeAfter: 'BEFORE',
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindow)

    // Check that the component renders
    expect(wrapper.exists()).toBe(true)
  })

  it('should render input for start days', () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 0,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    // Verify that text fields are rendered (for start and end days)
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThanOrEqual(2)
  })

  it('should render input for end days', () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 0,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    // Verify that at least 2 text fields are rendered (start and end)
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThanOrEqual(2)
  })

  it('should toggle direction for start window', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 30,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    // Find the direction select (should be after presets select)
    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    expect(selects.length).toBeGreaterThan(1)

    // The second select should be the start direction
    const directionSelect = selects[1]
    await directionSelect.vm.$emit('update:modelValue', 'before')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindow]>
    expect(emitted[emitted.length - 1][0].startWindow?.beforeAfter).toBe('BEFORE')
  })

  it('should handle checkbox for all time', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 30,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    // Find the checkbox for all time
    const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
    expect(checkboxes.length).toBeGreaterThan(0)

    const allTimeCheckbox = checkboxes[0]
    await allTimeCheckbox.vm.$emit('update:modelValue', true)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindow]>
    expect(emitted[emitted.length - 1][0].startWindow?.days).toBe(null)
  })

  it('should initialize with default values when no temporal window provided', () => {
    const wrapper = createWrapper()

    // Verify default temporal window is created
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindow]>
    expect(emitted[0][0].startWindow).toBeDefined()
    expect(emitted[0][0].endWindow).toBeDefined()
  })

  it('should render both start and end windows', () => {
    const temporalWindow: TemporalWindow = {
      startWindow: {
        days: 0,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        beforeAfter: 'AFTER',
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindow)

    // Check that we have at least 2 text fields (one for start, one for end)
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThanOrEqual(2)
  })
})
