import { describe, it, expect, afterEach } from 'vitest'
import { computed } from 'vue'
import {
  parseYyyymm,
  dashboardObservationMonthLineOptions,
  dashboardGenderPieOptions,
  dashboardAgeBarOptions,
  dashboardCumulativeLineOptions as dashboardCumulativeLineOptionsBuilder,
  multiLineChartOptions as multiLineChartOptionsBuilder,
  defaultBarChartOptions,
  defaultPieChartOptions,
  defaultLineChartOptions,
  defaultTreemapOptions,
  clinicalDomainTreemapOptions,
  setChartPalette,
  setChartTheme,
  CHART_COLORS,
  TREEMAP_GRADIENT,
  CHART_MUTED_TEXT,
  CHART_GRID_BORDER,
  CHART_BOX_BORDER,
  CHART_OUTLIER_MARKER,
  CHART_TEXT,
  CHART_LABEL_ON_MARK,
  getExportConfig,
  trellisChartOptions,
  boxPlotChartOptions,
} from '@/ui/chart-config'
import { contrastRatio } from '@/ui/contrast'
import { tokens } from '@/ui/tokens'
import type { TrellisChartData, BoxPlotData, TreemapNode } from '@/models/report.types'

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

  it('keeps the muted text and border literals byte-for-byte in light mode', () => {
    setChartTheme('light')
    expect(CHART_MUTED_TEXT).toBe('#6b6b6b')
    expect(CHART_GRID_BORDER).toBe('black')
    expect(CHART_BOX_BORDER).toBe('#333')
  })

  it('gives the dark muted text at least 4.5:1 (text floor) against the dark surface', () => {
    setChartTheme('dark')
    expect(contrastRatio(CHART_MUTED_TEXT, tokens.colorDark.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('gives the dark grid and box borders at least 3:1 (non-text floor) against the dark surface', () => {
    setChartTheme('dark')
    expect(contrastRatio(CHART_GRID_BORDER, tokens.colorDark.surface)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(CHART_BOX_BORDER, tokens.colorDark.surface)).toBeGreaterThanOrEqual(3)
  })

  it('reaches trellisChartOptions grid borders and section-header labels', () => {
    setChartTheme('dark')
    const data: TrellisChartData = {
      categories: ['20-29'],
      series: [{ name: 'Male', category: '20-29', data: [{ x: 2015, y: 12.5 }] }],
    }
    const options = trellisChartOptions(data) as { grid?: Array<Record<string, unknown>> }
    expect(options.grid?.[0]?.borderColor).toBe(CHART_GRID_BORDER)
    expect(JSON.stringify(options)).toContain(CHART_MUTED_TEXT)
  })

  it('reaches boxPlotChartOptions box borders', () => {
    setChartTheme('dark')
    const data: BoxPlotData[] = [
      { category: 'a', min: 1, p10: 2, p25: 3, median: 4, p75: 5, p90: 6, max: 7 },
    ]
    const options = boxPlotChartOptions(data) as { series?: Array<{ itemStyle?: Record<string, unknown> }> }
    expect(options.series?.[0]?.itemStyle?.borderColor).toBe(CHART_BOX_BORDER)
  })

  it('keeps the outlier marker byte-for-byte in light mode', () => {
    setChartTheme('light')
    expect(CHART_OUTLIER_MARKER).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('gives the dark outlier marker at least 3:1 against the dark surface', () => {
    setChartTheme('dark')
    expect(contrastRatio(CHART_OUTLIER_MARKER, tokens.colorDark.surface)).toBeGreaterThanOrEqual(3)
  })

  it('reaches boxPlotChartOptions outlier marker colour', () => {
    setChartTheme('dark')
    const data: BoxPlotData[] = [
      { category: 'a', min: 1, p10: 0, p25: 3, median: 4, p75: 5, p90: 8, max: 7 },
    ]
    const options = boxPlotChartOptions(data) as { series?: Array<{ itemStyle?: Record<string, unknown> }> }
    expect(options.series?.[1]?.itemStyle?.color).toBe(CHART_OUTLIER_MARKER)
  })
})

const sharedTreemapNodes: TreemapNode[] = [
  { name: 'a', value: 10 },
  { name: 'b', value: 20 },
]

const builders: Array<{ name: string; build: () => { textStyle?: { color?: string } } }> = [
  {
    name: 'defaultBarChartOptions',
    build: () => defaultBarChartOptions({ categories: ['a', 'b'], values: [1, 2] }),
  },
  {
    name: 'defaultPieChartOptions',
    build: () => defaultPieChartOptions([{ name: 'a', value: 1 }]),
  },
  {
    name: 'defaultLineChartOptions',
    build: () => defaultLineChartOptions({ xAxis: ['a', 'b'], yAxis: [1, 2] }),
  },
  {
    name: 'defaultTreemapOptions',
    build: () => defaultTreemapOptions(sharedTreemapNodes),
  },
  {
    name: 'dashboardGenderPieOptions',
    build: () => dashboardGenderPieOptions([{ name: 'Male', value: 1 }]),
  },
  {
    name: 'dashboardAgeBarOptions',
    build: () =>
      dashboardAgeBarOptions({
        intervalSize: 10,
        offset: 0,
        bins: [{ intervalIndex: 0, countValue: 5 }],
      }),
  },
  {
    name: 'dashboardCumulativeLineOptions',
    build: () =>
      dashboardCumulativeLineOptionsBuilder({
        xValues: [0, 1],
        series: [{ name: 'Percent', data: [100, 80] }],
      }),
  },
  {
    name: 'dashboardObservationMonthLineOptions',
    build: () =>
      dashboardObservationMonthLineOptions({
        monthCodes: [200301],
        series: [{ name: 'Observations', data: [10] }],
      }),
  },
  {
    name: 'multiLineChartOptions',
    build: () =>
      multiLineChartOptionsBuilder({
        categories: ['a', 'b'],
        series: [{ name: 's', data: [1, 2] }],
      }),
  },
  {
    name: 'clinicalDomainTreemapOptions',
    build: () => clinicalDomainTreemapOptions(sharedTreemapNodes),
  },
  {
    name: 'trellisChartOptions',
    build: () =>
      trellisChartOptions({
        categories: ['20-29'],
        series: [{ name: 'Male', category: '20-29', data: [{ x: 2015, y: 12.5 }] }],
      }),
  },
  {
    name: 'boxPlotChartOptions',
    build: () =>
      boxPlotChartOptions([
        { category: 'a', min: 1, p10: 2, p25: 3, median: 4, p75: 5, p90: 6, max: 7 },
      ]),
  },
]

// Regression: ECharts falls back to its own dark-grey default (~#333) for any
// text that doesn't set an explicit colour, which is invisible on the dark
// surface. Every option builder must add a root-level textStyle default in
// dark only, and must NOT add one in light (so light stays byte-identical).
describe('chartRootTextStyle root default', () => {
  afterEach(() => {
    setChartTheme('light')
  })

  it.each(builders)('$name emits no root textStyle in light', ({ build }) => {
    setChartTheme('light')
    expect(build().textStyle).toBeUndefined()
  })

  it.each(builders)('$name emits the dark on-surface root textStyle in dark', ({ build }) => {
    setChartTheme('dark')
    expect(build().textStyle?.color).toBe(tokens.colorDark.onSurface)
    expect(build().textStyle?.color).toBe(CHART_TEXT)
  })
})

// Regression: the CHART_* bindings are module-level `let`s, so a chart's
// `computed(() => builder(data))` tracked nothing and kept the previous theme's
// palette until its data changed or the component remounted. Every builder must
// register the theme as a reactive dependency of its caller.
describe('option builders invalidate their caller on a theme change', () => {
  afterEach(() => {
    setChartTheme('light')
    setChartPalette({ chartColors: null, treemapGradient: null })
  })

  it.each(builders)('$name rebuilds after setChartTheme', ({ build }) => {
    setChartTheme('light')
    const option = computed(() => build())
    const inLight = option.value
    setChartTheme('dark')
    expect(option.value).not.toBe(inLight)
  })

  it.each(builders)('$name rebuilds after setChartPalette', ({ build }) => {
    const option = computed(() => build())
    const before = option.value
    setChartPalette({ chartColors: ['#abcdef'], treemapGradient: null })
    expect(option.value).not.toBe(before)
  })
})

// Regression: dashboardGenderPieOptions' donut labels sit on the pie slice
// fill (a coloured mark), not the page background. Once the root textStyle
// default above exists, an unset label colour would inherit the on-surface
// colour meant for text on the page — too light against the light/pastel
// dark-mode chart palette. It must flip to CHART_LABEL_ON_MARK instead.
describe('labels on coloured marks use CHART_LABEL_ON_MARK, not the root default', () => {
  afterEach(() => {
    setChartTheme('light')
  })

  it('dashboardGenderPieOptions label has no colour in light (unchanged)', () => {
    setChartTheme('light')
    const options = dashboardGenderPieOptions([{ name: 'Male', value: 1 }]) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBeUndefined()
  })

  it('dashboardGenderPieOptions label uses CHART_LABEL_ON_MARK in dark', () => {
    setChartTheme('dark')
    const options = dashboardGenderPieOptions([{ name: 'Male', value: 1 }]) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBe(CHART_LABEL_ON_MARK)
  })

  const treemapNodes: TreemapNode[] = [{ name: 'a', value: 10 }]

  it('defaultTreemapOptions leaf label has no colour in light (unchanged)', () => {
    setChartTheme('light')
    const options = defaultTreemapOptions(treemapNodes) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBeUndefined()
  })

  it('defaultTreemapOptions leaf label uses CHART_LABEL_ON_MARK in dark', () => {
    setChartTheme('dark')
    const options = defaultTreemapOptions(treemapNodes) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBe(CHART_LABEL_ON_MARK)
  })

  it('clinicalDomainTreemapOptions leaf label has no colour in light (unchanged)', () => {
    setChartTheme('light')
    const options = clinicalDomainTreemapOptions(treemapNodes) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBeUndefined()
  })

  it('clinicalDomainTreemapOptions leaf label uses CHART_LABEL_ON_MARK in dark', () => {
    setChartTheme('dark')
    const options = clinicalDomainTreemapOptions(treemapNodes) as {
      series?: Array<{ label?: { color?: string } }>
    }
    expect(options.series?.[0]?.label?.color).toBe(CHART_LABEL_ON_MARK)
  })
})
