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
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAllConceptSets: vi.fn().mockResolvedValue({ success: true, data: [] }),
  searchConcepts: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

import CensoringEventsEditor from '@/components/cohort-builder/CensoringEventsEditor.vue'
import type { CohortEvent, ConceptSetReference } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('CensoringEventsEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockConceptSets: ConceptSetReference[] = [
    { id: 1, name: 'Death Concepts' },
    { id: 2, name: 'Cancer Conditions' }
  ]

  const mockEvent: CohortEvent = {
    id: 'test-event-1',
    criteriaType: 'Death',
    attributes: [],
    conceptSet: { id: 1, name: 'Death Concepts' }
  }

  const createWrapper = (events: CohortEvent[] = []) => {
    return mount(CensoringEventsEditor, {
      global: {
        plugins: [vuetify],
      },
      props: {
        modelValue: events,
        conceptSets: mockConceptSets,
      },
    })
  }

  it('should render censoring events editor', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.censoring-events-editor').exists()).toBe(true)
  })

  it('should show empty state when no events', () => {
    const wrapper = createWrapper([])
    const hint = wrapper.find('.censoring-events__hint')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('No censoring events')
  })

  it('should display event cards when events exist', () => {
    const wrapper = createWrapper([mockEvent])

    const cards = wrapper.findAll('.event-card')
    expect(cards.length).toBe(1)
  })

  it('should show add censoring event button', () => {
    const wrapper = createWrapper()

    const addButton = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.text().includes('Add')
    )

    expect(addButton).toBeDefined()
  })

  it('should emit select-censoring-concept-set when add button is clicked', async () => {
    const wrapper = createWrapper()

    const addButton = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.text().includes('Add')
    )

    expect(addButton).toBeDefined()
    if (addButton) {
      await addButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('select-censoring-concept-set')).toBeTruthy()
    }
  })

  it('should emit remove-event when remove button is clicked', async () => {
    const wrapper = createWrapper([mockEvent])

    // Find remove button (close icon)
    const removeButton = wrapper.findAllComponents({ name: 'VBtn' }).find(btn =>
      btn.props('icon') === 'mdi-close'
    )

    expect(removeButton).toBeDefined()
    if (removeButton) {
      await removeButton.trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('remove-event')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    }
  })

  it('should show validation warning for invalid concept set', () => {
    const invalidEvent: CohortEvent = {
      id: 'test-event-2',
      criteriaType: 'ConditionOccurrence',
      attributes: [],
      conceptSet: { id: 999, name: 'Invalid Concept Set' }
    }

    const wrapper = createWrapper([invalidEvent])

    // Should show warning alert
    const alertEl = wrapper.find('[data-testid="atlas-feedback"]')
    expect(alertEl.exists()).toBe(true)
    expect(alertEl.text()).toContain('not found')
  })

  it('should format criteria type correctly', () => {
    const wrapper = createWrapper([mockEvent])

    // Check that "Death" is displayed
    expect(wrapper.text()).toContain('Death')
  })

  it('should display concept set name in chip', () => {
    const wrapper = createWrapper([mockEvent])

    const chip = wrapper.findComponent({ name: 'VChip' })
    expect(chip.exists()).toBe(true)
    expect(chip.text()).toContain('Death Concepts')
  })
})
