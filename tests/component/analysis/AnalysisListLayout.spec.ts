/**
 * AnalysisListLayout component tests
 *
 * Verifies the slot wiring (actions, filters, default body, pagination),
 * error banner emit, and view-mode toggle (visibility + emit).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import AnalysisListLayout from '@/components/analysis/AnalysisListLayout.vue'

describe('AnalysisListLayout', () => {
  let vuetify: ReturnType<typeof createVuetify>

  beforeEach(() => {
    vuetify = createVuetify({ components, directives })
  })

  it('renders all slots in the expected order', () => {
    const wrapper = mount(AnalysisListLayout, {
      global: { plugins: [vuetify] },
      slots: {
        actions: '<button class="t-action">New</button>',
        filters: '<div class="t-filters">filter</div>',
        default: '<div class="t-body">body</div>',
        pagination: '<div class="t-pagination">page</div>',
      },
    })

    expect(wrapper.find('.t-action').exists()).toBe(true)
    expect(wrapper.find('.t-filters').exists()).toBe(true)
    expect(wrapper.find('.t-body').exists()).toBe(true)
    expect(wrapper.find('.t-pagination').exists()).toBe(true)

    const html = wrapper.html()
    expect(html.indexOf('t-action')).toBeLessThan(html.indexOf('t-filters'))
    expect(html.indexOf('t-filters')).toBeLessThan(html.indexOf('t-body'))
    expect(html.indexOf('t-body')).toBeLessThan(html.indexOf('t-pagination'))
  })

  it('omits the filter and pagination rows when those slots are empty', () => {
    const wrapper = mount(AnalysisListLayout, {
      global: { plugins: [vuetify] },
      slots: { default: '<div class="t-body">body</div>' },
    })

    expect(wrapper.find('.analysis-list__pagination').exists()).toBe(false)
    expect(wrapper.find('.t-body').exists()).toBe(true)
  })

  it('renders the error banner when error prop is set and emits clear-error on close', async () => {
    const wrapper = mount(AnalysisListLayout, {
      props: { error: 'Boom', testid: 'foo' },
      global: { plugins: [vuetify] },
      slots: { default: '<div />' },
    })

    expect(wrapper.find('[data-testid="foo-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Boom')

    await wrapper.find('[data-testid="atlas-feedback-close"]').trigger('click')
    expect(wrapper.emitted('clear-error')).toBeTruthy()
  })

  it('hides the view-mode toggle by default', () => {
    const wrapper = mount(AnalysisListLayout, {
      global: { plugins: [vuetify] },
      slots: { default: '<div />' },
    })
    expect(wrapper.find('.analysis-list__view-toggle').exists()).toBe(false)
  })

  it('shows the view-mode toggle when showViewToggle is true and emits update:viewMode', async () => {
    const wrapper = mount(AnalysisListLayout, {
      props: { showViewToggle: true, viewMode: 'tile', testid: 'foo' },
      global: { plugins: [vuetify] },
      slots: { default: '<div />' },
    })

    const toggle = wrapper.find('[data-testid="foo-view-toggle"]')
    expect(toggle.exists()).toBe(true)

    await wrapper.find('[data-testid="foo-view-toggle-table"]').trigger('click')
    const updates = wrapper.emitted('update:viewMode')
    expect(updates).toBeTruthy()
    expect(updates?.[0]).toEqual(['table'])
  })
})
