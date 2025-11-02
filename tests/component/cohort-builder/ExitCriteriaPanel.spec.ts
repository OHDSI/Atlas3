import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
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
    expect(wrapper.html()).toContain('Continuous Observation')
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

    // Simulate strategy change (implementation will emit update)
    await wrapper.find('[data-testid="exit-strategy-selector"]').trigger('update:modelValue', 'FIXED_DURATION')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('should emit update when offset changes for FIXED_DURATION', async () => {
    const wrapper = createWrapper({
      strategy: 'FIXED_DURATION',
      offset: 365,
    })

    const offsetInput = wrapper.find('[data-testid="exit-offset-input"]')
    await offsetInput.trigger('update:modelValue', '730')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ExitCriteria]>
    expect(emitted[0][0].offset).toBe(730)
  })

  it('should render all exit strategy options', () => {
    const wrapper = createWrapper()

    // Check that all strategy options are available
    const html = wrapper.html()
    expect(html).toContain('Continuous Observation')
    expect(html).toContain('Fixed Duration')
    expect(html).toContain('Custom Event')
  })

  it('should handle undefined modelValue gracefully', () => {
    const wrapper = createWrapper(undefined)
    expect(wrapper.find('[data-testid="exit-strategy-selector"]').exists()).toBe(true)
  })
})
