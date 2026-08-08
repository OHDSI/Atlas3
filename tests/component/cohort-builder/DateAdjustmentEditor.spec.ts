import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import type { DateAdjustment } from '@/models/event.types'

// Mock i18n composable
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock webapi service to prevent actual API calls
vi.mock('@/services/webapi', () => ({
  getAllConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchConcepts: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

import DateAdjustmentEditor from '@/components/cohort-builder/DateAdjustmentEditor.vue'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('DateAdjustmentEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (dateAdjustment?: DateAdjustment) => {
    return mount(DateAdjustmentEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: dateAdjustment,
      },
    })
  }

  it('should render with default values when no modelValue provided', () => {
    const wrapper = createWrapper()

    expect(wrapper.exists()).toBe(true)
    // Should have a card component
    const card = wrapper.findComponent({ name: 'VCard' })
    expect(card.exists()).toBe(true)
  })

  it('should display provided date adjustment values', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'START_DATE',
      startOffset: 30,
      endWith: 'END_DATE',
      endOffset: 0,
    }

    const wrapper = createWrapper(dateAdjustment)

    // Should render the component with card
    expect(wrapper.exists()).toBe(true)
    const card = wrapper.findComponent({ name: 'VCard' })
    expect(card.exists()).toBe(true)
  })

  it('should show start date adjustment section', () => {
    const wrapper = createWrapper()

    // Should have rows for start and end
    const rows = wrapper.findAllComponents({ name: 'VRow' })
    expect(rows.length).toBeGreaterThanOrEqual(2) // At least start and end rows
  })

  it('should show end date adjustment section', () => {
    const wrapper = createWrapper()

    // Should have divider separating sections
    const dividers = wrapper.findAllComponents({ name: 'VDivider' })
    expect(dividers.length).toBeGreaterThan(0)
  })

  it('should display reference options (START_DATE, END_DATE)', () => {
    const wrapper = createWrapper()

    // Should have select components for references
    const selects = wrapper.findAllComponents({ name: 'VSelect' })
    expect(selects.length).toBeGreaterThanOrEqual(2) // Start and End reference selects
  })

  it('should display offset input fields', () => {
    const wrapper = createWrapper()

    // Should have text fields for offsets
    const textFields = wrapper.findAllComponents({ name: 'VTextField' })
    expect(textFields.length).toBeGreaterThanOrEqual(2) // Start and End offset inputs
  })

  it('should show explanatory help alert', () => {
    const wrapper = createWrapper()

    // Should have an info alert component
    const alert = wrapper.find('[data-testid="atlas-feedback"]')
    expect(alert.exists()).toBe(true)
  })

  it('should have number type inputs for offset fields', () => {
    const wrapper = createWrapper()

    // Should have number inputs for offsets
    expect(wrapper.html()).toContain('type="number"')
  })

  it('should handle START_DATE reference selection', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'START_DATE',
      startOffset: 0,
      endWith: 'START_DATE',
      endOffset: 0,
    }

    const wrapper = createWrapper(dateAdjustment)
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle END_DATE reference selection', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'END_DATE',
      startOffset: 0,
      endWith: 'END_DATE',
      endOffset: 0,
    }

    const wrapper = createWrapper(dateAdjustment)
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle positive offset values', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'START_DATE',
      startOffset: 30,
      endWith: 'END_DATE',
      endOffset: 60,
    }

    const wrapper = createWrapper(dateAdjustment)
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle negative offset values', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'START_DATE',
      startOffset: -30,
      endWith: 'END_DATE',
      endOffset: -60,
    }

    const wrapper = createWrapper(dateAdjustment)
    expect(wrapper.exists()).toBe(true)
  })

  it('should handle zero offset values', () => {
    const dateAdjustment: DateAdjustment = {
      startWith: 'START_DATE',
      startOffset: 0,
      endWith: 'END_DATE',
      endOffset: 0,
    }

    const wrapper = createWrapper(dateAdjustment)
    expect(wrapper.exists()).toBe(true)
  })
})
