/**
 * CohortBuilder Component Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CohortBuilder from '@/components/cohort/CohortBuilder.vue'
import { useCohortStore } from '@/stores/cohort'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('CohortBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const createWrapper = (props = {}) => {
    return mount(CohortBuilder, {
      props,
      global: {
        plugins: [vuetify],
        stubs: {
          'router-link': true,
        },
      },
    })
  }

  it('should render cohort builder', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.v-container').exists()).toBe(true)
  })

  it('should initialize new cohort on mount when no id provided', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const store = useCohortStore()
    expect(store.currentCohort).not.toBeNull()
  })

  it('should render CohortMetadata component', () => {
    const wrapper = createWrapper()
    const metadata = wrapper.findComponent({ name: 'CohortMetadata' })
    expect(metadata.exists()).toBe(true)
  })

  it('should render EntryEventsList component', () => {
    const wrapper = createWrapper()
    const eventsList = wrapper.findComponent({ name: 'EntryEventsList' })
    expect(eventsList.exists()).toBe(true)
  })

  it('should render ConceptSetSelector component', () => {
    const wrapper = createWrapper()
    const selector = wrapper.findComponent({ name: 'ConceptSetSelector' })
    expect(selector.exists()).toBe(true)
  })

  it('should have save button', () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.v-btn')
    const saveButton = buttons.find(btn => btn.text().includes('Save'))
    expect(saveButton).toBeTruthy()
  })

  it('should have cancel button', () => {
    const wrapper = createWrapper()
    const buttons = wrapper.findAll('.v-btn')
    const cancelButton = buttons.find(btn => btn.text().includes('Cancel'))
    expect(cancelButton).toBeTruthy()
  })

  it('should disable save button when no name or events', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAll('.v-btn')
    const saveButton = buttons.find(btn => btn.text().includes('Save'))

    if (saveButton) {
      // Initially disabled (no events yet)
      expect(saveButton.attributes('disabled')).toBeDefined()
    }
  })
})
