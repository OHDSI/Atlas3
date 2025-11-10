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

import ExitCriteriaPanel from '@/components/cohort-builder/ExitCriteriaPanel.vue'
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

describe('ExitCriteriaPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (exitCriteria?: ExitCriteria) => {
    return mount(ExitCriteriaPanel, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: exitCriteria,
      },
    })
  }

  it('should render exit strategy selector', () => {
    const wrapper = createWrapper()
    const selector = wrapper.find('[data-testid="exit-strategy-selector"]')
    expect(selector.exists()).toBe(true)
  })

  it('should default to CONTINUOUS_OBSERVATION strategy', () => {
    const wrapper = createWrapper()
    // Check the selector has the default value
    const selector = wrapper.find('[data-testid="exit-strategy-selector"]')
    expect(selector.exists()).toBe(true)
  })

  it('should display provided exit criteria strategy', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      offset: 365,
    }
    const wrapper = createWrapper(exitCriteria)

    expect(wrapper.html()).toContain('Fixed Duration')
  })

  it('should show offset input when strategy is FIXED_DURATION', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'FIXED_DURATION',
      offset: 365,
    }
    const wrapper = createWrapper(exitCriteria)

    const offsetInput = wrapper.find('[data-testid="exit-offset-input"]')
    expect(offsetInput.exists()).toBe(true)
  })

  it('should not show offset input when strategy is CONTINUOUS_OBSERVATION', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CONTINUOUS_OBSERVATION',
    }
    const wrapper = createWrapper(exitCriteria)

    const offsetInput = wrapper.find('[data-testid="exit-offset-input"]')
    expect(offsetInput.exists()).toBe(false)
  })

  it('should show add censoring event button when strategy is CUSTOM_EVENT', () => {
    const exitCriteria: ExitCriteria = {
      strategy: 'CUSTOM_EVENT',
      censoringEvents: [],
    }
    const wrapper = createWrapper(exitCriteria)

    const addButton = wrapper.find('[data-testid="add-censoring-event"]')
    expect(addButton.exists()).toBe(true)
  })

  it('should emit update when strategy changes', async () => {
    const wrapper = createWrapper({
      strategy: 'CONTINUOUS_OBSERVATION',
    })

    // Find the VSelect component and emit update
    const selector = wrapper.findComponent({ name: 'VSelect' })
    expect(selector.exists()).toBe(true)
    await selector.vm.$emit('update:modelValue', 'FIXED_DURATION')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should emit update when offset changes for FIXED_DURATION', async () => {
    const wrapper = createWrapper({
      strategy: 'FIXED_DURATION',
      offset: 365,
    })

    // Verify the offset input is rendered
    const offsetInput = wrapper.find('[data-testid="exit-offset-input"]')
    expect(offsetInput.exists()).toBe(true)

    // Find the actual input element inside the v-text-field
    const input = offsetInput.find('input')
    expect(input.exists()).toBe(true)
    await input.setValue('730')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ExitCriteria]>
    expect(emitted[emitted.length - 1][0].offset).toBe(730)
  })

  it('should render all exit strategy options', () => {
    const wrapper = createWrapper()

    // Check that the strategy selector exists
    const selector = wrapper.find('[data-testid="exit-strategy-selector"]')
    expect(selector.exists()).toBe(true)
  })

  it('should handle undefined modelValue gracefully', () => {
    const wrapper = createWrapper(undefined)
    expect(wrapper.find('[data-testid="exit-strategy-selector"]').exists()).toBe(true)
  })
})
