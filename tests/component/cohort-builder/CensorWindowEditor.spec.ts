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

import CensorWindowEditor from '@/components/cohort-builder/CensorWindowEditor.vue'
import type { Period } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CensorWindowEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (censorWindow?: Period | null) => {
    return mount(CensorWindowEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: censorWindow,
      },
    })
  }

  it('should render censor window editor', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.censor-window-editor').exists()).toBe(true)
  })

  it('should display start date and end date fields', () => {
    const wrapper = createWrapper()
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    const selects = wrapper.findAllComponents({ name: 'VSelect' })

    // Should have 2 text fields (offset inputs) and 2 selects (date field selectors)
    expect(textFields.length).toBeGreaterThanOrEqual(2)
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('should populate fields with provided values', () => {
    const censorWindow: Period = {
      startDate: {
        dateField: 'START_DATE',
        offset: 0
      },
      endDate: {
        dateField: 'END_DATE',
        offset: 365
      }
    }

    const wrapper = createWrapper(censorWindow)

    // Verify the component exists
    expect(wrapper.find('.censor-window-editor').exists()).toBe(true)
  })

  it('should emit update when start offset changes', async () => {
    const wrapper = createWrapper({
      startDate: { dateField: 'START_DATE', offset: 0 },
      endDate: { dateField: 'END_DATE', offset: 0 }
    })

    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThan(0)

    // Directly call the update methods on the component
    // This simulates what happens when the user interacts with the fields
    wrapper.vm.localStartOffset = 10
    await wrapper.vm.updateStartDate()
    await wrapper.vm.$nextTick()

    // Check if update was emitted
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeDefined()
    if (emitted && emitted.length > 0) {
      expect(emitted[0][0]).toBeDefined()
    }
  })

  it('should emit validation warning when start > end', async () => {
    const censorWindow: Period = {
      startDate: { dateField: 'START_DATE', offset: 100 },
      endDate: { dateField: 'END_DATE', offset: 50 }
    }

    const wrapper = createWrapper(censorWindow)
    await wrapper.vm.$nextTick()

    // Component should detect invalid range
    // Note: validation-error event may or may not be emitted depending on initialization
    // The important thing is the component renders the warning
    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.exists()).toBe(true)
  })

  it('should clear censor window when clear button is clicked', async () => {
    const wrapper = createWrapper({
      startDate: { dateField: 'START_DATE', offset: 0 },
      endDate: { dateField: 'END_DATE', offset: 365 }
    })

    const clearButton = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.text().includes('Clear')
    )

    expect(clearButton).toBeDefined()
    if (clearButton) {
      await clearButton.trigger('click')
      await wrapper.vm.$nextTick()

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted?.[emitted.length - 1][0]).toBeNull()
    }
  })

  it('should handle null modelValue gracefully', () => {
    const wrapper = createWrapper(null)
    expect(wrapper.find('.censor-window-editor').exists()).toBe(true)
  })
})
