import { describe, it, expect, afterEach } from 'vitest'
import {
  parseYyyymm,
  dashboardObservationMonthLineOptions,
  setChartPalette,
  setChartTheme,
  CHART_COLORS,
  TREEMAP_GRADIENT,
  getExportConfig,
} from '@/ui/chart-config'
import { contrastRatio } from '@/ui/contrast'
import { tokens } from '@/ui/tokens'

describe('setChartPalette', () => {
  afterEach(() => {
    setChartPalette({ chartColors: null, treemapGradient: null })
  })

  it('overrides both palettes', () => {
    setChartPalette({
      chartColors: ['#000080', '#ff5e59'],
      treemapGradient: ['#c3cce8', '#000080'],
    })

    expect([...CHART_COLORS]).toEqual(['#000080', '#ff5e59'])
    expect([...TREEMAP_GRADIENT]).toEqual(['#c3cce8', '#000080'])
  })

  it('restores the defaults when passed null or an empty array', () => {
    const defaultColors = [...CHART_COLORS]
    const defaultGradient = [...TREEMAP_GRADIENT]

    setChartPalette({ chartColors: ['#000080'], treemapGradient: ['#000080'] })
    setChartPalette({ chartColors: null, treemapGradient: [] })

    expect([...CHART_COLORS]).toEqual(defaultColors)
    expect([...TREEMAP_GRADIENT]).toEqual(defaultGradient)
  })

  it('overrides one palette without disturbing the other', () => {
    const defaultGradient = [...TREEMAP_GRADIENT]

    setChartPalette({ chartColors: ['#000080'] })

    expect([...CHART_COLORS]).toEqual(['#000080'])
    expect([...TREEMAP_GRADIENT]).toEqual(defaultGradient)
  })

  // The builders read the palette at call time; charts would otherwise keep
  // whatever was captured when the module first evaluated.
  it('reaches options built after the override', () => {
    setChartPalette({ chartColors: ['#000080', '#ff5e59'] })

    const options = dashboardObservationMonthLineOptions({
      categories: ['01/2003'],
      monthCodes: [200301],
      series: [{ name: 'Observations', data: [10] }],
      xAxisLabel: 'Month',
      yAxisLabel: 'Observations',
    }) as { series?: Array<Record<string, unknown>> }

    expect(JSON.stringify(options.series)).toContain('#000080')
  })
})

describe('parseYyyymm', () => {
  it('parses a YYYYMM integer to a UTC timestamp', () => {
    expect(parseYyyymm(200301)).toBe(Date.UTC(2003, 0, 1))
  })

  it('parses a YYYYMM string', () => {
    expect(parseYyyymm('201912')).toBe(Date.UTC(2019, 11, 1))
  })
})

describe('dashboardObservationMonthLineOptions', () => {
  const data = {
    categories: ['01/2003', '02/2003'],
    monthCodes: [200301, 200302],
    series: [{ name: 'Observations', data: [10, 20] }],
    xAxisLabel: 'Month',
    yAxisLabel: 'Observations',
  }

  it('uses a time x-axis', () => {
    const opt = dashboardObservationMonthLineOptions(data) as any
    expect(opt.xAxis.type).toBe('time')
  })

  it('emits [timestamp, value] point pairs', () => {
    const opt = dashboardObservationMonthLineOptions(data) as any
    expect(opt.series[0].data).toEqual([
      [Date.UTC(2003, 0, 1), 10],
      [Date.UTC(2003, 1, 1), 20],
    ])
  })
})

import { dashboardCumulativeLineOptions } from '@/ui/chart-config'

describe('dashboardCumulativeLineOptions', () => {
  const data = {
    xValues: [0, 1, 2],
    series: [{ name: 'Percent', data: [100, 80, 60] }],
    xAxisLabel: 'Years',
    yAxisLabel: 'Percent of Persons',
  }

  it('uses a value x-axis', () => {
    const opt = dashboardCumulativeLineOptions(data) as any
    expect(opt.xAxis.type).toBe('value')
  })

  it('emits [x, y] pairs', () => {
    const opt = dashboardCumulativeLineOptions(data) as any
    expect(opt.series[0].data).toEqual([[0, 100], [1, 80], [2, 60]])
  })
})

import { multiLineChartOptions } from '@/ui/chart-config'

describe('multiLineChartOptions xAxisType', () => {
  it('defaults to category axis (back-compat)', () => {
    const opt = multiLineChartOptions({
      categories: ['a', 'b'],
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.xAxis.type).toBe('category')
    expect(opt.series[0].data).toEqual([1, 2])
  })

  it('uses time axis with [timestamp, value] pairs when xAxisType=time', () => {
    const opt = multiLineChartOptions({
      xAxisType: 'time',
      monthCodes: [200301, 200302],
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.xAxis.type).toBe('time')
    expect(opt.series[0].data).toEqual([
      [Date.UTC(2003, 0, 1), 1],
      [Date.UTC(2003, 1, 1), 2],
    ])
  })

  it('rotates category labels when crowded (>24)', () => {
    const cats = Array.from({ length: 30 }, (_, i) => `c${i}`)
    const opt = multiLineChartOptions({
      categories: cats,
      series: [{ name: 's', data: cats.map(() => 1) }],
    }) as any
    expect(opt.xAxis.axisLabel.rotate).toBe(45)
  })
})

// Regression: when the Zod report schema strips xValues/monthCodes (because the
// schema didn't list them), the builders received undefined arrays and crashed
// during chart render (TypeError: reading '0'), blanking the whole dashboard.
// The builders must not throw when those arrays are absent.
describe('builders are defensive when scalar/time arrays are missing', () => {
  it('dashboardCumulativeLineOptions does not throw without xValues (falls back to index)', () => {
    const opt = dashboardCumulativeLineOptions({
      categories: ['0', '1', '2'],
      series: [{ name: 'Percent', data: [100, 80, 60] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 100], [1, 80], [2, 60]])
  })

  it('multiLineChartOptions time mode does not throw without monthCodes', () => {
    expect(() =>
      multiLineChartOptions({
        xAxisType: 'time',
        series: [{ name: 's', data: [1, 2] }],
      })
    ).not.toThrow()
  })

  it('multiLineChartOptions value mode emits [x, y] pairs from xValues', () => {
    const opt = multiLineChartOptions({
      xAxisType: 'value',
      xValues: [10, 20],
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.xAxis.type).toBe('value')
    expect(opt.series[0].data).toEqual([[10, 1], [20, 2]])
  })

  it('multiLineChartOptions value mode falls back to index when xValues missing', () => {
    const opt = multiLineChartOptions({
      xAxisType: 'value',
      series: [{ name: 's', data: [5, 6] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 5], [1, 6]])
  })

  it('dashboardObservationMonthLineOptions falls back to index without monthCodes', () => {
    const opt = dashboardObservationMonthLineOptions({
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 1], [1, 2]])
  })
})

describe('setChartTheme', () => {
  afterEach(() => {
    setChartTheme('light')
    setChartPalette({ chartColors: null, treemapGradient: null })
  })

  it('keeps the light palette byte-for-byte when set to light', () => {
    setChartTheme('light')
    expect(CHART_COLORS[0]).toBe('#4e79a7')
    expect(TREEMAP_GRADIENT).toEqual(['#7e9bbf', '#4e79a7', '#1f425a'])
  })

  it('swaps in the dark palette when set to dark', () => {
    setChartTheme('dark')
    expect(CHART_COLORS[0]).toBe('#7fb3e0')
    expect(TREEMAP_GRADIENT).toEqual(['#4e79a7', '#7fb3e0', '#a8cdea'])
  })

  it('gives every dark categorical colour at least 3:1 against the dark surface', () => {
    setChartTheme('dark')
    for (const color of CHART_COLORS) {
      expect(contrastRatio(color, tokens.colorDark.surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives every dark treemap stop at least 3:1 against the dark surface', () => {
    setChartTheme('dark')
    for (const stop of TREEMAP_GRADIENT) {
      expect(contrastRatio(stop, tokens.colorDark.surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('exports on the dark surface rather than white when the theme is dark', () => {
    setChartTheme('dark')
    expect(getExportConfig().backgroundColor).toBe(tokens.colorDark.surface)
  })

  it('exports on white in light mode', () => {
    setChartTheme('light')
    expect(getExportConfig().backgroundColor).toBe('#ffffff')
  })

  it('still honours an explicit export background', () => {
    setChartTheme('dark')
    expect(getExportConfig('#123456').backgroundColor).toBe('#123456')
  })

  it('lets a deployment palette win over the theme palette', () => {
    setChartTheme('dark')
    setChartPalette({ chartColors: ['#abcdef'], treemapGradient: null })
    expect(CHART_COLORS).toEqual(['#abcdef'])
  })
})
