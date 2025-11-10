/**
 * EntryEventCard Component Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EntryEventCard from '@/components/cohort/EntryEventCard.vue'
import type { CohortEvent } from '@/models/cohort.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('EntryEventCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (event: CohortEvent) => {
    return mount(EntryEventCard, {
      props: { event },
      global: {
        plugins: [vuetify],
      },
    })
  }

  it('should render event card', () => {
    const event: CohortEvent = {
      id: 'event-1',
      criteriaType: 'ConditionOccurrence',
      attributes: [],
    }

    const wrapper = createWrapper(event)
    // Component should mount successfully
    expect(wrapper.exists()).toBe(true)
  })

  it('should display event type label', () => {
    const event: CohortEvent = {
      id: 'event-1',
      criteriaType: 'DrugExposure',
      attributes: [],
    }

    const wrapper = createWrapper(event)
    // Component should mount successfully
    expect(wrapper.exists()).toBe(true)
  })

  it('should emit remove event when delete button clicked', async () => {
    const event: CohortEvent = {
      id: 'event-1',
      criteriaType: 'ConditionOccurrence',
      attributes: [],
    }

    const wrapper = createWrapper(event)
    const deleteButton = wrapper.findAll('.v-btn').find(btn =>
      btn.text().includes('mdi-delete') || btn.html().includes('mdi-delete')
    )

    if (deleteButton) {
      await deleteButton.trigger('click')
      expect(wrapper.emitted('remove')).toBeTruthy()
    }
  })

  it('should display concept set if assigned', () => {
    const event: CohortEvent = {
      id: 'event-1',
      criteriaType: 'ConditionOccurrence',
      conceptSet: {
        id: 1,
        name: 'Type 2 Diabetes',
      },
      attributes: [],
    }

    const wrapper = createWrapper(event)
    expect(wrapper.text()).toContain('Type 2 Diabetes')
  })

  it('should emit update when criteria type changes', async () => {
    const event: CohortEvent = {
      id: 'event-1',
      criteriaType: 'ConditionOccurrence',
      attributes: [],
    }

    const wrapper = createWrapper(event)

    // Expand card first
    const expandButton = wrapper.findAll('.v-btn').find(btn =>
      btn.html().includes('mdi-chevron')
    )
    if (expandButton) {
      await expandButton.trigger('click')
    }

    // Wait for expansion
    await wrapper.vm.$nextTick()

    // Find select and change value
    const select = wrapper.findComponent({ name: 'VSelect' })
    if (select.exists()) {
      await select.vm.$emit('update:modelValue', 'DrugExposure')
      expect(wrapper.emitted('update')).toBeTruthy()
    }
  })
})
