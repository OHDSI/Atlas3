import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Mock i18n composable - use key-only mock for unit tests
// Returns format "i18n:keyName" so tests verify the KEY is used, not the translated TEXT
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18nKeyOnly } = await import('../../helpers/i18n-mock')
  return mockUseI18nKeyOnly
})

// Mock services to prevent actual API calls
vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

import ExitCriteriaPanel from '@/components/cohort-builder/ExitCriteriaPanel.vue'
import type { ExitCriteria, CohortEvent, ConceptSetReference } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ExitCriteriaPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockConceptSets: ConceptSetReference[] = [
    { id: 1, name: 'Test Concept Set' }
  ]

  const createWrapper = (props?: {
    modelValue?: ExitCriteria
    censoringCriteria?: CohortEvent[]
    conceptSets?: ConceptSetReference[]
  }) => {
    return mount(ExitCriteriaPanel, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: props?.modelValue,
        censoringCriteria: props?.censoringCriteria || [],
        conceptSets: props?.conceptSets || mockConceptSets,
      },
    })
  }

  it('should render exit criteria panel', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.exit-criteria-panel').exists()).toBe(true)
  })

  it('should render all sub-components', () => {
    const wrapper = createWrapper()

    // Should have EventPersistenceSelector and CensoringEventsEditor
    expect(wrapper.html()).toContain('Event Persistence')
    expect(wrapper.html()).toContain('Censoring Events')
  })

  it('should display event persistence selector', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.event-persistence-selector').exists()).toBe(true)
  })

  it('should display censoring events when provided', () => {
    const censoringCriteria: CohortEvent[] = [{
      id: 'test-1',
      criteriaType: 'Death',
      attributes: []
    }]

    const wrapper = createWrapper({ censoringCriteria })
    expect(wrapper.find('.censoring-events-editor').exists()).toBe(true)
  })

  it('should aggregate validation errors from sub-components', async () => {
    const wrapper = createWrapper()

    // The panel should aggregate errors
    expect(wrapper.vm.aggregatedErrors).toBeDefined()
  })

  it('should emit updates for exit criteria changes', async () => {
    const wrapper = createWrapper()

    // When EventPersistenceSelector emits update, panel should propagate it
    const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
    if (eventPersistence.exists()) {
      await eventPersistence.vm.$emit('update:modelValue', {
        strategy: 'FIXED_DURATION',
        offset: 30
      })
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    }
  })

  it('should emit updates for censoring events changes', async () => {
    const wrapper = createWrapper()

    const censoringEventsEditor = wrapper.findComponent({ name: 'CensoringEventsEditor' })
    if (censoringEventsEditor.exists()) {
      await censoringEventsEditor.vm.$emit('update:modelValue', [])
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:censoringCriteria')).toBeTruthy()
    }
  })

  it('should handle undefined modelValue gracefully', () => {
    const wrapper = createWrapper({ modelValue: undefined })
    expect(wrapper.find('.exit-criteria-panel').exists()).toBe(true)
  })

  it('should render both sub-components', () => {
    const wrapper = createWrapper()

    // EventPersistenceSelector and CensoringEventsEditor components should exist
    const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
    const censoringEvents = wrapper.findComponent({ name: 'CensoringEventsEditor' })

    expect(eventPersistence.exists()).toBe(true)
    expect(censoringEvents.exists()).toBe(true)
  })

  describe('error aggregation', () => {
    it('should aggregate validation errors from EventPersistenceSelector', async () => {
      const wrapper = createWrapper({
        modelValue: {
          strategy: 'CONTINUOUS_DRUG',
          // Missing conceptSet - should error
        }
      })

      // EventPersistenceSelector is stubbed in shallowMount
      // Emit validation-error from the stubbed component
      const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
      if (eventPersistence.exists()) {
        const testError = [
          { field: 'exitCriteria.conceptSet', message: 'i18n:required', severity: 'error' }
        ]
        await eventPersistence.vm.$emit('validation-error', testError)
        await wrapper.vm.$nextTick()

        // Panel should aggregate this error
        const aggregated = wrapper.vm.aggregatedErrors
        expect(aggregated.some((e: any) => e.field === 'exitCriteria.conceptSet')).toBe(true)
      }
    })

    it('should aggregate errors from both sources simultaneously', async () => {
      const wrapper = createWrapper()

      // Emit from EventPersistenceSelector
      const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
      const persistenceError = [
        { field: 'exitCriteria.offset', message: 'i18n:error1', severity: 'error' }
      ]
      
      // Emit from CensoringEventsEditor
      const censoringEvents = wrapper.findComponent({ name: 'CensoringEventsEditor' })
      const censoringError = [
        { field: 'censoringEvents', message: 'i18n:error2', severity: 'error' }
      ]

      if (eventPersistence.exists() && censoringEvents.exists()) {
        await eventPersistence.vm.$emit('validation-error', persistenceError)
        await censoringEvents.vm.$emit('validation-error', censoringError)
        await wrapper.vm.$nextTick()

        // Both errors should be aggregated
        const aggregated = wrapper.vm.aggregatedErrors
        expect(aggregated.length).toBe(2)
        expect(aggregated.some((e: any) => e.field === 'exitCriteria.offset')).toBe(true)
        expect(aggregated.some((e: any) => e.field === 'censoringEvents')).toBe(true)
      }
    })

    it('should clear aggregated errors when child emits empty array', async () => {
      const wrapper = createWrapper()

      const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
      if (eventPersistence.exists()) {
        // Start with error
        const error = [{ field: 'test', message: 'i18n:error', severity: 'error' }]
        await eventPersistence.vm.$emit('validation-error', error)
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.aggregatedErrors.length).toBeGreaterThan(0)

        // Emit empty array to clear
        await eventPersistence.vm.$emit('validation-error', [])
        await wrapper.vm.$nextTick()

        // Should be cleared
        expect(wrapper.vm.aggregatedErrors.filter((e: any) => e.field === 'test').length).toBe(0)
      }
    })

    it('should handle updates from parent correctly', async () => {
      const wrapper = createWrapper({
        modelValue: {
          strategy: 'FIXED_DURATION',
          dateField: 'START_DATE',
          offset: 30
        }
      })

      // Update parent model value
      await wrapper.setProps({
        modelValue: {
          strategy: 'CONTINUOUS_OBSERVATION'
        }
      })

      expect(wrapper.props('modelValue')).toEqual({
        strategy: 'CONTINUOUS_OBSERVATION'
      })
    })
  })
})
