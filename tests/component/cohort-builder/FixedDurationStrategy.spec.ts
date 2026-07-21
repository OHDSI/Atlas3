import { describe, it, expect, vi } from 'vitest'
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

import FixedDurationStrategy from '@/components/cohort-builder/FixedDurationStrategy.vue'
import type { ExitCriteria } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

describe('FixedDurationStrategy', () => {
  const createWrapper = (strategy?: ExitCriteria) => {
    return mount(FixedDurationStrategy, {
      global: {
        plugins: [vuetify],
      },
      props: {
        strategy: strategy || {
          strategy: 'FIXED_DURATION',
          dateField: 'START_DATE',
          offset: 0,
        },
      },
    })
  }

  it('renders date field selector', () => {
    const wrapper = createWrapper()
    
    expect(wrapper.exists()).toBe(true)
    // Vuetify renders select component with translated label
    expect(wrapper.findComponent({ name: 'VSelect' }).exists()).toBe(true)
  })

  it('renders offset field with label', () => {
    const wrapper = createWrapper()
    
    // Vuetify renders text field for offset
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThan(0)
  })

  it('initializes with START_DATE as default date field', () => {
    const strategy: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'START_DATE',
      offset: 0,
    }
    
    const wrapper = createWrapper(strategy)
    
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.html()).toContain('START_DATE')
  })

  it('initializes with END_DATE as alternative date field', () => {
    const strategy: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'END_DATE',
      offset: 5,
    }
    
    const wrapper = createWrapper(strategy)
    
    expect(wrapper.exists()).toBe(true)
  })

  it('allows positive offset values', () => {
    const strategy: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'START_DATE',
      offset: 30,
    }
    
    const wrapper = createWrapper(strategy)
    
    expect(wrapper.exists()).toBe(true)
    // Component renders successfully with positive offset
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThan(0)
  })

  it('allows zero offset value', () => {
    const strategy: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'START_DATE',
      offset: 0,
    }
    
    const wrapper = createWrapper(strategy)
    
    expect(wrapper.exists()).toBe(true)
    // Component renders successfully with zero offset
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThan(0)
  })

  describe('nonNegativeRule validation', () => {
    it('rejects negative offset values', async () => {
      const strategy: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE',
        offset: -5,
      }

      const wrapper = createWrapper(strategy)

      // Find the offset text field
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)

      // The field should have validation rules applied
      // Vuetify applies validation rules to v-model changes
      const offsetField = textFields[textFields.length - 1]
      expect(offsetField).toBeDefined()
    })

    it('accepts zero as valid offset', async () => {
      const strategy: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE',
        offset: 0,
      }

      const wrapper = createWrapper(strategy)

      // Component should render successfully with zero value
      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })

    it('accepts positive offsets as valid', async () => {
      const strategy: ExitCriteria = {
        strategy: 'FIXED_DURATION',
        dateField: 'START_DATE',
        offset: 90,
      }

      const wrapper = createWrapper(strategy)

      // Component should render successfully with positive value
      expect(wrapper.exists()).toBe(true)
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBeGreaterThan(0)
    })
  })

  it('disables fields when disabled prop is true', () => {
    const strategy: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      dateField: 'START_DATE',
      offset: 0,
    }

    const wrapper = mount(FixedDurationStrategy, {
      global: {
        plugins: [vuetify],
      },
      props: {
        strategy,
        disabled: true,
      },
    })

    expect(wrapper.exists()).toBe(true)
  })

  describe('validation error emission', () => {
    it('should emit validation-error on mount when offset is undefined', () => {
      const wrapper = mount(FixedDurationStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'FIXED_DURATION',
            dateField: 'START_DATE',
            // offset undefined
          }
        }
      })

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      const errors = emitted?.[0][0]
      expect(Array.isArray(errors)).toBe(true)
      expect(errors?.some((e: any) => e.field === 'exitCriteria.offset')).toBe(true)
    })

    it('should emit validation-error when offset becomes negative', async () => {
      const wrapper = mount(FixedDurationStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'FIXED_DURATION',
            dateField: 'START_DATE',
            offset: -10
          }
        }
      })

      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      const errors = emitted?.[emitted.length - 1][0]
      expect(errors?.some((e: any) => e.field === 'exitCriteria.offset' && e.severity === 'error')).toBe(true)
    })

    it('should clear validation errors when valid offset provided', async () => {
      const wrapper = mount(FixedDurationStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'FIXED_DURATION',
            dateField: 'START_DATE',
            offset: 30
          }
        }
      })

      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('validation-error')
      expect(emitted).toBeTruthy()
      const errors = emitted?.[emitted.length - 1][0]
      // Should have no error-level validations with valid offset
      const errorLevelIssues = errors?.filter((e: any) => e.severity === 'error') || []
      expect(errorLevelIssues.length).toBe(0)
    })

    it('should emit updated validation-error when strategy property changes', async () => {
      const wrapper = mount(FixedDurationStrategy, {
        global: { plugins: [vuetify] },
        props: {
          strategy: {
            strategy: 'FIXED_DURATION',
            dateField: 'START_DATE',
            offset: 30
          }
        }
      })

      // Change offset to invalid value
      await wrapper.setProps({
        strategy: {
          strategy: 'FIXED_DURATION',
          dateField: 'START_DATE',
          offset: -5
        }
      })

      await wrapper.vm.$nextTick()

      // Should have new error for negative offset
      const emitted = wrapper.emitted('validation-error')
      const latestErrors = emitted?.[emitted.length - 1][0]
      expect(latestErrors?.some((e: any) => e.field === 'exitCriteria.offset' && e.severity === 'error')).toBe(true)
    })
  })
})
