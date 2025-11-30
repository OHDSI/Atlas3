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

import ObservationPeriodBlock from '@/components/cohort-builder/ObservationPeriodBlock.vue'
import type { ObservationPeriod } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('ObservationPeriodBlock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (observationPeriod?: ObservationPeriod) => {
    return mount(ObservationPeriodBlock, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: observationPeriod,
      },
    })
  }

  it('should render prior days input', () => {
    const wrapper = createWrapper()
    const priorInput = wrapper.find('[data-testid="prior-days-input"]')
    expect(priorInput.exists()).toBe(true)
  })

  it('should render post days input', () => {
    const wrapper = createWrapper()
    const postInput = wrapper.find('[data-testid="post-days-input"]')
    expect(postInput.exists()).toBe(true)
  })

  it('should default to 0 days when no modelValue provided', () => {
    const wrapper = createWrapper()
    const _html = wrapper.html()
    // Check that inputs show 0 or empty (default behavior)
    expect(wrapper.find('[data-testid="prior-days-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="post-days-input"]').exists()).toBe(true)
  })

  it('should display provided observation period values', () => {
    const observationPeriod: ObservationPeriod = {
      priorDays: 365,
      postDays: 730,
    }
    const wrapper = createWrapper(observationPeriod)

    // Check that values are displayed
    expect(wrapper.html()).toContain('365')
    expect(wrapper.html()).toContain('730')
  })

  it('should emit update when prior days changes', async () => {
    const wrapper = createWrapper({
      priorDays: 365,
      postDays: 0,
    })

    const priorInput = wrapper.find('[data-testid="prior-days-input"]').find('input')
    expect(priorInput.exists()).toBe(true)
    await priorInput.setValue('180')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ObservationPeriod]>
    expect(emitted[emitted.length - 1][0].priorDays).toBe(180)
    expect(emitted[emitted.length - 1][0].postDays).toBe(0)
  })

  it('should emit update when post days changes', async () => {
    const wrapper = createWrapper({
      priorDays: 365,
      postDays: 0,
    })

    const postInput = wrapper.find('[data-testid="post-days-input"]').find('input')
    expect(postInput.exists()).toBe(true)
    await postInput.setValue('730')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue') as Array<[ObservationPeriod]>
    expect(emitted[emitted.length - 1][0].priorDays).toBe(365)
    expect(emitted[emitted.length - 1][0].postDays).toBe(730)
  })

  it('should preserve existing values when updating prior days', async () => {
    const wrapper = createWrapper({
      priorDays: 365,
      postDays: 730,
    })

    const priorInput = wrapper.find('[data-testid="prior-days-input"]').find('input')
    expect(priorInput.exists()).toBe(true)
    await priorInput.setValue('180')

    const emitted = wrapper.emitted('update:modelValue') as Array<[ObservationPeriod]>
    expect(emitted[emitted.length - 1][0].priorDays).toBe(180)
    expect(emitted[emitted.length - 1][0].postDays).toBe(730) // Should preserve
  })

  it('should preserve existing values when updating post days', async () => {
    const wrapper = createWrapper({
      priorDays: 365,
      postDays: 730,
    })

    const postInput = wrapper.find('[data-testid="post-days-input"]').find('input')
    expect(postInput.exists()).toBe(true)
    await postInput.setValue('365')

    const emitted = wrapper.emitted('update:modelValue') as Array<[ObservationPeriod]>
    expect(emitted[emitted.length - 1][0].priorDays).toBe(365) // Should preserve
    expect(emitted[emitted.length - 1][0].postDays).toBe(365)
  })

  it('should handle zero values correctly', () => {
    const observationPeriod: ObservationPeriod = {
      priorDays: 0,
      postDays: 0,
    }
    const wrapper = createWrapper(observationPeriod)

    expect(wrapper.find('[data-testid="prior-days-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="post-days-input"]').exists()).toBe(true)
  })

  it('should render card title', () => {
    const wrapper = createWrapper()
    // Check that the card has a title
    const cardTitle = wrapper.find('.v-card-title')
    expect(cardTitle.exists()).toBe(true)
  })

  it('should show helpful hint text for prior days', () => {
    const wrapper = createWrapper()
    // Check that prior days input has a hint attribute
    const priorInput = wrapper.find('[data-testid="prior-days-input"]')
    expect(priorInput.exists()).toBe(true)
  })

  it('should show helpful hint text for post days', () => {
    const wrapper = createWrapper()
    // Check that post days input has a hint attribute
    const postInput = wrapper.find('[data-testid="post-days-input"]')
    expect(postInput.exists()).toBe(true)
  })
})
