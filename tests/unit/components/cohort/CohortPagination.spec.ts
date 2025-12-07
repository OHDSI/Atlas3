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
  canGoPrevious: false,
  canGoNext: true,
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

  it('should disable previous button when canGoPrevious is false', () => {
    const wrapper = mountComponent({ canGoPrevious: false })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const prevBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-left')

    expect(prevBtn?.props('disabled')).toBe(true)
  })

  it('should enable previous button when canGoPrevious is true', () => {
    const wrapper = mountComponent({ canGoPrevious: true })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const prevBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-left')

    expect(prevBtn?.props('disabled')).toBe(false)
  })

  it('should disable next button when canGoNext is false', () => {
    const wrapper = mountComponent({ canGoNext: false })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const nextBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-right')

    expect(nextBtn?.props('disabled')).toBe(true)
  })

  it('should enable next button when canGoNext is true', () => {
    const wrapper = mountComponent({ canGoNext: true })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const nextBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-right')

    expect(nextBtn?.props('disabled')).toBe(false)
  })

  it('should emit previous when previous button clicked', async () => {
    const wrapper = mountComponent({ canGoPrevious: true })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const prevBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-left')

    await prevBtn?.trigger('click')

    expect(wrapper.emitted('previous')).toBeTruthy()
  })

  it('should emit next when next button clicked', async () => {
    const wrapper = mountComponent({ canGoNext: true })

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const nextBtn = buttons.find(btn => btn.props('icon') === 'mdi-chevron-right')

    await nextBtn?.trigger('click')

    expect(wrapper.emitted('next')).toBeTruthy()
  })

  it('should have aria-live for range display', () => {
    const wrapper = mountComponent()

    const range = wrapper.find('.cohort-pagination__range')
    expect(range.attributes('aria-live')).toBe('polite')
    expect(range.attributes('role')).toBe('status')
  })
})
