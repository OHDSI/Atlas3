/**
 * CDMSummaryTable Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CDMSummaryTable from '@/components/datasources/shared/CDMSummaryTable.vue'

// Mock i18n
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => fallback
  })
}))

// Mock formatters
vi.mock('@/utils/datasource-formatters', () => ({
  formatNumber: vi.fn((num: number) => num.toLocaleString())
}))

const vuetify = createVuetify({ components, directives })

const mockData = {
  sourceName: 'Test Database',
  personCount: 1234567
}

function mountComponent(props = {}) {
  return mount(CDMSummaryTable, {
    props: {
      data: mockData,
      ...props
    },
    global: {
      plugins: [vuetify]
    }
  })
}

describe('CDMSummaryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render as a card', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'SurfaceCard' }).exists()).toBe(true)
    expect(wrapper.find('.cdm-summary-table').exists()).toBe(true)
  })

  it('should display card title', () => {
    const wrapper = mountComponent()

    const title = wrapper.find('.cdm-summary-table__title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('CDM Summary')
  })

  it('should render table', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VTable' }).exists()).toBe(true)
  })

  it('should display source name row', () => {
    const wrapper = mountComponent()

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBeGreaterThanOrEqual(2)

    const sourceNameRow = rows[0]
    expect(sourceNameRow.text()).toContain('Source Name')
    expect(sourceNameRow.text()).toContain('Test Database')
  })

  it('should display person count row', () => {
    const wrapper = mountComponent()

    const rows = wrapper.findAll('tbody tr')
    const personCountRow = rows[1]
    expect(personCountRow.text()).toContain('Number of People')
    expect(personCountRow.text()).toContain('1,234,567')
  })

  it('should format person count using formatNumber utility', async () => {
    const formatNumberMock = vi.mocked(await import('@/utils/datasource-formatters')).formatNumber
    const _wrapper = mountComponent()

    expect(formatNumberMock).toHaveBeenCalledWith(1234567)
  })

  it('should display different source data', () => {
    const customData = {
      sourceName: 'Custom Source',
      personCount: 9876543
    }
    const wrapper = mountComponent({ data: customData })

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('Custom Source')
    expect(rows[1].text()).toContain('9,876,543')
  })

  it('should have comfortable table density', () => {
    const wrapper = mountComponent()

    const table = wrapper.findComponent({ name: 'VTable' })
    expect(table.props('density')).toBe('comfortable')
  })

  it('should render two table rows', () => {
    const wrapper = mountComponent()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
  })

  it('should have font-weight-medium on label cells', () => {
    const wrapper = mountComponent()

    const labelCells = wrapper.findAll('tbody tr td:first-child')
    labelCells.forEach(cell => {
      expect(cell.classes()).toContain('font-weight-medium')
    })
  })
})
