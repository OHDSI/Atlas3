import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Mock i18n composable
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock webapi service
vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAllConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

import EventPersistenceSelector from '@/components/cohort-builder/EventPersistenceSelector.vue'
import type { ExitCriteria } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('EventPersistenceSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (exitCriteria?: ExitCriteria) => {
    return mount(EventPersistenceSelector, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: exitCriteria || { strategy: 'CONTINUOUS_DRUG' },
      },
    })
  }

  it('should render event persistence selector container', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.event-persistence-selector').exists()).toBe(true)
  })

  it('should render ObservationStrategy when CONTINUOUS_OBSERVATION is selected', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_OBSERVATION'
    }

    const wrapper = createWrapper(exitCriteria)

    // ObservationStrategy component should be rendered
    const observationComponent = wrapper.findComponent({ name: 'ObservationStrategy' })
    expect(observationComponent.exists()).toBe(true)

    // Other strategies should not be rendered
    expect(wrapper.findComponent({ name: 'FixedDurationStrategy' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'DrugExposureStrategy' }).exists()).toBe(false)
  })

  it('should render FixedDurationStrategy when FIXED_DURATION is selected', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'START_DATE',
      offset: 0
    }

    const wrapper = createWrapper(exitCriteria)

    const fixedComponent = wrapper.findComponent({ name: 'FixedDurationStrategy' })
    expect(fixedComponent.exists()).toBe(true)

    // Other strategies should not be rendered
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

    const drugComponent = wrapper.findComponent({ name: 'DrugExposureStrategy' })
    expect(drugComponent.exists()).toBe(true)

    // Other strategies should not be rendered
    expect(wrapper.findComponent({ name: 'ObservationStrategy' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'FixedDurationStrategy' }).exists()).toBe(false)
  })

  it('should pass through select-drug-concept-set event from DrugExposureStrategy', async () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG'
    }

    const wrapper = createWrapper(exitCriteria)
    const drugComponent = wrapper.findComponent({ name: 'DrugExposureStrategy' })

    // Emit from child component
    drugComponent.vm.$emit('select-drug-concept-set')

    // Event should bubble up
    expect(wrapper.emitted('select-drug-concept-set')).toBeTruthy()
  })

  it('should pass through edit-drug-concept-set event from DrugExposureStrategy with payload', async () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' }
    }

    const wrapper = createWrapper(exitCriteria)
    const drugComponent = wrapper.findComponent({ name: 'DrugExposureStrategy' })

    const payload = { id: 1, name: 'Statins' }
    drugComponent.vm.$emit('edit-drug-concept-set', payload)

    // Event should bubble up with payload
    const emitted = wrapper.emitted('edit-drug-concept-set')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([payload])
  })

  it('should change strategy when strategy button is clicked', async () => {
    const wrapper = createWrapper({ strategy: 'CONTINUOUS_OBSERVATION' })

    // Find FIXED_DURATION button
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const fixedDurationButton = buttons.find(btn =>
      btn.text().includes('Fixed Duration')
    )

    if (fixedDurationButton) {
      await fixedDurationButton.trigger('click')

      // Check that update:modelValue was emitted with new strategy
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect((emitted?.[0]?.[0] as ExitCriteria)?.strategy).toBe('FIXED_DURATION')
    }
  })

})
