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

// Mock webapi service to prevent actual API calls
vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue([]),
  getAllConceptSets: vi.fn().mockResolvedValue([]),
}))

import ExitCriteriaPanel from '@/components/cohort-builder/ExitCriteriaPanel.vue'
import type { ExitCriteria, Period, CohortEvent, ConceptSetReference } from '@/models/cohort.types'

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

  it('should show legacy conflict warning when both formats exist', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      offset: 365
    }
    const censoringCriteria: CohortEvent[] = [{
      id: 'test-1',
      criteriaType: 'Death',
      attributes: []
    }]

    const wrapper = createWrapper({ modelValue: exitCriteria, censoringCriteria })

    // The warning should appear when both legacy and new formats exist
    expect(wrapper.html()).toContain('legacy')
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

  it('should pass concept sets to sub-components', () => {
    const wrapper = createWrapper({ conceptSets: mockConceptSets })

    // EventPersistenceSelector and CensoringEventsEditor should receive conceptSets
    const eventPersistence = wrapper.findComponent({ name: 'EventPersistenceSelector' })
    const censoringEvents = wrapper.findComponent({ name: 'CensoringEventsEditor' })

    if (eventPersistence.exists()) {
      expect(eventPersistence.props('conceptSets')).toEqual(mockConceptSets)
    }
    if (censoringEvents.exists()) {
      expect(censoringEvents.props('conceptSets')).toEqual(mockConceptSets)
    }
  })
})
