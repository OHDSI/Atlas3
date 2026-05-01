/**
 * ChartSection Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ChartSection from '@/components/datasources/shared/ChartSection.vue'

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}, slots = {}) {
  return mount(ChartSection, {
    props: {
      title: 'Test Chart',
      ...props
    },
    slots,
    global: {
      plugins: [vuetify]
    }
  })
}

describe('ChartSection', () => {
  it('should render as a card', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'SurfaceCard' }).exists()).toBe(true)
    expect(wrapper.find('.chart-section').exists()).toBe(true)
  })

  it('should display title', () => {
    const wrapper = mountComponent({ title: 'Age Distribution' })

    const title = wrapper.find('.chart-section__title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Age Distribution')
  })

  it('should show skeleton loader when loading', () => {
    const wrapper = mountComponent({ loading: true })

    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
    expect(wrapper.find('.chart-section__content').exists()).toBe(false)
  })

  it('should show error alert when error exists', () => {
    const wrapper = mountComponent({ error: 'Failed to load data' })

    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.exists()).toBe(true)
    expect(alert.props('type')).toBe('error')
    expect(alert.text()).toBe('Failed to load data')
  })

  it('should show content when not loading and no error', () => {
    const wrapper = mountComponent(
      { loading: false, error: null },
      { default: '<div class="test-content">Chart Content</div>' }
    )

    expect(wrapper.find('.chart-section__content').exists()).toBe(true)
    expect(wrapper.find('.test-content').exists()).toBe(true)
  })

  it('should render slot content', () => {
    const wrapper = mountComponent(
      {},
      { default: '<div class="chart-placeholder">My Chart</div>' }
    )

    expect(wrapper.find('.chart-placeholder').exists()).toBe(true)
    expect(wrapper.text()).toContain('My Chart')
  })

  it('should not show skeleton loader when not loading', () => {
    const wrapper = mountComponent({ loading: false })

    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(false)
  })

  it('should not show error alert when no error', () => {
    const wrapper = mountComponent({ error: null })

    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
  })

  it('should apply default loading prop as false', () => {
    const wrapper = mountComponent({ title: 'Test' })

    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(false)
    expect(wrapper.find('.chart-section__content').exists()).toBe(true)
  })

  it('should apply default error prop as null', () => {
    const wrapper = mountComponent({ title: 'Test' })

    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
  })

  it('should have skeleton loader height of 300', () => {
    const wrapper = mountComponent({ loading: true })

    const loader = wrapper.findComponent({ name: 'VSkeletonLoader' })
    expect(loader.props('height')).toBe('300')
  })

  it('should have skeleton loader type of image', () => {
    const wrapper = mountComponent({ loading: true })

    const loader = wrapper.findComponent({ name: 'VSkeletonLoader' })
    expect(loader.props('type')).toBe('image')
  })

  it('should have error alert variant of tonal', () => {
    const wrapper = mountComponent({ error: 'Test error' })

    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.props('variant')).toBe('tonal')
  })

  it('should prioritize error over loading state', () => {
    const wrapper = mountComponent({ loading: true, error: 'Error occurred' })

    // When both loading and error are true, v-else-if should show error
    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('should show content only when not loading and no error', () => {
    const wrapper = mountComponent(
      { loading: false, error: null },
      { default: '<div>Content</div>' }
    )

    expect(wrapper.find('.chart-section__content').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
  })
})
