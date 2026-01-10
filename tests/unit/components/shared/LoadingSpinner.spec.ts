/**
 * LoadingSpinner Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LoadingSpinner from '@/components/shared/LoadingSpinner.vue'

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(LoadingSpinner, {
    props,
    global: {
      plugins: [vuetify]
    }
  })
}

describe('LoadingSpinner', () => {
  it('should render progress circular', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.v-progress-circular').exists()).toBe(true)
  })

  it('should apply default size', () => {
    const wrapper = mountComponent()

    const spinner = wrapper.findComponent({ name: 'VProgressCircular' })
    expect(spinner.exists()).toBe(true)
  })

  it('should apply custom size', () => {
    const wrapper = mountComponent({ size: 64 })

    const spinner = wrapper.findComponent({ name: 'VProgressCircular' })
    expect(spinner.props('size')).toBe(64)
  })

  it('should apply custom width', () => {
    const wrapper = mountComponent({ width: 6 })

    const spinner = wrapper.findComponent({ name: 'VProgressCircular' })
    expect(spinner.props('width')).toBe(6)
  })

  it('should not show message when not provided', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('should show message when provided', () => {
    const wrapper = mountComponent({ message: 'Loading data...' })

    const message = wrapper.find('p')
    expect(message.exists()).toBe(true)
    expect(message.text()).toBe('Loading data...')
  })

  it('should have loading-spinner class', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.loading-spinner').exists()).toBe(true)
  })

  it('should be indeterminate', () => {
    const wrapper = mountComponent()

    const spinner = wrapper.findComponent({ name: 'VProgressCircular' })
    expect(spinner.props('indeterminate')).toBe(true)
  })
})
