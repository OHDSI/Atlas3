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

import DrugExposureStrategy from '@/components/cohort-builder/DrugExposureStrategy.vue'
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

describe('DrugExposureStrategy', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (strategy?: ExitCriteria) => {
    return mount(DrugExposureStrategy, {
      global: {
        plugins: [vuetify],
      },
      props: {
        strategy: strategy || { strategy: 'CONTINUOUS_DRUG' },
      },
    })
  }

  it('should show "Select Concept Set" button when no concept set selected', () => {
    const wrapper = createWrapper()

    // Button should exist (with plus icon)
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    expect(buttons.length).toBeGreaterThan(0)

    const selectButton = buttons.find(btn => btn.text().includes('Select Drug Concept Set'))
    expect(selectButton).toBeTruthy()
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

  it('should emit select-drug-concept-set when select button is clicked', async () => {
    const wrapper = createWrapper()

    const button = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.text().includes('Select Drug Concept Set')
    )

    if (button) {
      await button.trigger('click')
      expect(wrapper.emitted('select-drug-concept-set')).toBeTruthy()
    }
  })

  it('should emit edit-drug-concept-set when chip is clicked', async () => {
    const conceptSet = { id: 1, name: 'Statins' }
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet,
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = createWrapper(exitCriteria)

    const chip = wrapper.findComponent({ name: 'VChip' })
    await chip.trigger('click')

    const emitted = wrapper.emitted('edit-drug-concept-set')
    expect(emitted).toBeTruthy()
    expect(emitted?.[0]).toEqual([conceptSet])
  })

  it('should show select button again after concept set is cleared', async () => {
    // First render with a concept set
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
      conceptSet: { id: 1, name: 'Statins' },
      persistenceWindow: 30,
      surveillanceWindow: 7
    }

    const wrapper = mount(DrugExposureStrategy, {
      global: {
        plugins: [vuetify],
      },
      props: {
        strategy: exitCriteria,
      },
    })

    // Chip should exist
    const chip = wrapper.findComponent({ name: 'VChip' })
    expect(chip.exists()).toBe(true)

    // Now re-render without concept set (simulating parent clearing it)
    const clearedCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_DRUG',
    }

    await wrapper.setProps({ strategy: clearedCriteria })

    // Button should show again
    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const selectButton = buttons.find(btn => btn.text().includes('Select Drug Concept Set'))
    expect(selectButton).toBeTruthy()
  })
})
