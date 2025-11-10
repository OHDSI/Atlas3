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
  getExportConfig
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
      expect((options.series as any)[0].type).toBe('bar')
      expect((options.series as any)[0].data).toEqual([100, 150, 200])
    })

    it('should handle categories without unit', () => {
      const data: BarChartData = {
        categories: ['A', 'B'],
        values: [10, 20]
      }

      const options = defaultBarChartOptions(data)

      expect((options.yAxis as any).name).toBe('Count')
    })

    it('should rotate labels for many categories', () => {
      const data: BarChartData = {
        categories: Array.from({ length: 15 }, (_, i) => `Cat${i}`),
        values: Array.from({ length: 15 }, () => 100)
      }

      const options = defaultBarChartOptions(data)

      expect((options.xAxis as any).axisLabel.rotate).toBe(45)
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
      expect((options.title as any).text).toBe('Gender Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.legend).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as any)[0].type).toBe('pie')
      expect((options.series as any)[0].data).toHaveLength(2)
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
      const seriesData = (options.series as any)[0].data

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
      expect((options.title as any).text).toBe('Monthly Trend')
      expect(options.tooltip).toBeDefined()
      expect(options.grid).toBeDefined()
      expect(options.xAxis).toBeDefined()
      expect(options.yAxis).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as any)[0].type).toBe('line')
      expect((options.series as any)[0].data).toEqual([10, 20, 15])
      expect((options.series as any)[0].smooth).toBe(true)
    })

    it('should include area style', () => {
      const data: LineChartData = {
        xAxis: ['A'],
        yAxis: [10]
      }

      const options = defaultLineChartOptions(data)

      expect((options.series as any)[0].areaStyle).toBeDefined()
    })

    it('should rotate labels for many data points', () => {
      const data: LineChartData = {
        xAxis: Array.from({ length: 25 }, (_, i) => `Point${i}`),
        yAxis: Array.from({ length: 25 }, () => 10)
      }

      const options = defaultLineChartOptions(data)

      expect((options.xAxis as any).axisLabel.rotate).toBe(45)
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
      expect((options.title as any).text).toBe('Distribution')
      expect(options.tooltip).toBeDefined()
      expect(options.series).toBeDefined()
      expect((options.series as any)[0].type).toBe('treemap')
    })

    it('should assign colors to treemap nodes', () => {
      const data: TreemapNode[] = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 }
      ]

      const options = defaultTreemapOptions(data)
      const seriesData = (options.series as any)[0].data

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
      const seriesData = (options.series as any)[0].data

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
