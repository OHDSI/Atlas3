import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
import type { TemporalWindows, TemporalWindow } from '@/models/event.types'

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
  const createWrapper = (temporalWindows?: TemporalWindows) => {
    return mount(TemporalWindowEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: temporalWindows,
      },
    })
  }

  it('should render start window controls', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[aria-label="Start Days"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Start Direction"]').exists()).toBe(true)
  })

  it('should render end window controls', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('[aria-label="End Days"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="End Direction"]').exists()).toBe(true)
  })

  it('should display "0 to 90 days after index" temporal window', () => {
    const temporalWindows: TemporalWindows = {
      startWindow: {
        days: 0,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindows)

    expect(wrapper.html()).toContain('0')
    expect(wrapper.html()).toContain('90')
    expect(wrapper.html()).toContain('after')
  })

  it('should handle "any time before index" window', () => {
    const temporalWindows: TemporalWindows = {
      startWindow: {
        days: null,
        coeff: -1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindows)

    // Verify "all time" checkbox is checked
    expect(wrapper.find('[aria-label="All time"]').element.checked).toBe(true)
    expect(wrapper.html()).toContain('before')
  })

  it('should emit update when start days changes', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 0,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const startDaysInput = wrapper.find('[aria-label="Start Days"]')
    await startDaysInput.setValue('30')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].startWindow?.days).toBe(30)
  })

  it('should emit update when end days changes', async () => {
    const wrapper = createWrapper({
      endWindow: {
        days: 90,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const endDaysInput = wrapper.find('[aria-label="End Days"]')
    await endDaysInput.setValue('180')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].endWindow?.days).toBe(180)
  })

  it('should toggle direction from after to before', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 30,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const directionToggle = wrapper.find('[aria-label="Start Direction"]')
    await directionToggle.setValue('before')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].startWindow?.coeff).toBe(-1)
  })

  it('should set days to null when "all time" is checked', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 30,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const allTimeCheckbox = wrapper.find('[aria-label="All time"]')
    await allTimeCheckbox.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].startWindow?.days).toBe(null)
  })

  it('should disable days input when "all time" is checked', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: null,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const daysInput = wrapper.find('[aria-label="Start Days"]')
    expect(daysInput.attributes('disabled')).toBeDefined()
  })

  it('should toggle useIndexEnd flag', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 0,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const indexEndToggle = wrapper.find('[aria-label="Use Index End"]')
    await indexEndToggle.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].startWindow?.useIndexEnd).toBe(true)
  })

  it('should toggle useEventEnd flag', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: 0,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    const eventEndToggle = wrapper.find('[aria-label="Use Event End"]')
    await eventEndToggle.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[emitted.length - 1][0].startWindow?.useEventEnd).toBe(true)
  })

  it('should validate start window days >= 0', async () => {
    const wrapper = createWrapper({
      startWindow: {
        days: -10,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    })

    // Negative days should show validation error
    expect(wrapper.html()).toContain('error')
  })

  it('should display both start and end windows', () => {
    const temporalWindows: TemporalWindows = {
      startWindow: {
        days: 0,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
      endWindow: {
        days: 90,
        coeff: 1,
        useIndexEnd: false,
        useEventEnd: false,
      },
    }
    const wrapper = createWrapper(temporalWindows)

    expect(wrapper.html()).toContain('Start Window')
    expect(wrapper.html()).toContain('End Window')
  })

  it('should initialize with default values when no temporal windows provided', () => {
    const wrapper = createWrapper()

    // Verify default temporal windows are created
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[TemporalWindows]>
    expect(emitted[0][0].startWindow).toBeDefined()
  })
})
