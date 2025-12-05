/**
 * Unit Test: chart-config utilities
 * Tests ECharts configuration helpers
 */
import { describe, it, expect } from 'vitest'
import {
  CHART_COLORS,
  defaultBarChartOptions,
  defaultPieChartOptions,
  defaultLineChartOptions,
  defaultTreemapOptions,
  createResizeHandler,
  getExportConfig,
  dashboardGenderPieOptions,
  dashboardAgeBarOptions,
  dashboardCumulativeLineOptions,
  dashboardObservationMonthLineOptions,
  multiLineChartOptions,
  clinicalDomainTreemapOptions
} from '@/utils/chart-config'
import type { BarChartData, PieChartData, LineChartData, TreemapNode } from '@/models/report.types'

describe('chart-config', () => {
  describe('CHART_COLORS', () => {
    it('should export an array of color codes', () => {
      expect(Array.isArray(CHART_COLORS)).toBe(true)
      expect(CHART_COLORS.length).toBeGreaterThan(0)
      expect(CHART_COLORS[0]).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })

  describe('defaultBarChartOptions', () => {
    it('should generate valid bar chart options', () => {
      const data: BarChartData = {
        categories: ['2020', '2021', '2022'],
        values: [100, 150, 200],
        unit: 'Patients'
      }

      const options = defaultBarChartOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect(options.yAxis).toBeDefined()
      expect(options.series).toBeDefined()
      expect(Array.isArray(options.series)).toBe(true)
      expect((options.series as unknown)[0].type).toBe('bar')
      expect((options.series as unknown)[0].data).toEqual([100, 150, 200])
    })

    it('should handle categories without unit', () => {
      const data: BarChartData = {
        categories: ['A', 'B'],
        values: [10, 20]
      }

      const options = defaultBarChartOptions(data)

      expect((options.yAxis as unknown).name).toBe('Count')
    })

    it('should rotate labels for many categories', () => {
      const data: BarChartData = {
        categories: Array.from({ length: 15 }, (_, i) => `Cat${i}`),
        values: Array.from({ length: 15 }, () => 100)
      }

      const options = defaultBarChartOptions(data)

      expect((options.xAxis as unknown).axisLabel.rotate).toBe(45)
    })
  })

  describe('defaultPieChartOptions', () => {
    it('should generate valid pie chart options', () => {
      const data: PieChartData[] = [
        { name: 'Male', value: 60 },
        { name: 'Female', value: 40 }
      ]

      const options = defaultPieChartOptions(data, 'Gender Distribution')

      expect(options.title).toBeDefined()
      expect((options.title as unknown).text).toBe('Gender Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as unknown)[0].type).toBe('pie')
      expect((options.series as unknown)[0].data).toHaveLength(2)
    })

    it('should work without title', () => {
      const data: PieChartData[] = [
        { name: 'A', value: 10 }
      ]

      const options = defaultPieChartOptions(data)

      expect(options.title).toBeUndefined()
    })

    it('should assign colors to pie slices', () => {
      const data: PieChartData[] = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 30 }
      ]

      const options = defaultPieChartOptions(data)
      const seriesData = (options.series as unknown)[0].data

      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[1].itemStyle.color).toBe(CHART_COLORS[1])
      expect(seriesData[2].itemStyle.color).toBe(CHART_COLORS[2])
    })
  })

  describe('defaultLineChartOptions', () => {
    it('should generate valid line chart options', () => {
      const data: LineChartData = {
        xAxis: ['Jan', 'Feb', 'Mar'],
        yAxis: [10, 20, 15],
        seriesName: 'Trend'
      }

      const options = defaultLineChartOptions(data, 'Monthly Trend')

      expect(options.title).toBeDefined()
      expect((options.title as unknown).text).toBe('Monthly Trend')
      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect(options.yAxis).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as unknown)[0].type).toBe('line')
      expect((options.series as unknown)[0].data).toEqual([10, 20, 15])
      expect((options.series as unknown)[0].smooth).toBe(true)
    })

    it('should include area style', () => {
      const data: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const options = defaultLineChartOptions(data)

      expect((options.series as unknown)[0].areaStyle).toBeDefined()
    })

    it('should rotate labels for many data points', () => {
      const data: LineChartData = {
        xAxis: Array.from({ length: 25 }, (_, i) => `Point${i}`),
        yAxis: Array.from({ length: 25 }, () => 10)
      }

      const options = defaultLineChartOptions(data)

      expect((options.xAxis as unknown).axisLabel.rotate).toBe(45)
    })
  })

  describe('defaultTreemapOptions', () => {
    it('should generate valid treemap options', () => {
      const data: TreemapNode[] = [
        { name: 'Category A', value: 100 },
        { name: 'Category B', value: 200 }
      ]

      const options = defaultTreemapOptions(data, 'Distribution')

      expect(options.title).toBeDefined()
      expect((options.title as unknown).text).toBe('Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as unknown)[0].type).toBe('treemap')
    })

    it('should assign colors to treemap nodes', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 }
      ]

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as unknown)[0].data

      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[1].itemStyle.color).toBe(CHART_COLORS[1])
    })

    it('should handle hierarchical data', () => {
      const data: TreemapNode[] = [
        {
          name: 'Parent',
          value: 100,
          children: [
            { name: 'Child 1', value: 50 },
            { name: 'Child 2', value: 50 }
          ]
        }
      ]

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as unknown)[0].data

      expect(seriesData[0].children).toBeDefined()
      expect(seriesData[0].children).toHaveLength(2)
    })
  })

  describe('createResizeHandler', () => {
    it('should return a function', () => {
      const mockChart = {
        resize: vi.fn(),
        isDisposed: () => false
      }

      const handler = createResizeHandler(mockChart)

      expect(typeof handler).toBe('function')
    })

    it('should debounce resize calls', async () => {
      vi.useFakeTimers()

      const mockChart = {
        resize: vi.fn(),
        isDisposed: () => false
      }

      const handler = createResizeHandler(mockChart, 100)

      // Call multiple times quickly
      handler()
      handler()
      handler()

      // Should not have been called yet
      expect(mockChart.resize).not.toHaveBeenCalled()

      // Fast forward time
      vi.advanceTimersByTime(100)

      // Should have been called once
      expect(mockChart.resize).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })

    it('should not resize disposed chart', async () => {
      vi.useFakeTimers()

      const mockChart = {
        resize: vi.fn(),
        isDisposed: () => true
      }

      const handler = createResizeHandler(mockChart)

      handler()

      vi.advanceTimersByTime(150)

      expect(mockChart.resize).not.toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('should use custom debounce time', async () => {
      vi.useFakeTimers()

      const mockChart = {
        resize: vi.fn(),
        isDisposed: () => false
      }

      const handler = createResizeHandler(mockChart, 300)

      handler()

      vi.advanceTimersByTime(299)
      expect(mockChart.resize).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(mockChart.resize).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('getExportConfig', () => {
    it('should return default export config', () => {
      const config = getExportConfig()

      expect(config.backgroundColor).toBe('#ffffff')
      expect(config.pixelRatio).toBe(2)
      expect(config.excludeComponents).toContain('toolbox')
    })

    it('should accept custom background color', () => {
      const config = getExportConfig('#000000')

      expect(config.backgroundColor).toBe('#000000')
      expect(config.pixelRatio).toBe(2)
    })
  })
})

describe('Dashboard-specific Chart Configurations', () => {
  describe('dashboardGenderPieOptions', () => {
    it('should generate gender pie chart configuration', () => {
      const data = [
        { name: 'Male', value: 5500 },
        { name: 'Female', value: 4500 }
      ]

      const options = dashboardGenderPieOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as any)[0].type).toBe('pie')
      expect((options.series as any)[0].radius).toEqual(['35%', '65%'])
    })

    it('should assign colors to gender data', () => {
      const data = [
        { name: 'Male', value: 100 },
        { name: 'Female', value: 100 },
        { name: 'Unknown', value: 10 }
      ]

      const options = dashboardGenderPieOptions(data)
      const seriesData = (options.series as any)[0].data

      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[1].itemStyle.color).toBe(CHART_COLORS[1])
      expect(seriesData[2].itemStyle.color).toBe(CHART_COLORS[2])
    })
  })

  describe('dashboardAgeBarOptions', () => {
    it('should generate age bar chart configuration', () => {
      const data = {
        categories: ['0-9', '10-19', '20-29', '30-39'],
        series: [{ name: 'Count', data: [100, 200, 300, 250] }],
        unit: 'Persons'
      }

      const options = dashboardAgeBarOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect(options.yAxis).toBeDefined()
      expect((options.yAxis as any).name).toBe('Persons')
    })

    it('should rotate labels for many age groups', () => {
      const data = {
        categories: Array.from({ length: 15 }, (_, i) => `${i * 10}-${i * 10 + 9}`),
        series: [{ name: 'Count', data: Array.from({ length: 15 }, () => 100) }]
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.xAxis as any).axisLabel.rotate).toBe(45)
    })

    it('should handle multiple series', () => {
      const data = {
        categories: ['0-9', '10-19'],
        series: [
          { name: 'Male', data: [50, 60] },
          { name: 'Female', data: [45, 55] }
        ],
        unit: 'Count'
      }

      const options = dashboardAgeBarOptions(data)
      const series = options.series as any[]

      expect(series).toHaveLength(2)
      expect(series[0].name).toBe('Male')
      expect(series[1].name).toBe('Female')
      expect(series[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(series[1].itemStyle.color).toBe(CHART_COLORS[1])
    })
  })

  describe('dashboardCumulativeLineOptions', () => {
    it('should generate cumulative line chart configuration', () => {
      const data = {
        categories: ['2018', '2019', '2020', '2021'],
        series: [{ name: 'Cumulative %', data: [25, 50, 75, 100] }],
        xAxisLabel: 'Year',
        yAxisLabel: 'Percentage'
      }

      const options = dashboardCumulativeLineOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect((options.xAxis as any).name).toBe('Year')
      expect((options.yAxis as any).name).toBe('Percentage')
    })

    it('should format y-axis as percentage', () => {
      const data = {
        categories: ['2020'],
        series: [{ name: 'Data', data: [50] }]
      }

      const options = dashboardCumulativeLineOptions(data)
      const formatter = (options.yAxis as any).axisLabel.formatter

      expect(formatter(50)).toBe('50%')
      expect(formatter(100)).toBe('100%')
    })

    it('should handle multiple series with area styles', () => {
      const data = {
        categories: ['2020', '2021'],
        series: [
          { name: 'Series A', data: [25, 50] },
          { name: 'Series B', data: [30, 60] }
        ]
      }

      const options = dashboardCumulativeLineOptions(data)
      const series = options.series as any[]

      expect(series).toHaveLength(2)
      expect(series[0].areaStyle).toBeDefined()
      expect(series[1].areaStyle).toBeDefined()
      expect(series[0].smooth).toBe(true)
    })
  })

  describe('dashboardObservationMonthLineOptions', () => {
    it('should generate observation month line chart configuration', () => {
      const data = {
        categories: ['2020-01', '2020-02', '2020-03'],
        series: [{ name: 'Observations', data: [1000, 1200, 1100] }],
        xAxisLabel: 'Month',
        yAxisLabel: 'Count'
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.dataZoom).toBeDefined()
      expect((options.dataZoom as any)).toHaveLength(2)
    })

    it('should rotate labels for many months', () => {
      const data = {
        categories: Array.from({ length: 30 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}`),
        series: [{ name: 'Data', data: Array.from({ length: 30 }, () => 1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as any).axisLabel.rotate).toBe(45)
    })

    it('should include data zoom controls', () => {
      const data = {
        categories: ['2020-01'],
        series: [{ name: 'Data', data: [100] }]
      }

      const options = dashboardObservationMonthLineOptions(data)
      const dataZoom = options.dataZoom as any[]

      expect(dataZoom[0].type).toBe('inside')
      expect(dataZoom[1].type).toBe('slider')
    })
  })

  describe('multiLineChartOptions', () => {
    it('should generate multi-line chart configuration', () => {
      const data = {
        categories: ['2020', '2021', '2022'],
        series: [
          { name: 'Metric A', data: [100, 150, 200] },
          { name: 'Metric B', data: [80, 120, 160] }
        ]
      }

      const options = multiLineChartOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect((options.legend as any).type).toBe('scroll')
      expect((options.series as any[])).toHaveLength(2)
    })

    it('should assign colors to multiple series', () => {
      const data = {
        categories: ['2020'],
        series: [
          { name: 'A', data: [10] },
          { name: 'B', data: [20] },
          { name: 'C', data: [30] }
        ]
      }

      const options = multiLineChartOptions(data)
      const series = options.series as any[]

      expect(series[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(series[1].itemStyle.color).toBe(CHART_COLORS[1])
      expect(series[2].itemStyle.color).toBe(CHART_COLORS[2])
    })

    it('should rotate labels for many categories', () => {
      const data = {
        categories: Array.from({ length: 30 }, (_, i) => `Cat${i}`),
        series: [{ name: 'Data', data: Array.from({ length: 30 }, () => 10) }]
      }

      const options = multiLineChartOptions(data)

      expect((options.xAxis as any).axisLabel.rotate).toBe(45)
    })
  })

  describe('clinicalDomainTreemapOptions', () => {
    it('should generate clinical domain treemap configuration', () => {
      const data = [
        { name: 'Conditions', value: 5000 },
        { name: 'Procedures', value: 3000 },
        { name: 'Drugs', value: 2000 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as any)[0].type).toBe('treemap')
    })

    it('should handle hierarchical data with prevalence', () => {
      const data = [
        {
          name: 'Domain A',
          value: 1000,
          prevalence: 10.5,
          children: [
            { name: 'Sub A1', value: 600, prevalence: 6.0 },
            { name: 'Sub A2', value: 400, prevalence: 4.5 }
          ]
        }
      ]

      const options = clinicalDomainTreemapOptions(data)
      const series = (options.series as any)[0]

      expect(series.data[0].children).toHaveLength(2)
    })

    it('should configure visual mapping for prevalence', () => {
      const data = [
        { name: 'Low', value: 10 },
        { name: 'Medium', value: 50 },
        { name: 'High', value: 100 }
      ]

      const options = clinicalDomainTreemapOptions(data)
      const series = (options.series as any)[0]

      expect(series.visualMin).toBe(10)
      expect(series.visualMax).toBe(100)
      expect(series.colorMappingBy).toBe('value')
    })

    it('should handle empty data gracefully', () => {
      const data: any[] = []

      const options = clinicalDomainTreemapOptions(data)
      const series = (options.series as any)[0]

      expect(series.visualMin).toBe(0)
      expect(series.visualMax).toBe(0)
    })

    it('should enable zoom and interaction', () => {
      const data = [{ name: 'Item', value: 100 }]

      const options = clinicalDomainTreemapOptions(data)
      const series = (options.series as any)[0]

      expect(series.roam).toBe(true)
      expect(series.nodeClick).toBe('zoomToNode')
    })
  })
})
