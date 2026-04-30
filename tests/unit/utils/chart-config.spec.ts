/**
 * Unit Test: chart-config utilities
 * Tests ECharts configuration helpers
 */
import { describe, it, expect, vi } from 'vitest'
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
import type {
  BarChartData as DatasourceBarChartData,
  PieChartData as DatasourcePieChartData,
  LineChartData as DatasourceLineChartData,
  MultiLineChartData as DatasourceMultiLineChartData
} from '@/models/datasource.types'

// Type helpers for accessing ECharts option properties in tests
interface ChartSeriesItem {
  type: string
  data: unknown[]
  name?: string
  smooth?: boolean
  symbol?: string
  symbolSize?: number
  sampling?: string
  radius?: string[]
  center?: string[]
  areaStyle?: {
    color?: {
      type: string
      colorStops: unknown[]
    }
  }
  itemStyle?: {
    color?: string
    borderRadius?: number[]
  }
  roam?: boolean
  top?: string
  visualMin?: number
  visualMax?: number
  visualDimension?: number
  colorMappingBy?: string
  color?: string[]
  breadcrumb?: {
    show?: boolean
    top?: string
  }
  children?: unknown[]
}

interface ChartAxisOption {
  data?: unknown[]
  name?: string
  axisLabel?: {
    rotate?: number
    interval?: number
    formatter?: (value: number) => string
  }
}

interface ChartLegendOption {
  data?: string[]
  orient?: string
  bottom?: string | number
  left?: string
  type?: string
}

interface ChartTitleOption {
  text?: string
}

interface ChartGridOption {
  top?: string
}

interface ChartTooltipOption {
  axisPointer?: {
    type?: string
  }
  trigger?: string
  formatter?: unknown
}

interface ChartDataZoomOption {
  type: string
}

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
      expect((options.series as ChartSeriesItem[])[0].type).toBe('bar')
      expect((options.series as ChartSeriesItem[])[0].data).toEqual([100, 150, 200])
    })

    it('should handle categories without unit', () => {
      const data: BarChartData = {
        categories: ['A', 'B'],
        values: [10, 20]
      }

      const options = defaultBarChartOptions(data)

      expect((options.yAxis as ChartAxisOption).name).toBe('Count')
    })

    it('should rotate labels for many categories', () => {
      const data: BarChartData = {
        categories: Array.from({ length: 15 }, (_, i) => `Cat${i}`),
        values: Array.from({ length: 15 }, () => 100)
      }

      const options = defaultBarChartOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(45)
    })

    it('should handle empty data arrays', () => {
      const data: BarChartData = {
        categories: [],
        values: []
      }

      const options = defaultBarChartOptions(data)

      expect((options.xAxis as ChartAxisOption).data).toEqual([])
      expect((options.series as ChartSeriesItem[])[0].data).toEqual([])
    })

    it('should use first color from palette', () => {
      const data: BarChartData = {
        categories: ['A'],
        values: [10]
      }

      const options = defaultBarChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].itemStyle?.color).toBe(CHART_COLORS[0])
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
      expect((options.title as ChartTitleOption).text).toBe('Gender Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('pie')
      expect((options.series as ChartSeriesItem[])[0].data).toHaveLength(2)
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
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ itemStyle: { color: string } }>

      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[1].itemStyle.color).toBe(CHART_COLORS[1])
      expect(seriesData[2].itemStyle.color).toBe(CHART_COLORS[2])
    })

    it('should handle empty data array', () => {
      const data: PieChartData[] = []

      const options = defaultPieChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].data).toEqual([])
      expect((options.legend as ChartLegendOption).data).toEqual([])
    })

    it('should cycle through colors for many items', () => {
      const data: PieChartData[] = Array.from({ length: 15 }, (_, i) => ({
        name: `Item${i}`,
        value: i + 1
      }))

      const options = defaultPieChartOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ itemStyle: { color: string } }>

      // Should wrap around color array (length is now 10, see chart-config CHART_COLORS)
      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[CHART_COLORS.length].itemStyle.color).toBe(CHART_COLORS[0])
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
      expect((options.title as ChartTitleOption).text).toBe('Monthly Trend')
      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect(options.yAxis).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('line')
      expect((options.series as ChartSeriesItem[])[0].data).toEqual([10, 20, 15])
      expect((options.series as ChartSeriesItem[])[0].smooth).toBe(true)
    })

    it('should include area style', () => {
      const data: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const options = defaultLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].areaStyle).toBeDefined()
    })

    it('should rotate labels for many data points', () => {
      const data: LineChartData = {
        xAxis: Array.from({ length: 25 }, (_, i) => `Point${i}`),
        yAxis: Array.from({ length: 25 }, () => 10)
      }

      const options = defaultLineChartOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(45)
    })

    it('should adjust grid top with title', () => {
      const dataWithTitle: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const dataWithoutTitle: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const optionsWithTitle = defaultLineChartOptions(dataWithTitle, 'Title')
      const optionsWithoutTitle = defaultLineChartOptions(dataWithoutTitle)

      expect((optionsWithTitle.grid as ChartGridOption).top).toBe('15%')
      expect((optionsWithoutTitle.grid as ChartGridOption).top).toBe('10%')
    })

    it('should handle numeric xAxis values', () => {
      const data: LineChartData = {
        xAxis: [1, 2, 3, 4, 5],
        yAxis: [10, 20, 15, 30, 25]
      }

      const options = defaultLineChartOptions(data)

      expect((options.xAxis as ChartAxisOption).data).toEqual([1, 2, 3, 4, 5])
    })

    it('should use default series name when not provided', () => {
      const data: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const options = defaultLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].name).toBe('Value')
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
      expect((options.title as ChartTitleOption).text).toBe('Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('treemap')
    })

    it('should drive treemap colors from a single-hue gradient based on value', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 }
      ]

      const options = defaultTreemapOptions(data)
      const series = (options.series as ChartSeriesItem[])[0] as { levels?: Array<{ color?: string[]; colorMappingBy?: string }>; visualMin?: number; visualMax?: number }

      // Atlas 2.15 semantic: nodes with higher values are darker; the
      // gradient is mapped onto the value range, not assigned per index.
      expect(series.levels?.[1]?.color).toBeDefined()
      expect(series.levels?.[1]?.color?.length).toBeGreaterThan(1)
      expect(series.levels?.[1]?.colorMappingBy).toBe('value')
      expect(series.visualMin).toBe(10)
      expect(series.visualMax).toBe(20)
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
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ children: unknown[] }>

      expect(seriesData[0].children).toBeDefined()
      expect(seriesData[0].children).toHaveLength(2)
    })

    it('should preserve existing colors in nodes', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 10, itemStyle: { color: '#FF0000' } }
      ]

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ itemStyle: { color: string } }>

      expect(seriesData[0].itemStyle.color).toBe('#FF0000')
    })

    it('should adjust positioning with title', () => {
      const dataWithTitle: TreemapNode[] = [{ name: 'A', value: 10 }]
      const dataWithoutTitle: TreemapNode[] = [{ name: 'A', value: 10 }]

      const optionsWithTitle = defaultTreemapOptions(dataWithTitle, 'Title')
      const optionsWithoutTitle = defaultTreemapOptions(dataWithoutTitle)

      expect((optionsWithTitle.series as ChartSeriesItem[])[0].top).toBe('15%')
      expect((optionsWithoutTitle.series as ChartSeriesItem[])[0].top).toBe('5%')
      expect((optionsWithTitle.series as ChartSeriesItem[])[0].breadcrumb?.top).toBe('10%')
      expect((optionsWithoutTitle.series as ChartSeriesItem[])[0].breadcrumb?.top).toBe('0%')
    })

    it('should handle empty data array', () => {
      const data: TreemapNode[] = []

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data

      expect(seriesData).toEqual([])
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

  // ============================================================================
  // Dashboard-specific Chart Configuration Tests
  // ============================================================================

  describe('dashboardGenderPieOptions', () => {
    it('should generate gender pie chart options', () => {
      const data: DatasourcePieChartData[] = [
        { name: 'Male', value: 5000 },
        { name: 'Female', value: 4500 },
        { name: 'Unknown', value: 500 }
      ]

      const options = dashboardGenderPieOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect((options.legend as ChartLegendOption).orient).toBe('horizontal')
      expect((options.legend as ChartLegendOption).bottom).toBe('5%')
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('pie')
      expect((options.series as ChartSeriesItem[])[0].name).toBe('Gender Distribution')
    })

    it('should assign colors to gender slices', () => {
      const data: DatasourcePieChartData[] = [
        { name: 'Male', value: 50 },
        { name: 'Female', value: 50 }
      ]

      const options = dashboardGenderPieOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ itemStyle: { color: string } }>

      expect(seriesData[0].itemStyle.color).toBe(CHART_COLORS[0])
      expect(seriesData[1].itemStyle.color).toBe(CHART_COLORS[1])
    })

    it('should handle empty data array', () => {
      const data: DatasourcePieChartData[] = []

      const options = dashboardGenderPieOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data

      expect(seriesData).toEqual([])
    })

    it('should configure donut radius', () => {
      const data: DatasourcePieChartData[] = [
        { name: 'Male', value: 50 }
      ]

      const options = dashboardGenderPieOptions(data)

      expect((options.series as ChartSeriesItem[])[0].radius).toEqual(['35%', '65%'])
    })

    it('should center the chart', () => {
      const data: DatasourcePieChartData[] = [
        { name: 'Male', value: 50 }
      ]

      const options = dashboardGenderPieOptions(data)

      expect((options.series as ChartSeriesItem[])[0].center).toEqual(['50%', '45%'])
    })
  })

  describe('dashboardAgeBarOptions', () => {
    it('should generate age bar chart options', () => {
      const data: DatasourceBarChartData = {
        categories: ['0-10', '11-20', '21-30', '31-40'],
        series: [
          { name: 'Male', data: [100, 200, 300, 400] },
          { name: 'Female', data: [90, 180, 290, 390] }
        ],
        unit: 'Persons'
      }

      const options = dashboardAgeBarOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect((options.xAxis as ChartAxisOption).name).toBe('Age Group')
      expect(options.yAxis).toBeDefined()
      expect((options.yAxis as ChartAxisOption).name).toBe('Persons')
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])).toHaveLength(2)
    })

    it('should rotate labels for many categories', () => {
      const data: DatasourceBarChartData = {
        categories: Array.from({ length: 15 }, (_, i) => `${i * 10}-${(i + 1) * 10}`),
        series: [{ name: 'Count', data: Array(15).fill(100) }]
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(45)
    })

    it('should assign colors to multiple series', () => {
      const data: DatasourceBarChartData = {
        categories: ['0-10', '11-20'],
        series: [
          { name: 'Male', data: [100, 200] },
          { name: 'Female', data: [90, 180] },
          { name: 'Unknown', data: [10, 20] }
        ]
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.series as ChartSeriesItem[])[0].itemStyle?.color).toBe(CHART_COLORS[0])
      expect((options.series as ChartSeriesItem[])[1].itemStyle?.color).toBe(CHART_COLORS[1])
      expect((options.series as ChartSeriesItem[])[2].itemStyle?.color).toBe(CHART_COLORS[2])
    })

    it('should use default unit when not provided', () => {
      const data: DatasourceBarChartData = {
        categories: ['0-10'],
        series: [{ name: 'Count', data: [100] }]
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.yAxis as ChartAxisOption).name).toBe('Person Count')
    })

    it('should handle empty series', () => {
      const data: DatasourceBarChartData = {
        categories: ['0-10', '11-20'],
        series: []
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.series as ChartSeriesItem[])).toEqual([])
    })

    it('should apply rounded corners to bars', () => {
      const data: DatasourceBarChartData = {
        categories: ['0-10'],
        series: [{ name: 'Count', data: [100] }]
      }

      const options = dashboardAgeBarOptions(data)

      expect((options.series as ChartSeriesItem[])[0].itemStyle?.borderRadius).toEqual([4, 4, 0, 0])
    })
  })

  describe('dashboardCumulativeLineOptions', () => {
    it('should generate cumulative observation line chart options', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020', '2021', '2022', '2023'],
        series: [
          { name: 'Cumulative', data: [10.5, 25.3, 50.8, 75.2] }
        ],
        xAxisLabel: 'Year',
        yAxisLabel: 'Percent of Persons'
      }

      const options = dashboardCumulativeLineOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect((options.xAxis as ChartAxisOption).name).toBe('Year')
      expect(options.yAxis).toBeDefined()
      expect((options.yAxis as ChartAxisOption).name).toBe('Percent of Persons')
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('line')
      expect((options.series as ChartSeriesItem[])[0].smooth).toBe(true)
    })

    it('should format y-axis as percentage', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020'],
        series: [{ name: 'Cumulative', data: [50] }]
      }

      const options = dashboardCumulativeLineOptions(data)
      const formatter = (options.yAxis as ChartAxisOption).axisLabel?.formatter

      expect(formatter?.(25)).toBe('25%')
      expect(formatter?.(100)).toBe('100%')
    })

    it('should use default labels when not provided', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020'],
        series: [{ name: 'Cumulative', data: [50] }]
      }

      const options = dashboardCumulativeLineOptions(data)

      expect((options.xAxis as ChartAxisOption).name).toBe('Year')
      expect((options.yAxis as ChartAxisOption).name).toBe('Percent of Persons')
    })

    it('should apply area gradient to series', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020'],
        series: [{ name: 'Cumulative', data: [50] }]
      }

      const options = dashboardCumulativeLineOptions(data)
      const areaStyle = (options.series as ChartSeriesItem[])[0].areaStyle

      expect(areaStyle).toBeDefined()
      expect(areaStyle?.color?.type).toBe('linear')
      expect(areaStyle?.color?.colorStops).toHaveLength(2)
    })

    it('should handle multiple series', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020', '2021'],
        series: [
          { name: 'Male', data: [10, 20] },
          { name: 'Female', data: [12, 22] }
        ]
      }

      const options = dashboardCumulativeLineOptions(data)

      expect((options.series as ChartSeriesItem[])).toHaveLength(2)
      expect((options.series as ChartSeriesItem[])[0].name).toBe('Male')
      expect((options.series as ChartSeriesItem[])[1].name).toBe('Female')
      expect((options.series as ChartSeriesItem[])[0].itemStyle?.color).toBe(CHART_COLORS[0])
      expect((options.series as ChartSeriesItem[])[1].itemStyle?.color).toBe(CHART_COLORS[1])
    })

    it('should handle empty series', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020'],
        series: []
      }

      const options = dashboardCumulativeLineOptions(data)

      expect((options.series as ChartSeriesItem[])).toEqual([])
    })
  })

  describe('dashboardObservationMonthLineOptions', () => {
    it('should generate observation by month line chart options', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020-01', '2020-02', '2020-03'],
        series: [
          { name: 'Observations', data: [1000, 1500, 2000] }
        ],
        xAxisLabel: 'Month',
        yAxisLabel: 'Observation Count'
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect((options.xAxis as ChartAxisOption).name).toBe('Month')
      expect(options.yAxis).toBeDefined()
      expect((options.yAxis as ChartAxisOption).name).toBe('Observation Count')
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].smooth).toBe(false)
    })

    it('should include data zoom controls', () => {
      const data: DatasourceLineChartData = {
        categories: Array.from({ length: 24 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}`),
        series: [{ name: 'Observations', data: Array(24).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect(options.dataZoom).toBeDefined()
      expect((options.dataZoom as ChartDataZoomOption[])).toHaveLength(2)
      expect((options.dataZoom as ChartDataZoomOption[])[0].type).toBe('inside')
      expect((options.dataZoom as ChartDataZoomOption[])[1].type).toBe('slider')
    })

    it('should rotate labels for many categories', () => {
      const data: DatasourceLineChartData = {
        categories: Array.from({ length: 30 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}`),
        series: [{ name: 'Observations', data: Array(30).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(45)
    })

    it('should not rotate labels for fewer categories', () => {
      const data: DatasourceLineChartData = {
        categories: Array.from({ length: 12 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}`),
        series: [{ name: 'Observations', data: Array(12).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(0)
    })

    it('should use default labels when not provided', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020-01'],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as ChartAxisOption).name).toBe('Month')
      expect((options.yAxis as ChartAxisOption).name).toBe('Observation Count')
    })

    it('should disable symbols for cleaner lines', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020-01'],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.series as ChartSeriesItem[])[0].symbol).toBe('none')
    })

    it('should use LTTB sampling', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020-01'],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.series as ChartSeriesItem[])[0].sampling).toBe('lttb')
    })

    it('should calculate label interval based on category count', () => {
      const data: DatasourceLineChartData = {
        categories: Array.from({ length: 36 }, (_, i) => `2020-${String(i + 1).padStart(2, '0')}`),
        series: [{ name: 'Observations', data: Array(36).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)
      const interval = (options.xAxis as ChartAxisOption).axisLabel?.interval

      expect(interval).toBeGreaterThanOrEqual(0)
    })
  })

  describe('multiLineChartOptions', () => {
    it('should generate multi-line chart options', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020', '2021', '2022'],
        series: [
          { name: 'Condition', data: [100, 200, 300] },
          { name: 'Drug', data: [150, 250, 350] },
          { name: 'Procedure', data: [80, 180, 280] }
        ]
      }

      const options = multiLineChartOptions(data)

      expect(options.tooltip).toBeDefined()
      expect((options.tooltip as ChartTooltipOption).axisPointer?.type).toBe('cross')
      expect(options.legend).toBeDefined()
      expect((options.legend as ChartLegendOption).data).toEqual(['Condition', 'Drug', 'Procedure'])
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])).toHaveLength(3)
    })

    it('should use scrollable legend', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020'],
        series: [
          { name: 'Series 1', data: [100] },
          { name: 'Series 2', data: [200] }
        ]
      }

      const options = multiLineChartOptions(data)

      expect((options.legend as ChartLegendOption).type).toBe('scroll')
      expect((options.legend as ChartLegendOption).bottom).toBe(0)
      expect((options.legend as ChartLegendOption).left).toBe('center')
    })

    it('should assign colors to all series', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020'],
        series: [
          { name: 'Series 1', data: [100] },
          { name: 'Series 2', data: [200] },
          { name: 'Series 3', data: [300] }
        ]
      }

      const options = multiLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].itemStyle?.color).toBe(CHART_COLORS[0])
      expect((options.series as ChartSeriesItem[])[1].itemStyle?.color).toBe(CHART_COLORS[1])
      expect((options.series as ChartSeriesItem[])[2].itemStyle?.color).toBe(CHART_COLORS[2])
    })

    it('should enable smooth lines', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020'],
        series: [{ name: 'Series 1', data: [100] }]
      }

      const options = multiLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].smooth).toBe(true)
    })

    it('should rotate labels for many categories', () => {
      const data: DatasourceMultiLineChartData = {
        categories: Array.from({ length: 30 }, (_, i) => `Cat${i}`),
        series: [{ name: 'Series 1', data: Array(30).fill(100) }]
      }

      const options = multiLineChartOptions(data)

      expect((options.xAxis as ChartAxisOption).axisLabel?.rotate).toBe(45)
    })

    it('should handle empty series array', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020'],
        series: []
      }

      const options = multiLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])).toEqual([])
      expect((options.legend as ChartLegendOption).data).toEqual([])
    })

    it('should use small symbols for data points', () => {
      const data: DatasourceMultiLineChartData = {
        categories: ['2020'],
        series: [{ name: 'Series 1', data: [100] }]
      }

      const options = multiLineChartOptions(data)

      expect((options.series as ChartSeriesItem[])[0].symbol).toBe('circle')
      expect((options.series as ChartSeriesItem[])[0].symbolSize).toBe(4)
    })
  })

  describe('clinicalDomainTreemapOptions', () => {
    it('should generate clinical domain treemap options', () => {
      const data: TreemapNode[] = [
        { name: 'Condition', value: 1000 },
        { name: 'Drug', value: 800 },
        { name: 'Procedure', value: 600 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])[0].type).toBe('treemap')
      expect((options.series as ChartSeriesItem[])[0].data).toEqual(data)
    })

    it('should enable roaming for navigation', () => {
      const data: TreemapNode[] = [
        { name: 'Condition', value: 1000 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].roam).toBe(true)
    })

    it('should configure visual mapping', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 100 },
        { name: 'B', value: 500 },
        { name: 'C', value: 1000 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].visualMin).toBe(100)
      expect((options.series as ChartSeriesItem[])[0].visualMax).toBe(1000)
      expect((options.series as ChartSeriesItem[])[0].visualDimension).toBe(0)
      expect((options.series as ChartSeriesItem[])[0].colorMappingBy).toBe('value')
    })

    it('should use blue color gradient', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 100 }
      ]

      const options = clinicalDomainTreemapOptions(data)
      const colors = (options.series as ChartSeriesItem[])[0].color

      expect(colors).toHaveLength(5)
      expect(colors?.[0]).toMatch(/^#/) // Light blue
      expect(colors?.[4]).toMatch(/^#/) // Dark blue
    })

    it('should handle nested treemap data', () => {
      const data: TreemapNode[] = [
        {
          name: 'Parent',
          value: 1000,
          children: [
            { name: 'Child 1', value: 600 },
            { name: 'Child 2', value: 400 }
          ]
        }
      ]

      const options = clinicalDomainTreemapOptions(data)

      // Should calculate min/max across all nested values
      expect((options.series as ChartSeriesItem[])[0].visualMin).toBe(400)
      expect((options.series as ChartSeriesItem[])[0].visualMax).toBe(1000)
    })

    it('should handle empty data array', () => {
      const data: TreemapNode[] = []

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].data).toEqual([])
      expect((options.series as ChartSeriesItem[])[0].visualMin).toBe(0)
      expect((options.series as ChartSeriesItem[])[0].visualMax).toBe(0)
    })

    it('should handle single value', () => {
      const data: TreemapNode[] = [
        { name: 'Only', value: 500 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].visualMin).toBe(500)
      expect((options.series as ChartSeriesItem[])[0].visualMax).toBe(500)
    })

    it('should extract all values from deeply nested structure', () => {
      const data: TreemapNode[] = [
        {
          name: 'Level 1',
          value: 1000,
          children: [
            {
              name: 'Level 2',
              value: 500,
              children: [
                { name: 'Level 3', value: 250 }
              ]
            }
          ]
        }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].visualMin).toBe(250)
      expect((options.series as ChartSeriesItem[])[0].visualMax).toBe(1000)
    })

    it('should show breadcrumb navigation', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 100 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.series as ChartSeriesItem[])[0].breadcrumb?.show).toBe(true)
      expect((options.series as ChartSeriesItem[])[0].breadcrumb?.top).toBe('0%')
    })

    it('should configure tooltip with prevalence and metric fields', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 100 }
      ]

      const options = clinicalDomainTreemapOptions(data)

      expect((options.tooltip as ChartTooltipOption).trigger).toBe('item')
      expect((options.tooltip as ChartTooltipOption).formatter).toBeDefined()
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
