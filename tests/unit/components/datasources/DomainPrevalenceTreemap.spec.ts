/**
 * DomainPrevalenceTreemap Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DomainPrevalenceTreemap from '@/components/datasources/DomainPrevalenceTreemap.vue'
import type { TreemapNode } from '@/models/datasource.types'

// Mock child components
vi.mock('@/components/ui/charts/AtlasTreemapChart.vue', () => ({
  default: {
    name: 'AtlasTreemapChart',
    template: '<div class="treemap-chart"></div>',
    props: ['data', 'height'],
    emits: ['node-click']
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const vuetify = createVuetify({ components, directives })

const mockData: TreemapNode[] = [
  {
    name: 'Category 1',
    value: 1000,
    children: [
      { name: 'Concept 1', value: 500 },
      { name: 'Concept 2', value: 500 }
    ]
  },
  {
    name: 'Category 2',
    value: 800,
    children: [
      { name: 'Concept 3', value: 400 },
      { name: 'Concept 4', value: 400 }
    ]
  }
]

function mountComponent(props = {}) {
  return mount(DomainPrevalenceTreemap, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [createPinia(), vuetify]
    }
  })
}

describe('DomainPrevalenceTreemap', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.domain-prevalence-treemap').exists()).toBe(true)
  })

  it('should render TreemapChart component', () => {
    const treemapChart = wrapper.findComponent({ name: 'AtlasTreemapChart' })
    expect(treemapChart.exists()).toBe(true)
  })

  it('should pass data prop to TreemapChart', () => {
    const treemapChart = wrapper.findComponent({ name: 'AtlasTreemapChart' })
    expect(treemapChart.props('data')).toEqual(mockData)
  })

  it('should render chart with correct height', () => {
    const treemapChart = wrapper.findComponent({ name: 'AtlasTreemapChart' })
    expect(treemapChart.props('height')).toBe(500)
  })

  it('should display instructions hint', () => {
    const hint = wrapper.find('.treemap-controls__hint')
    expect(hint.exists()).toBe(true)
  })

  it('should show click instructions in hint', () => {
    const hint = wrapper.find('.treemap-controls__hint')
    const hintText = hint.text()
    expect(hintText).toContain('Click')
    expect(hintText).toContain('detailed analytics')
  })

  it('should render information icon in hint', () => {
    const icon = wrapper.findComponent({ name: 'VIcon' })
    expect(icon.exists()).toBe(true)
    expect(icon.props('icon')).toBeTruthy()
  })

  it('should handle node click events', async () => {
    const treemapChart = wrapper.findComponent({ name: 'AtlasTreemapChart' })
    const mockEvent = new MouseEvent('click')
    const mockNode: TreemapNode = { name: 'Test Node', value: 100 }

    await treemapChart.vm.$emit('node-click', mockEvent, mockNode)

    // The component logs the click but doesn't do anything else
    expect(treemapChart.emitted('node-click')).toBeTruthy()
  })

  it('should accept empty data array', () => {
    const wrapper2 = mountComponent({ data: [] })
    const treemapChart = wrapper2.findComponent({ name: 'AtlasTreemapChart' })
    expect(treemapChart.props('data')).toEqual([])
  })

  it('should handle nodes without children', () => {
    const flatData: TreemapNode[] = [
      { name: 'Node 1', value: 100 },
      { name: 'Node 2', value: 200 }
    ]
    const wrapper2 = mountComponent({ data: flatData })
    const treemapChart = wrapper2.findComponent({ name: 'AtlasTreemapChart' })
    expect(treemapChart.props('data')).toEqual(flatData)
  })

  it('groups concepts without a classification under one Unclassified node', () => {
    const pathData: TreemapNode[] = [
      { name: 'Knee arthroscopy', value: 30, conceptId: 1, conceptPath: 'Procedure on joint||Arthroscopy||Knee arthroscopy' },
      { name: 'Hip arthroscopy', value: 20, conceptId: 2, conceptPath: 'Procedure on joint||Arthroscopy||Hip arthroscopy' },
      { name: 'CPT 99213', value: 50, conceptId: 3, conceptPath: 'NA||NA||CPT 99213' },
      { name: 'ICD9 00.10', value: 5, conceptId: 4, conceptPath: 'NA||NA||ICD9 00.10' },
    ]
    const wrapper2 = mountComponent({ data: pathData })
    const data = wrapper2.findComponent({ name: 'AtlasTreemapChart' }).props('data') as TreemapNode[]

    expect(data.map(n => n.name)).toEqual(['Procedure on joint', 'Unclassified'])
    const unclassified = data[1]!
    expect(unclassified.value).toBe(55)
    expect(unclassified.children?.map(n => n.conceptId)).toEqual([3, 4])
    expect(data[0]!.value).toBe(50)
  })

  it('should have controls section for better layout', () => {
    const controls = wrapper.find('.treemap-controls')
    expect(controls.exists()).toBe(true)
  })
})
