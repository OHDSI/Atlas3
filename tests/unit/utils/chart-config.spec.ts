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
  clinicalDomainTreemapOptions,
  trellisChartOptions,
  boxPlotChartOptions,
} from '@/ui/chart-config'
import type { BarChartData, PieChartData, LineChartData, TreemapNode, TrellisChartData, BoxPlotData } from '@/models/report.types'
import type {
  HistogramChartData as DatasourceHistogramChartData,
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
  type?: string
  min?: number
  max?: number
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

      // Grid uses absolute pixel values now (was '15%' / '10%') so
      // the chart title and y-axis name don't overlap with the
      // chart area when stacked vertically.
      expect((optionsWithTitle.grid as ChartGridOption).top).toBe(80)
      expect((optionsWithoutTitle.grid as ChartGridOption).top).toBe(56)
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

    it('should color treemap nodes from a single-hue gradient by value', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 }
      ]

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data as Array<{ value: number; itemStyle?: { color?: string } }>

      // Atlas 2.15 semantic: higher value → darker color from a
      // single-hue gradient (light blue → navy). Both nodes get a
      // hex color; the lower-value node's color is the lighter end
      // of the gradient and the higher-value node's is the darker.
      expect(seriesData[0].itemStyle?.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(seriesData[1].itemStyle?.color).toMatch(/^#[0-9a-f]{6}$/i)

      // Lower-value tile is somewhere between the lightest stop and
      // the mid stop (FLOOR of 0.15 prevents it tinting near-white
      // against the page background). Higher-value tile is the
      // darkest stop (Atlas brand navy).
      const lightHex = seriesData[0].itemStyle?.color?.toLowerCase() ?? ''
      const darkHex = seriesData[1].itemStyle?.color?.toLowerCase() ?? ''
      // Convert to numeric for ordering checks.
      const toInt = (h: string) => parseInt(h.replace('#', ''), 16)
      expect(toInt(lightHex)).toBeGreaterThan(toInt(darkHex))
      expect(darkHex).toBe('#1f425a')
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

      // The series.top still reserves room for the title.
      expect((optionsWithTitle.series as ChartSeriesItem[])[0].top).toBe('15%')
      expect((optionsWithoutTitle.series as ChartSeriesItem[])[0].top).toBe('5%')
      // Breadcrumb is now hidden — see chart-config for rationale.
      expect((optionsWithTitle.series as ChartSeriesItem[])[0].breadcrumb?.show).toBe(false)
      expect((optionsWithoutTitle.series as ChartSeriesItem[])[0].breadcrumb?.show).toBe(false)
    })

    it('should handle empty data array', () => {
      const data: TreemapNode[] = []

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data

      expect(seriesData).toEqual([])
    })

    it('calls the tooltip formatter with and without conceptPath', () => {
      const data: TreemapNode[] = [{ name: 'Root', value: 500 }]
      const options = defaultTreemapOptions(data)
      const formatter = (options.tooltip as any).formatter

      const plain = formatter({ name: 'Root', value: 500, data: {} })
      expect(plain).toContain('Root')
      expect(plain).toContain('500')

      const withPath = formatter({ name: 'Leaf', value: 100, data: { conceptPath: 'A||B||Leaf' } })
      expect(withPath).toContain('A')
      expect(withPath).toContain('B')
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

    it('calls the tooltip formatter', () => {
      const data: DatasourcePieChartData[] = [{ name: 'Male', value: 3000 }]
      const options = dashboardGenderPieOptions(data)
      const formatter = (options.tooltip as any).formatter
      const result = formatter({ name: 'Male', value: 3000, percent: 60.0 })
      expect(result).toContain('Male')
      expect(result).toContain('3,000')
      expect(result).toContain('60.0%')
    })
  })

  describe('dashboardAgeBarOptions', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('should generate histogram chart options', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [
          { intervalIndex: 0, countValue: 100 },
          { intervalIndex: 1, countValue: 200 },
          { intervalIndex: 2, countValue: 300 },
        ],
        unit: 'Persons',
        seriesName: 'Person Count',
      }

      const options = dashboardAgeBarOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect((options.xAxis as ChartAxisOption).name).toBe('Age')
      expect(options.yAxis).toBeDefined()
      expect((options.yAxis as ChartAxisOption).name).toBe('Persons')
      expect(options.series).toBeDefined()
      expect((options.series as ChartSeriesItem[])).toHaveLength(1)
      expect((options.series as ChartSeriesItem[])[0].type).toBe('custom')
    })

    it('uses offset and intervalSize to map x bins', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 5,
        offset: 10,
        bins: [
          { intervalIndex: 0, countValue: 10 },
          { intervalIndex: 1, countValue: 20 },
          { intervalIndex: 2, countValue: 30 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      const series = options.series as ChartSeriesItem[]

      expect(series[0].data).toEqual([
        [10, 15, 10],
        [15, 20, 20],
        [20, 25, 30],
      ])
    })

    it('calls the tooltip formatter', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 10, countValue: 250 }],
        unit: 'Persons',
        seriesName: 'Person Count',
      }

      const options = dashboardAgeBarOptions(data)
      const formatter = (options.tooltip as any).formatter
      const result = formatter({ data: [10, 11, 250] })

      expect(result).toContain('Age: 10')
      expect(result).toContain('Person Count')
      expect(result).toContain('250')
    })

    it('formats tooltip with large numbers using SI notation', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 0, countValue: 3100000 }],
        unit: 'Persons',
      }

      const options = dashboardAgeBarOptions(data)
      const formatter = (options.tooltip as any).formatter
      const result = formatter({ data: [0, 1, 3100000] })

      expect(result).toContain('Age: 0')
      expect(result).toContain('3.1M')
    })

    it('formats y-axis labels with SI notation for large values', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [
          { intervalIndex: 0, countValue: 1000 },
          { intervalIndex: 1, countValue: 1000000 },
          { intervalIndex: 2, countValue: 1000000000 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      const yAxisFormatter = (options.yAxis as any).axisLabel.formatter

      expect(yAxisFormatter(1000)).toBe('1.0k')
      expect(yAxisFormatter(1000000)).toBe('1.0M')
      expect(yAxisFormatter(1000000000)).toBe('1.0B')
      expect(yAxisFormatter(250)).toBe('250')
    })

    it('leaves the y-axis max unset so ECharts auto-scales with headroom', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [
          { intervalIndex: 0, countValue: 120 },
          { intervalIndex: 1, countValue: 3100000 },
          { intervalIndex: 2, countValue: 200 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      // Pinning max to the tallest bar clips it against the frame and breaks
      // nice tick rounding — leave it undefined for auto-scaling.
      expect((options.yAxis as ChartAxisOption).max).toBeUndefined()
    })

    it('uses xAxisLabel for the axis name and tooltip prefix (defaulting to Age)', () => {
      const labelled: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 1950,
        bins: [{ intervalIndex: 0, countValue: 5 }],
        xAxisLabel: 'Year of Birth',
      }
      const opts = dashboardAgeBarOptions(labelled)
      expect((opts.xAxis as ChartAxisOption).name).toBe('Year of Birth')
      const tooltip = (opts.tooltip as any).formatter({ data: [1950, 1951, 5] })
      expect(tooltip).toContain('Year of Birth: 1950')

      const noLabel: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 0, countValue: 5 }],
      }
      expect((dashboardAgeBarOptions(noLabel).xAxis as ChartAxisOption).name).toBe('Age')
    })

    it('renders a single value when intervalSize is 1 and a range otherwise', () => {
      const unit: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 0, countValue: 5 }],
      }
      const unitTooltip = (dashboardAgeBarOptions(unit).tooltip as any).formatter({ data: [40, 41, 5] })
      expect(unitTooltip).toContain('Age: 40')
      expect(unitTooltip).not.toContain('40 - 41')

      const ranged: DatasourceHistogramChartData = {
        intervalSize: 30,
        offset: 0,
        bins: [{ intervalIndex: 8, countValue: 5 }],
        xAxisLabel: 'Days',
      }
      const rangeTooltip = (dashboardAgeBarOptions(ranged).tooltip as any).formatter({
        data: [240, 270, 5],
      })
      expect(rangeTooltip).toContain('Days: 240 - 270')
    })

    it('renderItem rects have flat tops (no rounded corners)', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 0, countValue: 2 }],
      }
      const series = dashboardAgeBarOptions(data).series as any[]
      const coord = ([x, y]: [number, number]) => [x * 10, 200 - y * 3]
      const dp = series[0].data[0] as number[]
      const res = series[0].renderItem({}, { value: (i: number) => dp[i] ?? 0, coord } as any)
      expect(res.shape.r).toBeUndefined()
    })

    it('returns empty options and logs an error for empty/invalid bins', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const data: DatasourceHistogramChartData = {
        intervalSize: 1,
        offset: 0,
        bins: [],
      }

      const options = dashboardAgeBarOptions(data)

      expect(options).toEqual({})
      expect(spy).toHaveBeenCalled()
    })

    it('renderItem returns rects for each bin with deterministic pixels', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 5,
        offset: 10,
        bins: [
          { intervalIndex: 0, countValue: 2 },
          { intervalIndex: 1, countValue: 4 },
          { intervalIndex: 2, countValue: 0 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      const series = options.series as any[]
      const renderItem = series[0].renderItem
      expect(typeof renderItem).toBe('function')

      const datapoints = series[0].data as number[][]
      expect(datapoints).toHaveLength(3)

      // Deterministic coord mapping so expected pixels are exact:
      // coord([x,y]) => [x*10, 200 - y*3]
      const coord = ([x, y]: [number, number]) => [x * 10, 200 - y * 3]

      datapoints.forEach((dp) => {
        const api = {
          value: (i: number) => dp[i] ?? 0,
          coord,
        } as any

        const result = renderItem({}, api)

        const xStart = dp[0]
        const xEnd = dp[1]
        const y = dp[2]

        const [xStartPx, yTopPx] = coord([xStart, y])
        const [xEndPx] = coord([xEnd, y])
        const [, yBasePx] = coord([xStart, 0])

        // Bars are inset by a 20% gap and centred within their bin.
        const gap = (xEndPx - xStartPx) * 0.2
        const expectedWidth = Math.max(0.5, xEndPx - xStartPx - gap)
        const expectedHeight = Math.max(0, yBasePx - yTopPx)

        expect(result.type).toBe('rect')
        expect(result.shape).toBeDefined()
        expect(result.shape.x).toBe(xStartPx + gap / 2)
        expect(result.shape.y).toBe(yTopPx)
        expect(result.shape.width).toBe(expectedWidth)
        expect(result.shape.height).toBe(expectedHeight)
        expect(result.style.fill).toBe(CHART_COLORS[0])
      })

    })

    // Additional explicit cases: unclamped geometry and clamped geometry
    it('renderItem: unclamped geometry matches raw coord math', () => {
      const data: DatasourceHistogramChartData = {
        intervalSize: 5,
        offset: 10,
        bins: [
          { intervalIndex: 0, countValue: 2 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      const series = options.series as any[]
      const renderItem = series[0].renderItem
      const dp = series[0].data[0] as number[]

      const coord = ([x, y]: [number, number]) => [x * 10, 200 - y * 3]
      const api = { value: (i: number) => dp[i] ?? 0, coord } as any

      const res = renderItem({}, api)

      const [xStartPx, yTopPx] = coord([dp[0], dp[2]])
      const [xEndPx] = coord([dp[1], dp[2]])
      const [, yBasePx] = coord([dp[0], 0])

      const rawWidth = xEndPx - xStartPx
      const rawHeight = yBasePx - yTopPx
      const gap = rawWidth * 0.2

      // Ensure this is an unclamped case
      expect(rawWidth).toBeGreaterThan(0.5)
      expect(rawHeight).toBeGreaterThan(0)

      expect(res.shape.x).toBe(xStartPx + gap / 2)
      expect(res.shape.y).toBe(yTopPx)
      expect(res.shape.width).toBe(rawWidth - gap)
      expect(res.shape.height).toBe(rawHeight)
    })

    it('renderItem: applies min-width and non-negative height clamps', () => {
      // Small intervalSize to produce a sub-pixel width and zero height
      const data: DatasourceHistogramChartData = {
        intervalSize: 0.02,
        offset: 0,
        bins: [
          { intervalIndex: 1, countValue: 0 },
        ],
      }

      const options = dashboardAgeBarOptions(data)
      const series = options.series as any[]
      const dp = series[0].data[0] as number[]
      const coord = ([x, y]: [number, number]) => [x * 10, 200 - y * 3]
      const api = { value: (i: number) => dp[i] ?? 0, coord } as any

      const res = series[0].renderItem({}, api)

      const [xStartPx, yTopPx] = coord([dp[0], dp[2]])
      const [xEndPx] = coord([dp[1], dp[2]])
      const [, yBasePx] = coord([dp[0], 0])
      const rawWidth = xEndPx - xStartPx
      const rawHeight = yBasePx - yTopPx
      const gap = rawWidth * 0.2

      expect(rawWidth).toBeLessThan(0.5)
      expect(rawHeight).toBe(0)

      expect(res.shape.x).toBe(xStartPx + gap / 2)
      expect(res.shape.y).toBe(yTopPx)
      expect(res.shape.width).toBe(0.5)
      expect(res.shape.height).toBe(0)
    })
  })

  describe('dashboardCumulativeLineOptions', () => {
    it('should generate cumulative observation line chart options', () => {
      // The builder now uses a value x-axis (xValues), not category strings.
      const data: DatasourceLineChartData = {
        categories: ['2020', '2021', '2022', '2023'],
        xValues: [2020, 2021, 2022, 2023],
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
        xValues: [2020],
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
        xValues: [2020],
        series: [{ name: 'Cumulative', data: [50] }]
      }

      const options = dashboardCumulativeLineOptions(data)

      // Default x-axis label is 'Years' (plural) in the value-axis builder
      expect((options.xAxis as ChartAxisOption).name).toBe('Years')
      expect((options.yAxis as ChartAxisOption).name).toBe('Percent of Persons')
    })

    it('should apply area gradient to series', () => {
      const data: DatasourceLineChartData = {
        categories: ['2020'],
        xValues: [2020],
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
        xValues: [2020, 2021],
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
        xValues: [2020],
        series: []
      }

      const options = dashboardCumulativeLineOptions(data)

      expect((options.series as ChartSeriesItem[])).toEqual([])
    })

    it('calls the tooltip formatter', () => {
      // The value-axis builder tooltip receives { value: [xValue, yValue] }
      const data: DatasourceLineChartData = {
        categories: ['365'],
        xValues: [365],
        series: [{ name: 'Cumulative', data: [45.7] }],
        yAxisLabel: 'Percent',
        xAxisLabel: 'Days'
      }
      const options = dashboardCumulativeLineOptions(data)
      const formatter = (options.tooltip as any).formatter
      const result = formatter([{ value: [365, 45.7] }])
      expect(result).toContain('365')
      expect(result).toContain('45.7%')
    })
  })

  describe('dashboardObservationMonthLineOptions', () => {
    it('should generate observation by month line chart options', () => {
      // The builder now uses a time x-axis (monthCodes), not category strings.
      const data: DatasourceLineChartData = {
        categories: ['202001', '202002', '202003'],
        monthCodes: [202001, 202002, 202003],
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
      const monthCodes = Array.from({ length: 24 }, (_, i) => 202001 + i)
      const data: DatasourceLineChartData = {
        categories: monthCodes.map(m => m.toString()),
        monthCodes,
        series: [{ name: 'Observations', data: Array(24).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect(options.dataZoom).toBeDefined()
      expect((options.dataZoom as ChartDataZoomOption[])).toHaveLength(2)
      expect((options.dataZoom as ChartDataZoomOption[])[0].type).toBe('inside')
      expect((options.dataZoom as ChartDataZoomOption[])[1].type).toBe('slider')
    })

    it('should use a time x-axis (no label rotation — ECharts handles time axis labels)', () => {
      // The time-axis builder lets ECharts auto-format labels; no manual rotation.
      const monthCodes = Array.from({ length: 30 }, (_, i) => 202001 + i)
      const data: DatasourceLineChartData = {
        categories: monthCodes.map(m => m.toString()),
        monthCodes,
        series: [{ name: 'Observations', data: Array(30).fill(1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      // xAxis type is 'time', not 'category' — rotation is not configured
      expect((options.xAxis as ChartAxisOption).type).toBe('time')
    })

    it('should use default labels when not provided', () => {
      const data: DatasourceLineChartData = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as ChartAxisOption).name).toBe('Month')
      expect((options.yAxis as ChartAxisOption).name).toBe('Observation Count')
    })

    it('should disable symbols for cleaner lines', () => {
      const data: DatasourceLineChartData = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.series as ChartSeriesItem[])[0].symbol).toBe('none')
    })

    it('should use LTTB sampling', () => {
      const data: DatasourceLineChartData = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Observations', data: [1000] }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.series as ChartSeriesItem[])[0].sampling).toBe('lttb')
    })

    it('should produce time-series data points (YYYYMM → [timestamp, value])', () => {
      const data: DatasourceLineChartData = {
        categories: ['202301', '202302'],
        monthCodes: [202301, 202302],
        series: [{ name: 'Observations', data: [1000, 1200] }]
      }

      const options = dashboardObservationMonthLineOptions(data)
      const seriesData = (options.series as ChartSeriesItem[])[0].data as [number, number][]

      // Each point is [timestamp (ms), value]
      expect(Array.isArray(seriesData[0])).toBe(true)
      expect(seriesData[0][1]).toBe(1000)
      expect(seriesData[1][1]).toBe(1200)
    })

    it('calls the tooltip formatter using default label when no yAxisLabel', () => {
      // The time-axis tooltip receives { value: [timestamp, number] }
      const data: DatasourceLineChartData = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Data', data: [500] }]
      }
      const options = dashboardObservationMonthLineOptions(data)
      const formatter = (options.tooltip as ChartTooltipOption).formatter as (params: unknown) => string
      // Formatter receives [{ value: [timestamp, number] }]
      const jan2020 = Date.UTC(2020, 0) // 2020-01
      const result = formatter([{ value: [jan2020, 500] }])
      expect(result).toContain('Observations')
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

    it('calls tooltip formatter with prevalence, metric, and plain value', () => {
      const data: TreemapNode[] = [{ name: 'Condition', value: 400 }]
      const options = clinicalDomainTreemapOptions(data)
      const formatter = (options.tooltip as any).formatter

      const withBoth = formatter({ name: 'X', value: 100, data: { prevalence: 5.5, metric: 1.2 } })
      expect(withBoth).toContain('X')
      expect(withBoth).toContain('5.50%')
      expect(withBoth).toContain('1.20')

      const withNone = formatter({ name: 'Y', value: 50, data: {} })
      expect(withNone).toContain('Y')
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

  describe('dashboardCumulativeLineOptions', () => {
    it('should generate cumulative line chart configuration', () => {
      // Value x-axis: xValues required instead of category strings
      const data = {
        categories: ['2018', '2019', '2020', '2021'],
        xValues: [2018, 2019, 2020, 2021],
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
        xValues: [2020],
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
        xValues: [2020, 2021],
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
      // Time x-axis: monthCodes (YYYYMM) required instead of category strings
      const data = {
        categories: ['202001', '202002', '202003'],
        monthCodes: [202001, 202002, 202003],
        series: [{ name: 'Observations', data: [1000, 1200, 1100] }],
        xAxisLabel: 'Month',
        yAxisLabel: 'Count'
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect(options.tooltip).toBeDefined()
      expect(options.dataZoom).toBeDefined()
      expect((options.dataZoom as any)).toHaveLength(2)
    })

    it('should use a time x-axis (ECharts auto-formats labels, no manual rotation)', () => {
      const monthCodes = Array.from({ length: 30 }, (_, i) => 202001 + i)
      const data = {
        categories: monthCodes.map(m => m.toString()),
        monthCodes,
        series: [{ name: 'Data', data: Array.from({ length: 30 }, () => 1000) }]
      }

      const options = dashboardObservationMonthLineOptions(data)

      expect((options.xAxis as any).type).toBe('time')
    })

    it('should include data zoom controls', () => {
      const data = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Data', data: [100] }]
      }

      const options = dashboardObservationMonthLineOptions(data)
      const dataZoom = options.dataZoom as any[]

      expect(dataZoom[0].type).toBe('inside')
      expect(dataZoom[1].type).toBe('slider')
    })

    it('calls the tooltip formatter', () => {
      // The time-axis tooltip formatter receives [{ value: [timestamp, number] }]
      const data = {
        categories: ['202001'],
        monthCodes: [202001],
        series: [{ name: 'Observations', data: [1500] }],
        yAxisLabel: 'Count'
      }
      const options = dashboardObservationMonthLineOptions(data)
      const formatter = (options.tooltip as any).formatter
      const jan2020 = Date.UTC(2020, 0)
      const result = formatter([{ value: [jan2020, 1500] }])
      expect(result).toContain('01/2020')
      expect(result).toContain('Count')
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

    it('calls the tooltip formatter with prevalence and metric', () => {
      const data = [{ name: 'Condition', value: 100 }]
      const options = clinicalDomainTreemapOptions(data)
      const formatter = (options.tooltip as any).formatter

      const resultFull = formatter({
        name: 'Hypertension',
        value: 500,
        data: { prevalence: 12.5, metric: 0.8 },
      })
      expect(resultFull).toContain('Hypertension')
      expect(resultFull).toContain('12.50%')
      expect(resultFull).toContain('0.80')

      const resultNoExtras = formatter({
        name: 'Diabetes',
        value: 200,
        data: {},
      })
      expect(resultNoExtras).toContain('Diabetes')
    })
  })
})

describe('trellisChartOptions', () => {
  const mockTrellisData: TrellisChartData = {
    categories: ['20-29', '30-39', '10-19'],
    series: [
      {
        name: 'Male',
        category: '20-29',
        data: [{ x: 2015, y: 12.5 }, { x: 2016, y: 13.2 }],
      },
      {
        name: 'Female',
        category: '20-29',
        data: [{ x: 2015, y: 11.8 }, { x: 2016, y: 12.6 }],
      },
      {
        name: 'Male',
        category: '30-39',
        data: [{ x: 2015, y: 18.3 }, { x: 2016, y: 19.1 }],
      },
      {
        name: 'Male',
        category: '10-19',
        data: [{ x: 2015, y: 5.2 }, { x: 2016, y: 5.7 }],
      },
    ],
  }

  it('returns a valid ECharts option object', () => {
    const options = trellisChartOptions(mockTrellisData)
    expect(options).toBeDefined()
    expect(options.grid).toBeDefined()
    expect(options.xAxis).toBeDefined()
    expect(options.yAxis).toBeDefined()
    expect(options.series).toBeDefined()
  })

  it('sorts categories by leading numeric prefix', () => {
    const options = trellisChartOptions(mockTrellisData)
    const titles = (options.title as any[])
    const categoryTitles = titles.filter((t: any) => !t.text?.includes('/') && /\d/.test(t.text || ''))
    const texts = categoryTitles.map((t: any) => t.text)
    expect(texts.indexOf('10-19')).toBeLessThan(texts.indexOf('20-29'))
    expect(texts.indexOf('20-29')).toBeLessThan(texts.indexOf('30-39'))
  })

  it('creates one grid per category', () => {
    const options = trellisChartOptions(mockTrellisData)
    expect((options.grid as any[]).length).toBe(3)
  })

  it('includes a title when provided', () => {
    const options = trellisChartOptions(mockTrellisData, 'Test Title')
    const titles = (options.title as any[])
    expect(titles.some((t: any) => t.text === 'Test Title')).toBe(true)
  })

  it('produces series entries for each category-series combination', () => {
    const options = trellisChartOptions(mockTrellisData)
    expect((options.series as any[]).length).toBeGreaterThan(0)
  })

  it('respects maxPlotsPerRow parameter', () => {
    const options = trellisChartOptions(mockTrellisData, undefined, 2)
    expect((options.grid as any[]).length).toBe(3)
  })

  it('handles single-category data', () => {
    const single: TrellisChartData = {
      categories: ['0-9'],
      series: [{ name: 'Male', category: '0-9', data: [{ x: 2020, y: 3.1 }] }],
    }
    const options = trellisChartOptions(single)
    expect((options.grid as any[]).length).toBe(1)
  })

  it('sorts non-numeric categories alphabetically', () => {
    const alphaData: TrellisChartData = {
      categories: ['Zebra', 'Apple', 'Mango'],
      series: [
        { name: 'S', category: 'Zebra', data: [{ x: 2020, y: 1 }] },
        { name: 'S', category: 'Apple', data: [{ x: 2020, y: 2 }] },
        { name: 'S', category: 'Mango', data: [{ x: 2020, y: 3 }] },
      ],
    }
    const options = trellisChartOptions(alphaData)
    const titles = (options.title as any[])
    const categoryTitles = titles
      .filter((t: any) => ['Zebra', 'Apple', 'Mango'].includes(t.text))
      .map((t: any) => t.text)
    expect(categoryTitles.indexOf('Apple')).toBeLessThan(categoryTitles.indexOf('Mango'))
    expect(categoryTitles.indexOf('Mango')).toBeLessThan(categoryTitles.indexOf('Zebra'))
  })
})

describe('boxPlotChartOptions', () => {
  const mockBoxData: BoxPlotData[] = [
    { category: 'A', min: 10, p10: 15, p25: 20, median: 30, p75: 40, p90: 45, max: 50 },
    { category: 'B', min: 5, p10: 8, p25: 12, median: 18, p75: 25, p90: 30, max: 35 },
  ]

  it('returns a valid ECharts option object', () => {
    const options = boxPlotChartOptions(mockBoxData)
    expect(options).toBeDefined()
    expect(options.xAxis).toBeDefined()
    expect(options.yAxis).toBeDefined()
    expect(options.series).toBeDefined()
  })

  it('creates boxplot and scatter series', () => {
    const options = boxPlotChartOptions(mockBoxData)
    const series = options.series as any[]
    expect(series.length).toBeGreaterThan(0)
    expect(series.some((s: any) => s.type === 'boxplot')).toBe(true)
  })

  it('maps category names to xAxis', () => {
    const options = boxPlotChartOptions(mockBoxData)
    const xAxis = options.xAxis as any
    expect(xAxis.data).toEqual(['A', 'B'])
  })

  it('includes a title when provided', () => {
    const options = boxPlotChartOptions(mockBoxData, 'Box Plot Title')
    const title = options.title as any
    expect(title.text).toBe('Box Plot Title')
  })

  it('has no title when not provided', () => {
    const options = boxPlotChartOptions(mockBoxData)
    expect(options.title).toBeUndefined()
  })

  it('includes tooltip configuration', () => {
    const options = boxPlotChartOptions(mockBoxData)
    expect(options.tooltip).toBeDefined()
    expect((options.tooltip as any).trigger).toBe('item')
  })

  it('calls the tooltip formatter for boxplot params', () => {
    const options = boxPlotChartOptions(mockBoxData)
    const formatter = (options.tooltip as any).formatter
    const result = formatter({ seriesType: 'boxplot', name: 'A', value: [0, 10, 20, 30, 40, 50], dataIndex: 0 })
    expect(result).toContain('A')
  })

  it('calls the tooltip formatter for non-boxplot params', () => {
    const options = boxPlotChartOptions(mockBoxData)
    const formatter = (options.tooltip as any).formatter
    const result = formatter({ seriesType: 'scatter', name: 'B', value: [1, 5] })
    expect(result).toBe('B')
  })

  it('handles empty data array', () => {
    const options = boxPlotChartOptions([])
    expect((options.xAxis as any).data).toEqual([])
  })

  it('adds outlier point when p90 exceeds max', () => {
    const dataWithOutlier: BoxPlotData[] = [
      { category: 'X', min: 10, p10: 12, p25: 20, median: 30, p75: 40, p90: 60, max: 50 },
    ]
    const options = boxPlotChartOptions(dataWithOutlier)
    const scatterSeries = (options.series as any[]).find((s: any) => s.type === 'scatter')
    expect(scatterSeries.data.length).toBeGreaterThan(0)
  })

  it('adds outlier point when p10 is below min', () => {
    const dataWithLowOutlier: BoxPlotData[] = [
      { category: 'Y', min: 10, p10: 5, p25: 20, median: 30, p75: 40, p90: 45, max: 50 },
    ]
    const options = boxPlotChartOptions(dataWithLowOutlier)
    const scatterSeries = (options.series as any[]).find((s: any) => s.type === 'scatter')
    expect(scatterSeries.data.length).toBeGreaterThan(0)
  })

  it('calls the series-level tooltip formatter', () => {
    const options = boxPlotChartOptions(mockBoxData)
    const boxplotSeries = (options.series as any[]).find((s: any) => s.type === 'boxplot')
    const formatter = boxplotSeries.tooltip.formatter
    const result = formatter({ name: 'A', value: [0, 10, 20, 30, 40, 50] })
    expect(result).toContain('A')
    expect(result).toContain('50')
  })
})
