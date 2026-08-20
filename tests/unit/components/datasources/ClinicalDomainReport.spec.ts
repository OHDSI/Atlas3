/**
 * ClinicalDomainReport Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import ClinicalDomainReport from '@/components/datasources/ClinicalDomainReport.vue'
import DomainPrevalenceTreemap from '@/components/datasources/DomainPrevalenceTreemap.vue'
import DomainPrevalenceTable from '@/components/datasources/DomainPrevalenceTable.vue'
import { useDataSourcesStore } from '@/stores/datasources'
import { getCDMDrilldown } from '@/services/report.service'
import type { ClinicalDomainReport as ClinicalDomainReportData } from '@/models/datasource.types'

vi.mock('@/services/report.service', () => ({
  getCDMDrilldown: vi.fn().mockResolvedValue({ success: true, data: {} }),
}))

// Mock the child components with props
vi.mock('@/components/datasources/DomainPrevalenceTreemap.vue', () => ({
  default: {
    name: 'DomainPrevalenceTreemap',
    template: '<div class="domain-prevalence-treemap"></div>',
    props: ['data']
  }
}))
vi.mock('@/components/datasources/DomainPrevalenceTable.vue', () => ({
  default: {
    name: 'DomainPrevalenceTable',
    template: '<div class="domain-prevalence-table"></div>',
    props: ['data', 'metricLabel']
  }
}))

// Mock useI18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback })
  })
}))

// Mock datasource formatters
vi.mock('@/utils/datasource-formatters', () => ({
  getMetricLabel: (reportType: string) => `Metric for ${reportType}`
}))

const vuetify = createVuetify({ components, directives })

const mockData: ClinicalDomainReportData = {
  prevalenceData: {
    treemapNodes: [
      { name: 'Concept 1', value: 100 },
      { name: 'Concept 2', value: 200 }
    ],
    tableRows: [
      { conceptId: 1, conceptName: 'Test Concept', personCount: 100, prevalence: 0.5, metric: 1.5 }
    ],
    totalCount: 100
  }
}

function mountComponent(props = {}) {
  return mount(ClinicalDomainReport, {
    props: {
      data: mockData,
      reportType: 'conditionOccurrence',
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('ClinicalDomainReport', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    // Pinia is required by useDataSourcesStore() inside the component.
    setActivePinia(createPinia())
    wrapper = mountComponent()
  })

  it('should mount without errors', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.clinical-domain-report').exists()).toBe(true)
  })

  it('should render tabs for treemap and table views', () => {
    const tabs = wrapper.findAllComponents({ name: 'VTab' })
    expect(tabs.length).toBe(2)
  })

  it('should render treemap by default', () => {
    const treemap = wrapper.findComponent(DomainPrevalenceTreemap)
    expect(treemap.exists()).toBe(true)
  })

  it('should pass correct data to treemap', () => {
    const treemap = wrapper.findComponent(DomainPrevalenceTreemap)
    expect(treemap.props('data')).toEqual(mockData.prevalenceData.treemapNodes)
  })

  it('should switch to table view when table tab is clicked', async () => {
    const tabs = wrapper.findAllComponents({ name: 'VTab' })
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(DomainPrevalenceTable)
    expect(table.exists()).toBe(true)
  })

  it('should pass correct data to table', async () => {
    const tabs = wrapper.findAllComponents({ name: 'VTab' })
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(DomainPrevalenceTable)
    expect(table.props('data')).toEqual(mockData.prevalenceData.tableRows)
  })

  it('should pass metric label to table', async () => {
    const tabs = wrapper.findAllComponents({ name: 'VTab' })
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(DomainPrevalenceTable)
    expect(table.props('metricLabel')).toBe('Metric for conditionOccurrence')
  })

  it('should accept different report types', () => {
    const wrapper2 = mountComponent({ reportType: 'drugExposure' })
    expect(wrapper2.exists()).toBe(true)
  })

  // Regression test for issue #151: the treemap view could trigger a
  // drill-down report on click, but the table view had no equivalent
  // wiring at all. row-click from DomainPrevalenceTable must reach the
  // same drill-down fetch as node-click from the treemap.
  it('fetches drilldown data when the table emits row-click (issue #151)', async () => {
    const store = useDataSourcesStore()
    store.sources = [
      { sourceId: 1, sourceName: 'Test Source', sourceKey: 'SYNPUF1K', sourceDialect: 'postgresql', daimons: [] },
    ]
    store.selectedSourceId = 1

    const tabs = wrapper.findAllComponents({ name: 'VTab' })
    await tabs[1].trigger('click')
    await wrapper.vm.$nextTick()

    const table = wrapper.findComponent(DomainPrevalenceTable)
    await table.vm.$emit('row-click', 1, 'Test Concept')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(getCDMDrilldown).toHaveBeenCalledWith('SYNPUF1K', 'condition', 1)
  })
})
