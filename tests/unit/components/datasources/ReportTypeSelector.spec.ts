/**
 * ReportTypeSelector Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ReportTypeSelector from '@/components/datasources/ReportTypeSelector.vue'
import { REPORT_TYPE_LABELS, type ReportType } from '@/models/datasource.types'

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}) {
  return mount(ReportTypeSelector, {
    props: {
      modelValue: null,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('ReportTypeSelector', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
  })

  it('should render v-select component', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.exists()).toBe(true)
  })

  it('should render chart-bar icon', () => {
    const icon = wrapper.findComponent({ name: 'VIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('icon')).toBe('mdi-chart-bar')
  })

  it('should generate items from REPORT_TYPE_LABELS', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items')

    const expectedLength = Object.keys(REPORT_TYPE_LABELS).length
    expect(items).toHaveLength(expectedLength)
  })

  it('should include all report types in items', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items')

    const reportTypes: ReportType[] = [
      'dashboard',
      'datadensity',
      'person',
      'visit',
      'conditionOccurrence',
      'conditionEra',
      'procedure',
      'drugExposure',
      'drugEra',
      'measurement',
      'observation',
      'observationPeriod',
      'death'
    ]

    const itemValues = items.map((item: { value: string }) => item.value)
    reportTypes.forEach(type => {
      expect(itemValues).toContain(type)
    })
  })

  it('should format items with label and value', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items')

    items.forEach((item: { label: string; value: string }) => {
      expect(item).toHaveProperty('label')
      expect(item).toHaveProperty('value')
      expect(typeof item.label).toBe('string')
      expect(typeof item.value).toBe('string')
    })
  })

  it('should bind modelValue prop correctly', () => {
    const wrapper2 = mountComponent({ modelValue: 'dashboard' })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('modelValue')).toBe('dashboard')
  })

  it('should emit update:modelValue when selection changes', async () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    await select.vm.$emit('update:modelValue', 'person')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['person'])
  })

  it('should be disabled when disabled prop is true', () => {
    const wrapper2 = mountComponent({ disabled: true })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('disabled')).toBe(true)
  })

  it('should not be disabled by default', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('disabled')).toBe(false)
  })

  it('should use outlined variant', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('variant')).toBe('outlined')
  })

  it('should use compact density', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('density')).toBe('compact')
  })

  it('should hide details', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('hideDetails')).toBe(true)
  })

  it('should accept null as modelValue', () => {
    const wrapper2 = mountComponent({ modelValue: null })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('modelValue')).toBeNull()
  })

  it('should accept valid report types', () => {
    const reportTypes: ReportType[] = ['dashboard', 'person', 'death']

    reportTypes.forEach(type => {
      const wrapper2 = mountComponent({ modelValue: type })
      const select = wrapper2.findComponent({ name: 'VSelect' })
      expect(select.props('modelValue')).toBe(type)
    })
  })

  it('should map report type labels correctly', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items')

    const dashboardItem = items.find((item: { value: string }) => item.value === 'dashboard')
    expect(dashboardItem.label).toBe(REPORT_TYPE_LABELS.dashboard)

    const personItem = items.find((item: { value: string }) => item.value === 'person')
    expect(personItem.label).toBe(REPORT_TYPE_LABELS.person)
  })

  it('should use item-title and item-value props correctly', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('itemTitle')).toBe('label')
    expect(select.props('itemValue')).toBe('value')
  })
})
