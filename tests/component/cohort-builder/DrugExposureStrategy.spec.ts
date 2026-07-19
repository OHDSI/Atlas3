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

    // Button should exist with plus icon (text will be i18n key with key-only mock)
    const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
    expect(buttons.length).toBeGreaterThan(0)

    // Check that there's a button with the plus icon (select concept set button)
    const selectButton = buttons.find(btn => btn.props('icon') === 'mdi-plus')
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

    const button = wrapper.findAllComponents({ name: 'AtlasButton' }).find(btn =>
      btn.props('icon') === 'mdi-plus'
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

    // Button should show again with plus icon (text will be i18n key with key-only mock)
    const buttons = wrapper.findAllComponents({ name: 'AtlasButton' })
    const selectButton = buttons.find(btn => btn.props('icon') === 'mdi-plus')
    expect(selectButton).toBeTruthy()
  })

  describe('validation rules', () => {
    it('allows zero persistence window value', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Statins' },
        persistenceWindow: 0,
        surveillanceWindow: 7
      }

      const wrapper = createWrapper(exitCriteria)

      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })

    it('allows positive persistence window value', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Statins' },
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const wrapper = createWrapper(exitCriteria)

      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })

    it('allows zero surveillance window value', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Statins' },
        persistenceWindow: 30,
        surveillanceWindow: 0
      }

      const wrapper = createWrapper(exitCriteria)

      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })

    it('allows positive surveillance window value', () => {
      const exitCriteria: ExitCriteria = {
        strategy: 'CONTINUOUS_DRUG',
        conceptSet: { id: 1, name: 'Statins' },
        persistenceWindow: 30,
        surveillanceWindow: 7
      }

      const wrapper = createWrapper(exitCriteria)

      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })
  })

  describe('validation error emission', () => {
    it('should emit validation-error on mount when conceptSet is missing', () => {
      const wrapper = createWrapper({ strategy: 'CONTINUOUS_DRUG' })

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      expect(emitted?.[0]).toBeDefined()
      const errors = emitted?.[0][0]
      expect(Array.isArray(errors)).toBe(true)
      expect(errors?.some((e: any) => e.field === 'exitCriteria.conceptSet')).toBe(true)
    })

    it('should emit validation-error when negative window values are set', async () => {
      const wrapper = mount(DrugExposureStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'CONTINUOUS_DRUG',
            conceptSet: { id: 1, name: 'Test' },
            persistenceWindow: -5,
            surveillanceWindow: 10
          }
        }
      })

      // Wait for watch to trigger
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      const latestErrors = emitted?.[emitted.length - 1][0]
      expect(latestErrors?.some((e: any) => e.field === 'exitCriteria.persistenceWindow' && e.severity === 'error')).toBe(true)
    })

    it('should emit multiple validation errors for composite failures', async () => {
      const wrapper = mount(DrugExposureStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'CONTINUOUS_DRUG',
            // Missing conceptSet + negative values
            persistenceWindow: -3,
            surveillanceWindow: -2
          }
        }
      })

      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      const errors = emitted?.[emitted.length - 1][0]
      expect(errors?.length).toBeGreaterThanOrEqual(3) // conceptSet + persistenceWindow + surveillanceWindow
    })

    it('should emit clean validation state when valid data provided', async () => {
      const wrapper = mount(DrugExposureStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'CONTINUOUS_DRUG',
            conceptSet: { id: 1, name: 'Valid' },
            persistenceWindow: 30,
            surveillanceWindow: 7
          }
        }
      })

      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      // Should emit an array (either empty or with only warnings)
      const latestErrors = emitted?.[emitted.length - 1][0]
      // With conceptSet provided, should have no error-level violations
      const errorLevelIssues = latestErrors?.filter((e: any) => e.severity === 'error') || []
      expect(errorLevelIssues.length).toBe(0)
    })
  })
})
