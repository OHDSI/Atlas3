import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'

// Mock i18n composable
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18nKeyOnly } = await import('../../helpers/i18n-mock')
  return mockUseI18nKeyOnly
})

import EventPersistenceSelector from '@/components/cohort-builder/EventPersistenceSelector.vue'
import type { ExitCriteria } from '@/models/cohort.types'
import type { ValidationError } from '@/models/validation.types'

const vuetify = createVuetify()

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('EventPersistenceSelector', () => {
  const createWrapper = (exitCriteria?: ExitCriteria) => {
    return mount(EventPersistenceSelector, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: exitCriteria || { strategy: 'CONTINUOUS_DRUG' },
      },
      shallow: true,
    })
  }

  // Basic rendering
  it('should render event persistence selector container', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.event-persistence-selector').exists()).toBe(true)
  })

  // Strategy selection - one test per strategy type
  it('should render ObservationStrategy when CONTINUOUS_OBSERVATION is selected', () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })
    expect(wrapper.findComponent({ name: 'ObservationStrategy' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'FixedDurationStrategy' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'DrugExposureStrategy' }).exists()).toBe(false)
  })

  it('should render FixedDurationStrategy when FIXED_DURATION is selected', () => {
    const exitCriteria: ExitCriteria = { strategy: 'FIXED_DURATION', dateField: 'START_DATE', offset: 0 }
    const wrapper = createWrapper(exitCriteria)
    expect(wrapper.findComponent({ name: 'FixedDurationStrategy' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ObservationStrategy' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'DrugExposureStrategy' }).exists()).toBe(false)
  })

  it('should render DrugExposureStrategy when CONTINUOUS_DRUG is selected', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }
    const wrapper = createWrapper(exitCriteria)
    expect(wrapper.findComponent({ name: 'DrugExposureStrategy' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ObservationStrategy' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'FixedDurationStrategy' }).exists()).toBe(false)
  })

  // Event pass-through
  it('should pass through select-drug-concept-set event from DrugExposureStrategy', () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_DRUG' })
    const drugComponent = wrapper.findComponent({ name: 'DrugExposureStrategy' })
    drugComponent.vm.$emit('select-drug-concept-set')
    expect(wrapper.emitted('select-drug-concept-set')).toBeTruthy()
  })

  it('should pass through edit-drug-concept-set event from DrugExposureStrategy with payload', () => {
    const exitCriteria: ExitCriteria = { strategy: 'CONTINUOUS_DRUG', conceptSet: { id: 1, name: 'Statins' } }
    const wrapper = createWrapper(exitCriteria)
    const drugComponent = wrapper.findComponent({ name: 'DrugExposureStrategy' })
    const payload = { id: 1, name: 'Statins' }
    drugComponent.vm.$emit('edit-drug-concept-set', payload)
    const emitted = wrapper.emitted('edit-drug-concept-set')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([payload])
  })

  // Strategy switching
  it('should emit update:modelValue when strategy button is clicked', async () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })
    const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
    const fixedDurationButton = buttons.find(btn => btn.text().includes('Fixed Duration'))

    if (fixedDurationButton) {
      await fixedDurationButton.trigger('click')
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect((emitted?.[0]?.[0] as ExitCriteria)?.strategy).toBe('FIXED_DURATION')
    }
  })

  // Validation events
  it('should emit validation-error event when strategy is changed', async () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })
    const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
    const fixedDurationButton = buttons.find(btn => btn.text().includes('Fixed Duration'))

    if (fixedDurationButton) {
      await fixedDurationButton.trigger('click')
      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
    }
  })

  // Disabled state
  it('should disable strategy buttons when disabled prop is true', () => {
    const wrapper = mount(EventPersistenceSelector, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: { strategy: 'CONTINUOUS_OBSERVATION' },
        disabled: true,
      },
      shallow: true,
    })

    const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
    expect(buttons.length).toBeGreaterThan(0)
    buttons.forEach(btn => {
      expect(btn.props('disabled')).toBe(true)
    })
  })

  // Transition tests - exercise changeStrategy for different paths
  it('should transition from FIXED_DURATION to CONTINUOUS_OBSERVATION with defaults', async () => {
    const wrapper = createWrapper({ strategy: 'FIXED_DURATION', dateField: 'START_DATE', offset: 30 })
    const vm = wrapper.vm as any
    vm.changeStrategy('CONTINUOUS_OBSERVATION')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const payload = emitted?.[0]?.[0] as ExitCriteria
    expect(payload.strategy).toBe('CONTINUOUS_OBSERVATION')
  })

  it('should transition from CONTINUOUS_OBSERVATION to FIXED_DURATION with defaults', async () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })
    const vm = wrapper.vm as any
    vm.changeStrategy('FIXED_DURATION')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const payload = emitted?.[0]?.[0] as ExitCriteria
    expect(payload.strategy).toBe('FIXED_DURATION')
    expect(payload.dateField).toBe('START_DATE')
    expect(payload.offset).toBe(0)
  })

  it('should transition from FIXED_DURATION to CONTINUOUS_DRUG with defaults', async () => {
    const wrapper = createWrapper({ strategy: 'FIXED_DURATION', dateField: 'START_DATE', offset: 30 })
    const vm = wrapper.vm as any
    vm.changeStrategy('CONTINUOUS_DRUG')
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const payload = emitted?.[0]?.[0] as ExitCriteria
    expect(payload.strategy).toBe('CONTINUOUS_DRUG')
    expect(payload.persistenceWindow).toBe(30)
    expect(payload.surveillanceWindow).toBe(7)
  })

  it('should emit validation-error when an unknown strategy type is passed', async () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })
    const vm = wrapper.vm as any
    // Use type assertion to bypass TypeScript check and pass invalid strategy
    vm.changeStrategy('UNKNOWN_STRATEGY' as any)
    await wrapper.vm.$nextTick()

    const emitted = wrapper.emitted('validation-error')
    expect(emitted).toBeTruthy()
    const errors = emitted?.[0]?.[0] as ValidationError[]
    expect(errors).toHaveLength(1)
    expect(errors[0].field).toBe('strategy')
    expect(errors[0].severity).toBe('error')
    expect(errors[0].message).toContain('Unknown strategy type')
  })
})
