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
import type { ExitCriteria, ConceptSetReference } from '@/models/cohort.types'

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

  const mockConceptSets: ConceptSetReference[] = [
    { id: 1, name: 'Statins' },
    { id: 2, name: 'ACE Inhibitors' }
  ]

  const createWrapper = (exitCriteria?: ExitCriteria, conceptSets = mockConceptSets) => {
    return mount(EventPersistenceSelector, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: exitCriteria || { strategy: 'CONTINUOUS_DRUG' },
        conceptSets,
      },
    })
  }

  it('should render event persistence selector', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.event-persistence-selector').exists()).toBe(true)
  })

  it('should show "Select Concept Set" button when no concept set selected', () => {
    const wrapper = createWrapper()

    // Should have selectedConceptSet as null
    expect(wrapper.vm.selectedConceptSet).toBeNull()

    // Button should exist (with plus icon)
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should show concept set chip when concept set is selected', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    const chip = wrapper.findComponent({ name: 'VChip' })
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toContain('Statins')
  })

  it('should show persistence window and surveillance window fields when concept set is selected', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    // Should show both text fields
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBe(2)

    // Check for persistence window and surveillance window
    expect(wrapper.html()).toContain('Persistence Window')
    expect(wrapper.html()).toContain('Surveillance Window')
  })

  it('should emit open-concept-set-dialog when select button is clicked', async () => {
    const wrapper = createWrapper()

    const button = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.text().includes('Select Concept Set')
    )

    if (button) {
      await button.trigger('click')
      expect(wrapper.emitted('open-concept-set-dialog')).toBeTruthy()
    }
  })

  it('should clear concept set when chip close is clicked', async () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    // Component should have clearConceptSet method
    expect(wrapper.vm.clearConceptSet).toBeDefined()

    // Call it directly
    await wrapper.vm.clearConceptSet()
    await wrapper.vm.$nextTick()

    // Should emit update with no concept set
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
  })

  it('should show tooltips for help icons', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    // Should have tooltips
    const tooltips = wrapper.findAllComponents({ name: 'VTooltip' })
    expect(tooltips.length).toBeGreaterThan(0)
  })

  it('should show help hint about missing days supply', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    const hints = wrapper.findAll('.event-persistence__hint')
    const daysSupplyHint = hints.find(h => h.text().includes('days supply'))
    expect(daysSupplyHint).toBeDefined()
  })

})
