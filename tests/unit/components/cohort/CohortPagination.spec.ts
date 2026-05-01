/**
 * CohortPagination Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import CohortPagination from '@/components/cohort/CohortPagination.vue'

// Mock dependencies
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key)
  })
}))

const vuetify = createVuetify({ components, directives })

const defaultProps = {
  page: 1,
  itemsPerPage: 10,
  itemsPerPageOptions: [10, 25, 50, 100],
  totalItems: 100,
  rangeDisplay: '1-10 of 100'
}

function mountComponent(props = {}) {
  return mount(CohortPagination, {
    props: {
      ...defaultProps,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('CohortPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render pagination controls', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.cohort-pagination').exists()).toBe(true)
  })

  it('should display range information', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('1-10 of 100')
  })

  it('should render items per page selector', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VSelect' }).exists()).toBe(true)
  })

  it('should emit update:items-per-page when select changes', async () => {
    const wrapper = mountComponent()

    const select = wrapper.findComponent({ name: 'VSelect' })
    await select.vm.$emit('update:modelValue', 25)

    expect(wrapper.emitted('update:items-per-page')).toBeTruthy()
    expect(wrapper.emitted('update:items-per-page')![0]).toEqual([25])
  })

  it('should render Vuetify v-pagination when there is more than one page', () => {
    // Refresh: hand-rolled prev/next buttons replaced with v-pagination
    // (numbered pages, ellipses, keyboard nav for free).
    const wrapper = mountComponent({ totalItems: 100, itemsPerPage: 10 })

    expect(wrapper.findComponent({ name: 'VPagination' }).exists()).toBe(true)
  })

  it('should not render v-pagination when there is only one page', () => {
    const wrapper = mountComponent({ totalItems: 5, itemsPerPage: 10 })

    expect(wrapper.findComponent({ name: 'VPagination' }).exists()).toBe(false)
  })

  it('should emit update:page when v-pagination changes page', async () => {
    const wrapper = mountComponent({ totalItems: 100, itemsPerPage: 10 })

    const pagination = wrapper.findComponent({ name: 'VPagination' })
    await pagination.vm.$emit('update:modelValue', 3)

    expect(wrapper.emitted('update:page')).toBeTruthy()
    expect(wrapper.emitted('update:page')![0]).toEqual([3])
  })

  it('should have aria-live for range display', () => {
    const wrapper = mountComponent()

    const range = wrapper.find('.cohort-pagination__range')
    expect(range.attributes('aria-live')).toBe('polite')
    expect(range.attributes('role')).toBe('status')
  })
})
