import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  CHART_COLORS,
  CHART_SUBTLE_TEXT,
  CHART_LABEL_ON_MARK,
  TREEMAP_GRADIENT,
  boxPlotChartOptions,
  clinicalDomainTreemapOptions,
  createResizeHandler,
  dashboardAgeBarOptions,
  dashboardCumulativeLineOptions,
  dashboardGenderPieOptions,
  dashboardObservationMonthLineOptions,
  defaultBarChartOptions,
  defaultLineChartOptions,
  defaultPieChartOptions,
  defaultTreemapOptions,
  multiLineChartOptions,
  prevalenceRamp,
  setChartLabelResolver,
  setChartPalette,
  setChartTheme,
  trackChartTheme,
  trellisChartOptions,
} from '@/ui/chart-config'
import type { BoxPlotData, TreemapNode, TrellisChartData } from '@/models/report.types'

type Fmt = (params: unknown) => string
type AxisFmt = (value: number) => string

interface Axis {
  type?: string
  name?: string
  data?: unknown[]
  min?: number
  max?: number
  boundaryGap?: boolean
  gridIndex?: number
  nameLocation?: string
  nameRotate?: number
  position?: string
  axisLabel: { rotate?: number; show?: boolean; formatter: AxisFmt | string }
}

interface Series {
  name?: string
  type?: string
  data: unknown[]
  xAxisIndex?: number
  yAxisIndex?: number
  label?: { formatter?: string }
  color?: string[]
  itemStyle?: { color?: string }
  areaStyle?: { color: { colorStops: Array<{ offset: number; color: string }> } }
  tooltip?: { formatter: Fmt }
}

interface Opts {
  tooltip: { trigger?: string; formatter: Fmt }
  xAxis: Axis
  yAxis: Axis
  series: Series[]
  legend?: { data?: unknown[] }
  visualMap?: {
    show: boolean
    type: string
    min: number
    max: number
    text: string[]
    inRange: { color: string[] }
  }
}

const asOpts = (o: unknown) => o as Opts
const axisFmt = (axis: Axis) => axis.axisLabel.formatter as AxisFmt
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

describe('palettes', () => {
  afterEach(() => {
    setChartTheme('light')
    setChartPalette({ chartColors: null, treemapGradient: null })
  })

  it('ships ten distinct category colours per theme and swaps them with the theme', () => {
    setChartTheme('light')
    const light = [...CHART_COLORS]
    setChartTheme('dark')
    const dark = [...CHART_COLORS]

    expect(light).toHaveLength(10)
    expect(new Set(light).size).toBe(10)
    expect(dark).toHaveLength(10)
    expect(new Set(dark).size).toBe(10)
    expect(dark).not.toEqual(light)
  })

  it('switches the prevalence ramp with the theme', () => {
    setChartTheme('light')
    const light = [...prevalenceRamp()]
    setChartTheme('dark')
    const dark = [...prevalenceRamp()]

    expect(light).toHaveLength(5)
    expect(dark).toHaveLength(5)
    expect(dark).not.toEqual(light)
  })

  it('colours the clinical-domain treemap from the active theme ramp', () => {
    setChartTheme('light')
    const light = asOpts(clinicalDomainTreemapOptions([{ name: 'a', value: 1 }]))
    expect(light.series[0].color).toEqual([...prevalenceRamp()])
    setChartTheme('dark')
    const dark = asOpts(clinicalDomainTreemapOptions([{ name: 'a', value: 1 }]))
    expect(dark.series[0].color).toEqual([...prevalenceRamp()])
  })

  it('flips subtle text and in-mark labels between themes and back', () => {
    setChartTheme('light')
    const lightSubtle = CHART_SUBTLE_TEXT
    const lightOnMark = CHART_LABEL_ON_MARK
    setChartTheme('dark')
    expect(CHART_SUBTLE_TEXT).not.toBe(lightSubtle)
    expect(CHART_LABEL_ON_MARK).not.toBe(lightOnMark)
    setChartTheme('light')
    expect(CHART_SUBTLE_TEXT).toBe(lightSubtle)
    expect(CHART_LABEL_ON_MARK).toBe(lightOnMark)
  })

  it('advances the theme revision on every change', () => {
    const before = trackChartTheme()
    setChartTheme('dark')
    expect(trackChartTheme()).toBeGreaterThan(before)
  })
})

describe('default English labels', () => {
  afterEach(() => setChartLabelResolver(null))

  it('falls back to the default when the resolver returns undefined', () => {
    setChartLabelResolver(() => undefined)
    const opts = asOpts(defaultBarChartOptions({ categories: ['a'], values: [1] }))
    expect(opts.series[0].name).toBe('Count')
  })

  it('names bar, pie and line series and axes', () => {
    expect(asOpts(defaultBarChartOptions({ categories: ['a'], values: [1] })).series[0].name).toBe('Count')
    expect(asOpts(defaultBarChartOptions({ categories: ['a'], values: [1], unit: 'People' })).series[0].name).toBe('People')
    expect(asOpts(defaultPieChartOptions([{ name: 'a', value: 1 }])).series[0].name).toBe('Distribution')
    expect(asOpts(defaultPieChartOptions([{ name: 'a', value: 1 }], 'Race')).series[0].name).toBe('Race')
    expect(asOpts(defaultLineChartOptions({ xAxis: ['a'], yAxis: [1] })).series[0].name).toBe('Value')
    expect(asOpts(dashboardGenderPieOptions([{ name: 'M', value: 1 }])).series[0].name).toBe('Gender Distribution')
    expect(asOpts(boxPlotChartOptions([])).yAxis.name).toBe('Value')
  })
})

describe('SI number formatting (via the bar y-axis formatter)', () => {
  const fmt = axisFmt(asOpts(defaultBarChartOptions({ categories: ['a'], values: [1] })).yAxis)

  it('formats zero, small, negative and large values', () => {
    expect(fmt(0)).toBe('0')
    expect(fmt(999)).toBe('999')
    expect(fmt(-5)).toBe('-5')
    expect(fmt(1000)).toBe('1.0k')
    expect(fmt(-1500)).toBe('-1.5k')
    expect(fmt(3e6)).toBe('3.0M')
    expect(fmt(1.5e9)).toBe('1.5B')
    expect(fmt(1e12)).toBe('1.0T')
  })

  it('passes non-finite values through', () => {
    expect(fmt(Infinity)).toBe('Infinity')
  })
})

describe('defaultBarChartOptions', () => {
  const cats = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`)
  const rotate = (n: number) =>
    asOpts(defaultBarChartOptions({ categories: cats(n), values: [] })).xAxis.axisLabel.rotate

  it('tiers x-label rotation by category count', () => {
    expect(rotate(8)).toBe(0)
    expect(rotate(9)).toBe(30)
    expect(rotate(14)).toBe(30)
    expect(rotate(15)).toBe(45)
  })

  it('formats the tooltip with SI value and unit for single or array params', () => {
    const opts = asOpts(defaultBarChartOptions({ categories: ['Jan'], values: [1500], unit: 'People' }))
    const param = { name: 'Jan', seriesName: 'People', value: 1500 }
    expect(opts.tooltip.formatter([param])).toBe('Jan<br/>People: <strong>1.5k People</strong>')
    expect(opts.tooltip.formatter(param)).toBe('Jan<br/>People: <strong>1.5k People</strong>')
    const noUnit = asOpts(defaultBarChartOptions({ categories: ['Jan'], values: [2] }))
    expect(noUnit.tooltip.formatter(param)).toBe('Jan<br/>People: <strong>1.5k</strong>')
  })

  it('uses a category x-axis, a value y-axis and an axis tooltip', () => {
    const opts = asOpts(defaultBarChartOptions({ categories: ['a'], values: [1] }))
    expect(opts.xAxis.type).toBe('category')
    expect(opts.yAxis.type).toBe('value')
    expect(opts.tooltip.trigger).toBe('axis')
  })
})

describe('defaultPieChartOptions', () => {
  const data = Array.from({ length: 11 }, (_, i) => ({ name: `n${i}`, value: i + 1 }))

  it('formats the tooltip and lists every slice in the legend', () => {
    const opts = asOpts(defaultPieChartOptions(data))
    expect(opts.tooltip.formatter({ name: 'A', value: 2500, percent: 12.345 })).toBe(
      'A<br/><strong>2.5k</strong> (12.3%)'
    )
    expect(opts.legend?.data).toEqual(data.map(d => d.name))
    expect(opts.tooltip.trigger).toBe('item')
    expect(opts.series[0].type).toBe('pie')
    expect(opts.series[0].label?.formatter).toBe('{d}%')
  })

  it('cycles slice colours through the palette', () => {
    const series = asOpts(defaultPieChartOptions(data)).series[0].data as Array<{ itemStyle: { color: string } }>
    expect(series[10].itemStyle.color).toBe(CHART_COLORS[0])
    expect(series[1].itemStyle.color).toBe(CHART_COLORS[1])
  })
})

describe('defaultLineChartOptions', () => {
  it('formats tooltip and y-axis values', () => {
    const opts = asOpts(defaultLineChartOptions({ xAxis: ['a'], yAxis: [1] }))
    const param = { name: 'a', seriesName: 'S', value: 2e6 }
    expect(opts.tooltip.formatter(param)).toBe('a<br/>S: <strong>2.0M</strong>')
    expect(opts.tooltip.formatter([param])).toBe('a<br/>S: <strong>2.0M</strong>')
    expect(axisFmt(opts.yAxis)(4000)).toBe('4.0k')
    expect(opts.yAxis.type).toBe('value')
  })
})

describe('line x-axis (via multiLineChartOptions)', () => {
  const series = [{ name: 'S', data: [1] }]

  it('rotates category labels only above 24 categories', () => {
    const cats = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`)
    expect(asOpts(multiLineChartOptions({ categories: cats(24), series })).xAxis.axisLabel.rotate).toBe(0)
    expect(asOpts(multiLineChartOptions({ categories: cats(25), series })).xAxis.axisLabel.rotate).toBe(45)
  })

  it('tolerates missing categories on a category axis', () => {
    const x = asOpts(multiLineChartOptions({ series })).xAxis
    expect(x.type).toBe('category')
    expect(x.data).toEqual([])
    expect(x.boundaryGap).toBe(false)
    expect(x.axisLabel.rotate).toBe(0)
  })
})

describe('defaultTreemapOptions', () => {
  afterEach(() => setChartPalette({ chartColors: null, treemapGradient: null }))

  const tooltip = (p: unknown) => asOpts(defaultTreemapOptions([{ name: 'x', value: 1 }])).tooltip.formatter(p)
  const indent = '    '

  it('renders the tree path one indented line per level, skipping the unnamed root', () => {
    expect(
      tooltip({ name: 'Leaf', value: 1500, treePathInfo: [{ name: '' }, { name: 'Group' }, { name: 'Leaf' }] })
    ).toBe(`Group<br/>${indent}Leaf<br/><strong>1.5k</strong>`)
  })

  it('falls back to the concept path, dropping NA parts and trimming', () => {
    expect(
      tooltip({ name: 'Leaf', value: 2, treePathInfo: [], data: { conceptPath: ' A || NA ||B ' } })
    ).toBe(`A<br/>${indent}B<br/><strong>2</strong>`)
  })

  it('falls back to the node name without path info or data', () => {
    expect(tooltip({ name: 'Leaf', value: 2 })).toBe('Leaf<br/><strong>2</strong>')
  })

  it('builds the value legend from the finite leaf range', () => {
    const nodes = [
      { name: 'g', value: Infinity, children: [{ name: 'a', value: 2000 }, { name: 'b', value: NaN }] },
      { name: 'c', value: 5000 },
    ] as TreemapNode[]
    const vm = asOpts(defaultTreemapOptions(nodes)).visualMap
    expect(vm?.min).toBe(2000)
    expect(vm?.max).toBe(5000)
    expect(vm?.text).toEqual(['5.0k', '2.0k'])
    expect(vm?.show).toBe(true)
    expect(vm?.type).toBe('continuous')
    expect(vm?.inRange.color).toEqual([...TREEMAP_GRADIENT])
  })

  it('defaults the legend range to 0..1 without numeric values', () => {
    const vm = asOpts(defaultTreemapOptions([])).visualMap
    expect(vm?.min).toBe(0)
    expect(vm?.max).toBe(1)
  })

  type Painted = { name: string; itemStyle: { color: string }; children?: Painted[] }
  const paint = (nodes: TreemapNode[]) => asOpts(defaultTreemapOptions(nodes)).series[0].data as Painted[]

  it('paints leaves along the gradient with a lifted floor', () => {
    setChartPalette({ treemapGradient: ['#000000', '#ffffff'] })
    const painted = paint([
      { name: 'a', value: 10 },
      { name: 'b', value: 20 },
      { name: 'c', value: 30 },
    ])
    expect(painted.map(n => n.itemStyle.color)).toEqual(['#262626', '#939393', '#ffffff'])
  })

  it('paints a group by the size-weighted mean of its leaves', () => {
    setChartPalette({ treemapGradient: ['#000000', '#ffffff'] })
    const [group] = paint([
      {
        name: 'g',
        value: 40,
        children: [
          { name: 'a', value: 10, colorValue: 1 },
          { name: 'b', value: 30, colorValue: 3 },
        ],
      },
    ])
    expect(group.itemStyle.color).toBe('#c9c9c9')
    expect(group.children?.map(n => n.itemStyle.color)).toEqual(['#262626', '#ffffff'])
  })

  it('falls back to the group value when its leaves weigh nothing', () => {
    setChartPalette({ treemapGradient: ['#000000', '#ffffff'] })
    const painted = paint([
      { name: 'p', value: 100, children: [{ name: 'c', value: 0, colorValue: 5 }] },
      { name: 'l', value: 10, colorValue: 1 },
    ])
    expect(painted[0].itemStyle.color).toBe('#ffffff')
    expect(painted[0].children?.[0].itemStyle.color).toBe('#ffffff')
    expect(painted[1].itemStyle.color).toBe('#262626')
  })

  it('uses a single-stop gradient as a flat colour', () => {
    setChartPalette({ treemapGradient: ['#123456'] })
    const painted = paint([
      { name: 'a', value: 1 },
      { name: 'b', value: 9 },
    ])
    expect(painted.map(n => n.itemStyle.color)).toEqual(['#123456', '#123456'])
  })
})

describe('createResizeHandler', () => {
  afterEach(() => vi.useRealTimers())

  it('skips charts that do not expose isDisposed', () => {
    vi.useFakeTimers()
    const resize = vi.fn()
    const handler = createResizeHandler({ resize } as unknown as { isDisposed: () => boolean; resize: () => void }, 10)
    handler()
    expect(() => vi.advanceTimersByTime(20)).not.toThrow()
    expect(resize).not.toHaveBeenCalled()
  })
})

describe('dashboardGenderPieOptions', () => {
  it('formats the tooltip with count and percentage labels', () => {
    const opts = asOpts(dashboardGenderPieOptions([{ name: 'MALE', value: 1 }]))
    expect(opts.tooltip.formatter({ name: 'MALE', value: 1200, percent: 48.25 })).toBe(
      '<strong>MALE</strong><br/>Count: 1.2k<br/>Percentage: 48.3%'
    )
    expect(opts.series[0].label?.formatter).toBe('{b}\n{d}%')
  })
})

describe('dashboardAgeBarOptions', () => {
  const base = { intervalSize: 10, offset: 0 }

  it('keeps only finite, non-negative bins', () => {
    const opts = asOpts(
      dashboardAgeBarOptions({
        ...base,
        bins: [
          { intervalIndex: 0, countValue: 5 },
          { intervalIndex: NaN, countValue: 3 },
          { intervalIndex: 1, countValue: Infinity },
          { intervalIndex: 2, countValue: -1 },
        ],
      })
    )
    expect(opts.series[0].data).toEqual([[0, 10, 5]])
  })

  it('spans the x-axis from the first bin start to the last bin end', () => {
    const opts = asOpts(
      dashboardAgeBarOptions({
        ...base,
        bins: [
          { intervalIndex: 2, countValue: 1 },
          { intervalIndex: 0, countValue: 1 },
        ],
      })
    )
    expect(opts.xAxis.min).toBe(0)
    expect(opts.xAxis.max).toBe(30)
    expect(opts.xAxis.type).toBe('value')
    expect(opts.yAxis.type).toBe('value')
    expect(opts.series[0].type).toBe('custom')
  })

  it('names the series and axes from seriesName, unit, then defaults', () => {
    const bins = [{ intervalIndex: 0, countValue: 1 }]
    const named = asOpts(dashboardAgeBarOptions({ ...base, bins, seriesName: 'People', unit: 'u' }))
    expect(named.series[0].name).toBe('People')
    expect(named.yAxis.name).toBe('u')
    const unit = asOpts(dashboardAgeBarOptions({ ...base, bins, unit: 'u' }))
    expect(unit.series[0].name).toBe('u')
    const plain = asOpts(dashboardAgeBarOptions({ ...base, bins }))
    expect(plain.series[0].name).toBe('Count')
    expect(plain.yAxis.name).toBe('Person Count')
    expect(plain.xAxis.name).toBe('Age')
  })

  it('formats tooltips for ranges, single-width bins and missing points', () => {
    const bins = [{ intervalIndex: 0, countValue: 1 }]
    const ranged = asOpts(dashboardAgeBarOptions({ ...base, bins }))
    expect(ranged.tooltip.formatter({ data: [10, 20, 1500] })).toBe(
      '<strong>Age: 10 - 20</strong><br/>Count: 1.5k'
    )
    expect(ranged.tooltip.formatter({})).toBe('')
    const single = asOpts(dashboardAgeBarOptions({ intervalSize: 1, offset: 0, bins, xAxisLabel: 'Days' }))
    expect(single.tooltip.formatter({ data: [2.5, 3.5, 4] })).toBe('<strong>Days: 2.5</strong><br/>Count: 4')
  })

  it('rounds fractional x ticks to one decimal', () => {
    const opts = asOpts(dashboardAgeBarOptions({ ...base, bins: [{ intervalIndex: 0, countValue: 1 }] }))
    expect(axisFmt(opts.xAxis)(3)).toBe('3')
    expect(axisFmt(opts.xAxis)(0.082)).toBe('0.1')
    expect(axisFmt(opts.yAxis)(2000)).toBe('2.0k')
  })
})

describe('dashboardCumulativeLineOptions', () => {
  const data = {
    categories: [],
    xValues: [1, 2],
    series: [
      { name: 'A', data: [0.1, 0.2] },
      { name: 'B', data: [0.3, 0.4] },
    ],
  }

  it('formats the tooltip with default or supplied axis labels', () => {
    const opts = asOpts(dashboardCumulativeLineOptions(data))
    expect(opts.tooltip.formatter({ value: [2, 0.5] })).toBe(
      '<strong>Years: 2</strong><br/>Percentage: 50.0%'
    )
    const labelled = asOpts(dashboardCumulativeLineOptions({ ...data, xAxisLabel: 'Days', yAxisLabel: 'Share' }))
    expect(labelled.tooltip.formatter([{ value: [3, 0.25] }])).toBe('<strong>Days: 3</strong><br/>Share: 25.0%')
  })

  it('labels axes and formats the y-axis as a percentage', () => {
    const opts = asOpts(dashboardCumulativeLineOptions(data))
    expect(opts.xAxis.name).toBe('Years')
    expect(opts.yAxis.name).toBe('Percent of Persons')
    expect(axisFmt(opts.yAxis)(0.456)).toBe('46%')
  })

  it('colours each series and its area from its own palette slot', () => {
    const opts = asOpts(dashboardCumulativeLineOptions(data))
    expect(opts.series[1].itemStyle?.color).toBe(CHART_COLORS[1])
    expect(opts.series[1].areaStyle?.color.colorStops.map(s => s.color)).toEqual([
      CHART_COLORS[1] + '50',
      CHART_COLORS[1] + '10',
    ])
  })
})

describe('dashboardObservationMonthLineOptions', () => {
  const data = {
    categories: [],
    monthCodes: [200303],
    series: [
      { name: 'A', data: [1] },
      { name: 'B', data: [2] },
    ],
  }

  it('formats the tooltip as MM/YYYY with an SI count', () => {
    const opts = asOpts(dashboardObservationMonthLineOptions(data))
    expect(opts.tooltip.formatter({ value: [Date.UTC(2003, 2, 1), 1500] })).toBe(
      '<strong>03/2003</strong><br/>Observations: 1.5k'
    )
    expect(opts.tooltip.formatter([{ value: [Date.UTC(2010, 11, 1), 7] }])).toBe(
      '<strong>12/2010</strong><br/>Observations: 7'
    )
  })

  it('uses a time x-axis with default labels and an SI y-axis', () => {
    const opts = asOpts(dashboardObservationMonthLineOptions(data))
    expect(opts.xAxis.type).toBe('time')
    expect(opts.xAxis.name).toBe('Month')
    expect(opts.yAxis.name).toBe('Observation Count')
    expect(axisFmt(opts.yAxis)(5e6)).toBe('5.0M')
    expect(opts.series[1].type).toBe('line')
    expect(opts.series[1].itemStyle?.color).toBe(CHART_COLORS[1])
  })
})

describe('multiLineChartOptions', () => {
  const series = [
    { name: 'A', data: [0.5] },
    { name: 'B', data: [0.25] },
  ]

  it('formats SI values unless yAxisFormat is percent', () => {
    const si = asOpts(multiLineChartOptions({ categories: ['x'], series, yAxisFormat: 'si' }))
    expect(axisFmt(si.yAxis)(2000)).toBe('2.0k')
    expect(si.tooltip.formatter([{ name: 'x', seriesName: 'A', value: 2000 }])).toBe(
      '<strong>x</strong><br/>A: <strong>2.0k</strong>'
    )
    const pct = asOpts(multiLineChartOptions({ categories: ['x'], series, yAxisFormat: 'percent' }))
    expect(axisFmt(pct.yAxis)(0.456)).toBe('46%')
  })

  it('builds one tooltip line per series and prefers the axis value label', () => {
    const opts = asOpts(multiLineChartOptions({ categories: ['x'], series, yAxisFormat: 'percent' }))
    expect(
      opts.tooltip.formatter([
        { axisValueLabel: 'Jan', name: 'n', seriesName: 'A', value: [1, 0.5] },
        { name: 'n', seriesName: 'B', value: 0.25 },
      ])
    ).toBe('<strong>Jan</strong><br/>A: <strong>50.0%</strong><br/>B: <strong>25.0%</strong>')
    expect(opts.tooltip.formatter([{ name: 'n', value: 'abc' }])).toBe('<strong>n</strong><br/>: <strong>abc</strong>')
    expect(opts.tooltip.formatter([{ value: 0.1 }])).toBe('<strong></strong><br/>: <strong>10.0%</strong>')
    expect(opts.tooltip.formatter([])).toBe('')
  })

  it('lists series names in the legend', () => {
    expect(asOpts(multiLineChartOptions({ categories: ['x'], series })).legend?.data).toEqual(['A', 'B'])
  })
})

describe('clinicalDomainTreemapOptions tooltip', () => {
  const fmt = asOpts(clinicalDomainTreemapOptions([{ name: 'a', value: 1 }])).tooltip.formatter

  it('includes prevalence and metric when present', () => {
    expect(fmt({ name: 'Flu', value: 1500, data: { prevalence: 1.234, metric: 0.5 } })).toBe(
      '<strong>Flu</strong><br/>Value: 1.5k<br/>Prevalence: 1.23%<br/>Metric: 0.50'
    )
  })

  it('omits them without node data', () => {
    expect(fmt({ name: 'Flu', value: 3 })).toBe('<strong>Flu</strong><br/>Value: 3<br/>')
  })
})

describe('trellisChartOptions', () => {
  interface Title {
    text: string
    top: string
    left: string
  }
  interface Grid {
    width: string
    height: string
    left: string
    top: string
  }
  interface TrellisOpts {
    title: Title[]
    grid: Grid[]
    xAxis: Axis[]
    yAxis: Axis[]
    series: Series[]
    legend: { data: string[] }
    tooltip: { trigger: string }
  }
  const trellis = (data: TrellisChartData, title?: string, perRow?: number) =>
    trellisChartOptions(data, title, perRow) as unknown as TrellisOpts

  const sixCategories: TrellisChartData = {
    categories: ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59'],
    series: [
      { name: 'Male', category: '0-9', data: [{ x: 2001, y: 1.2 }] },
      { name: 'Male', category: '50-59', data: [{ x: 2001, y: 7.8 }] },
    ],
  }

  it('lays out a grid of small multiples with header and footer', () => {
    const opts = trellis(sixCategories, undefined, 4)
    expect(opts.grid).toHaveLength(6)
    expect(opts.xAxis).toHaveLength(6)
    expect(opts.yAxis).toHaveLength(6)
    expect(opts.series).toHaveLength(2)
    expect(opts.title).toHaveLength(8)

    expect(opts.title[0]).toMatchObject({ text: 'Age Group / Gender', top: '2%', left: 'center' })
    expect(opts.title[1]).toMatchObject({ text: 'Year', top: '85%', left: 'center' })

    expect(opts.grid[5]).toMatchObject({ width: '22%', height: '28%', left: '30.25%', top: '51%' })
    expect(opts.title[7]).toMatchObject({ text: '50-59', top: '48%', left: '41.25%' })
    expect(opts.grid[0]).toMatchObject({ left: '7%', top: '9%' })
  })

  it('moves the header down under a main title', () => {
    const opts = trellis(sixCategories, 'Prevalence', 4)
    expect(opts.title[0].text).toBe('Prevalence')
    expect(opts.title[1].top).toBe('8%')
    expect(opts.title).toHaveLength(9)
  })

  it('shares one y range and labels only the leftmost column', () => {
    const opts = trellis(sixCategories, undefined, 4)
    expect(opts.yAxis[0]).toMatchObject({
      type: 'value',
      min: 1,
      max: 8,
      gridIndex: 0,
      name: 'Prevalence Per 1000 People',
      nameLocation: 'middle',
      nameRotate: 90,
      position: 'left',
    })
    expect(opts.yAxis[0].axisLabel.show).toBe(true)
    expect(opts.yAxis[1].axisLabel.show).toBe(false)
    expect(opts.yAxis[1].name).toBeUndefined()
    expect(opts.yAxis[1].min).toBe(1)
  })

  it('sorts categories by numeric prefix, falling back to text order', () => {
    const opts = trellis(
      { categories: ['b2', '10-19', 'a10', 'Unknown', '2-9'], series: [{ name: 'M', category: '2-9', data: [{ x: 1, y: 1 }] }] },
      undefined,
      5
    )
    expect(opts.title.slice(2).map(t => t.text)).toEqual(['2-9', '10-19', 'a10', 'b2', 'Unknown'])
  })

  it('maps each category series onto its sorted year axis', () => {
    const opts = trellis({
      categories: ['A', 'B'],
      series: [
        { name: 'Male', category: 'A', data: [{ x: '2003', y: 3.456 }, { x: 2001, y: 1 }] },
        { name: 'Female', category: 'A', data: [{ x: 2002, y: 2 }] },
        { name: 'Male', category: 'B', data: [{ x: 2001, y: 5 }] },
      ],
    })
    expect(opts.xAxis[0]).toMatchObject({ type: 'category', gridIndex: 0, boundaryGap: false })
    expect(opts.xAxis[0].data).toEqual([2001, 2002, 2003])
    expect(opts.xAxis[1].data).toEqual([2001])
    expect(opts.series.map(s => [s.name, s.type, s.xAxisIndex, s.yAxisIndex])).toEqual([
      ['Male', 'line', 0, 0],
      ['Female', 'line', 0, 0],
      ['Male', 'line', 1, 1],
    ])
    expect(opts.series[0].data).toEqual([1, null, 3.46])
    expect(opts.series[1].data).toEqual([null, 2, null])
    expect(opts.series[2].data).toEqual([5])
    expect(opts.legend.data).toEqual(['Male', 'Female'])
    expect(opts.tooltip.trigger).toBe('axis')
  })
})

describe('boxPlotChartOptions', () => {
  const row = (category: string, over: Partial<BoxPlotData> = {}): BoxPlotData => ({
    category,
    min: 5,
    p10: 10,
    p25: 25,
    median: 50,
    p75: 75,
    p90: 90,
    max: 100,
    ...over,
  })

  it('maps rows to [min, p25, median, p75, max] boxes', () => {
    const opts = asOpts(boxPlotChartOptions([row('A')]))
    expect(opts.series[0]).toMatchObject({ name: 'boxplot', type: 'boxplot' })
    expect(opts.series[0].data).toEqual([[5, 25, 50, 75, 100]])
    expect(opts.series[1]).toMatchObject({ name: 'outlier', type: 'scatter' })
    expect(opts.xAxis).toMatchObject({ type: 'category', data: ['A'] })
    expect(opts.yAxis.type).toBe('value')
    expect(axisFmt(opts.yAxis)(1500)).toBe('1.5k')
  })

  it('plots p10/p90 as outliers only when they fall outside the whiskers', () => {
    const opts = asOpts(
      boxPlotChartOptions([row('A', { p10: 1, p90: 120 }), row('B', { p10: 5, p90: 100 })])
    )
    expect(opts.series[1].data).toEqual([
      [0, 1],
      [0, 120],
    ])
  })

  it('rotates labels for more than five categories', () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => row(`c${i}`))
    expect(asOpts(boxPlotChartOptions(rows(5))).xAxis.axisLabel.rotate).toBe(0)
    expect(asOpts(boxPlotChartOptions(rows(6))).xAxis.axisLabel.rotate).toBe(45)
  })

  it('formats the boxplot tooltip with p10/p90 and N/A fallbacks', () => {
    const data = [row('A'), row('B', { p90: null as unknown as number, p10: null as unknown as number })]
    const fmt = asOpts(boxPlotChartOptions(data)).tooltip.formatter
    const value = [0, 5, 25, 50, 75, 1500]
    expect(squash(fmt({ seriesType: 'boxplot', name: 'A', dataIndex: 0, value }))).toBe(
      'A<br/> Max: 1.5k<br/> P90: 90<br/> P75: 75<br/> Median: 50<br/> P25: 25<br/> P10: 10<br/> Min: 5'
    )
    expect(squash(fmt({ seriesType: 'boxplot', name: 'B', dataIndex: 1, value }))).toContain('P90: N/A<br/> P75')
    expect(squash(fmt({ seriesType: 'boxplot', name: 'B', dataIndex: 1, value }))).toContain('P10: N/A<br/> Min')
    expect(squash(fmt({ seriesType: 'boxplot', name: 'Z', dataIndex: 9, value }))).toContain('P90: N/A')
    expect(fmt({ seriesType: 'scatter', name: 'outlier' })).toBe('outlier')
  })

  it('formats the per-series boxplot tooltip', () => {
    const fmt = asOpts(boxPlotChartOptions([row('A')])).series[0].tooltip?.formatter as Fmt
    expect(squash(fmt({ name: 'A', value: [0, 5, 25, 50, 75, 100] }))).toBe(
      'A<br/> Max: 100<br/> P75: 75<br/> Median: 50<br/> P25: 25<br/> Min: 5'
    )
  })
})
