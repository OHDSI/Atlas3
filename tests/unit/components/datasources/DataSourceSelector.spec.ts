/**
 * DataSourceSelector Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourceSelector from '@/components/datasources/DataSourceSelector.vue'
import type { DataSource } from '@/models/datasource.types'

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

const vuetify = createVuetify({ components, directives })

const mockDataSources: DataSource[] = [
  {
    sourceId: 1,
    sourceName: 'Test Source 1',
    sourceKey: 'test1',
    sourceDialect: 'postgresql',
    daimons: []
  },
  {
    sourceId: 2,
    sourceName: 'Test Source 2',
    sourceKey: 'test2',
    sourceDialect: 'postgresql',
    daimons: []
  }
]

function mountComponent(props = {}) {
  return mount(DataSourceSelector, {
    props: {
      modelValue: null,
      dataSources: mockDataSources,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('DataSourceSelector', () => {
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

  it('should render database icon', () => {
    const icon = wrapper.findComponent({ name: 'VIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('icon')).toBe('mdi-database')
  })

  it('should pass data sources as items', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    const items = select.props('items')

    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ label: 'Test Source 1', value: 1 })
    expect(items[1]).toEqual({ label: 'Test Source 2', value: 2 })
  })

  it('should bind modelValue prop correctly', () => {
    const wrapper2 = mountComponent({ modelValue: 1 })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('modelValue')).toBe(1)
  })

  it('should emit update:modelValue when selection changes', async () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    await select.vm.$emit('update:modelValue', 2)

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([2])
  })

  it('should be disabled when loading prop is true', () => {
    const wrapper2 = mountComponent({ loading: true })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('disabled')).toBe(true)
  })

  it('should show loading state', () => {
    const wrapper2 = mountComponent({ loading: true })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('loading')).toBe(true)
  })

  it('should be disabled when disabled prop is true', () => {
    const wrapper2 = mountComponent({ disabled: true })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('disabled')).toBe(true)
  })

  it('should handle empty data sources array', () => {
    const wrapper2 = mountComponent({ dataSources: [] })
    const select = wrapper2.findComponent({ name: 'VSelect' })
    expect(select.props('items')).toEqual([])
  })

  it('should use outlined variant', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('variant')).toBe('outlined')
  })

  it('should use comfortable density', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('density')).toBe('comfortable')
  })

  it('should hide details', () => {
    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.props('hideDetails')).toBe(true)
  })
})
