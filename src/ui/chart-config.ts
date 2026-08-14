/**
 * ECharts Configuration Utilities
 *
 * Provides default configuration helpers for all chart types
 */

import { shallowRef } from 'vue'
import type { EChartsOption } from 'echarts'
import type { BarChartData, PieChartData, LineChartData, TreemapNode } from '@/models/report.types'
import { tokens } from './tokens'

/**
 * Convert a YYYYMM code (e.g. 200301) to a UTC millisecond timestamp
 * positioned at the first day of that month. Used for time-axis charts.
 */
export function parseYyyymm(code: number | string): number {
  const s = String(code)
  const year = Number(s.slice(0, 4))
  const month = Number(s.slice(-2))
  return Date.UTC(year, month - 1, 1)
}

function buildLineXAxis(data: { xAxisType?: string; categories?: string[]; xAxisLabel?: string }) {
  const type = data.xAxisType ?? 'category'
  if (type === 'category') {
    return {
      type: 'category' as const,
      boundaryGap: false,
      data: data.categories ?? [],
      axisLabel: {
        rotate: (data.categories?.length ?? 0) > 24 ? 45 : 0,
        hideOverlap: true,
        fontSize: 10,
      },
    }
  }
  return {
    type: type as 'value' | 'time',
    name: data.xAxisLabel,
    nameLocation: 'middle' as const,
    nameGap: 30,
    axisLabel: { fontSize: 10 },
  }
}

function mapLineSeriesData(
  data: { xAxisType?: string; monthCodes?: (number | string)[]; xValues?: number[] },
  values: number[]
): number[] | [number, number][] {
  const type = data.xAxisType ?? 'category'
  if (type === 'category') return values
  // Guard against missing scalar/time arrays (e.g. stripped by schema validation):
  // fall back to the point index rather than throwing during chart render.
  if (type === 'time')
    return values.map(
      (v, i) => [data.monthCodes?.[i] != null ? parseYyyymm(data.monthCodes[i]) : i, v] as [number, number]
    )
  return values.map((v, i) => [data.xValues?.[i] ?? i, v] as [number, number]) // value
}

/**
 * Format large numbers using SI notation (K, M, B, T)
 * Examples: 1000 → "1.0k", 3000000 → "3.0M", 1500000000 → "1.5B"
 */
function formatSINumber(value: number): string {
  if (value === 0) return '0'
  if (!Number.isFinite(value)) return String(value)

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  const thresholds = [
    { limit: 1e12, suffix: 'T' },
    { limit: 1e9, suffix: 'B' },
    { limit: 1e6, suffix: 'M' },
    { limit: 1e3, suffix: 'k' },
  ]

  for (const { limit, suffix } of thresholds) {
    if (absValue >= limit) {
      const scaled = absValue / limit
      return `${sign}${scaled.toFixed(1)}${suffix}`
    }
  }

  return sign + absValue.toLocaleString()
}

/**
 * Modern, restrained categorical palette for charts — Tableau 10.
 *
 * Atlas 2.15 used D3's d3.scale.category10 (bright, saturated). This
 * is the well-tested Tableau 10 alternative: same number of distinct
 * hues, lower saturation, better separation, more elegant on white
 * surfaces and alongside the Atlas navy chrome.
 *
 * Charts that pick a single color use CHART_COLORS[0]; multi-series
 * charts cycle through the array.
 */
const DEFAULT_CHART_COLORS: readonly string[] = [
  '#4e79a7', // blue
  '#f28e2c', // orange
  '#e15759', // red
  '#76b7b2', // teal
  '#59a14f', // green
  '#edc949', // mustard
  '#af7aa1', // purple
  '#ff9da7', // soft coral
  '#9c755f', // taupe
  '#bab0ab', // warm grey
]

// Deployments that brand Atlas override these via settings.theme (see
// setChartPalette). Every read happens inside the option builders below, at
// render time, so a palette applied during startup is picked up by charts
// mounted afterwards.
export let CHART_COLORS: readonly string[] = DEFAULT_CHART_COLORS

/**
 * Single-hue gradient used by treemaps and other "color-by-value"
 * surfaces. Encodes magnitude, not category — same semantic as
 * Atlas 2.15's treemapGradient (light → dark blue, where darker =
 * larger value).
 *
 * Anchored on the primary categorical chart colour (CHART_COLORS[0],
 * Tableau blue `#4e79a7`) so a treemap reads as part of the same
 * chart family. The light end is intentionally NOT a near-white tint
 * — small tiles would visually merge with the white page background.
 * `#7e9bbf` has ~3.5:1 contrast against white, the darkest end is
 * the Atlas brand navy `#1f425a` so the gradient tails into the
 * surrounding chrome.
 */
const DEFAULT_TREEMAP_GRADIENT: readonly string[] = ['#7e9bbf', '#4e79a7', '#1f425a']

export let TREEMAP_GRADIENT: readonly string[] = DEFAULT_TREEMAP_GRADIENT

/**
 * Dark-surface counterparts of the Tableau palette. Each entry clears 3:1
 * against the dark surface (#161618); the light values sit at 2.0–4.4:1 there
 * and would read as muddy smears.
 */
const DARK_CHART_COLORS: readonly string[] = [
  '#7fb3e0', // blue
  '#f6a04d', // orange
  '#f2777a', // red
  '#6fd0c8', // teal
  '#7bc96f', // green
  '#f0d264', // mustard
  '#c79bd1', // purple
  '#ffb3bb', // soft coral
  '#c49a80', // taupe
  '#c9c2bd', // warm grey
]

// The light gradient tails into the brand navy, which disappears against a dark
// surface at 1.95:1, so the dark ramp runs mid-blue to pale blue instead.
const DARK_TREEMAP_GRADIENT: readonly string[] = ['#4e79a7', '#7fb3e0', '#a8cdea']

// Five-stop prevalence ramp used by clinicalDomainTreemapOptions's built-in
// visualMap color scale (cell backgrounds, not marks on the page background).
const DEFAULT_PREVALENCE_RAMP: readonly string[] = [
  '#e3f2fd', // Very light blue (low prevalence)
  '#90caf9', // Light blue
  '#42a5f5', // Medium blue
  '#1e88e5', // Dark blue
  '#1565c0', // Very dark blue (high prevalence)
]

const DARK_PREVALENCE_RAMP: readonly string[] = ['#1b3a5c', '#2f5d8a', '#4a86c4', '#7fb3e0', '#b3d4f0']

let chartMode: 'light' | 'dark' = 'light'
let paletteOverride: readonly string[] | null = null
let gradientOverride: readonly string[] | null = null

// The palette bindings below are plain module-level `let`s, so a chart computed
// that reads them (directly or through an option builder) tracks nothing and
// keeps the previous theme's colours until its data changes. Every builder
// touches this revision so setChartTheme / setChartPalette invalidate them.
const chartThemeRevision = shallowRef(0)

/**
 * Register the active chart theme as a reactive dependency of the caller.
 * Call it from any computed that reads a CHART_* binding at compute time.
 */
export function trackChartTheme(): number {
  return chartThemeRevision.value
}

export let CHART_TEXT: string = tokens.color.onSurface
export let CHART_SUBTLE_TEXT: string = '#5e6470'
export let CHART_SURFACE: string = tokens.color.surface
export let CHART_LABEL_ON_MARK: string = '#ffffff'
export let CHART_MUTED_TEXT: string = '#6b6b6b'
export let CHART_GRID_BORDER: string = 'black'
export let CHART_BOX_BORDER: string = '#333'
export let CHART_OUTLIER_MARKER: string = 'rgba(255, 0, 0, 0.5)'

function applyPalettes(): void {
  const themeColors = chartMode === 'dark' ? DARK_CHART_COLORS : DEFAULT_CHART_COLORS
  const themeGradient = chartMode === 'dark' ? DARK_TREEMAP_GRADIENT : DEFAULT_TREEMAP_GRADIENT
  CHART_COLORS = paletteOverride?.length ? [...paletteOverride] : themeColors
  TREEMAP_GRADIENT = gradientOverride?.length ? [...gradientOverride] : themeGradient

  const set = chartMode === 'dark' ? tokens.colorDark : tokens.color
  CHART_TEXT = set.onSurface
  // #5e6470 is the light-mode axis grey; on the dark surface it sits at 3.04:1,
  // so dark falls back to the on-surface-variant token at 7.05:1.
  CHART_SUBTLE_TEXT = chartMode === 'dark' ? set.onSurfaceVariant : '#5e6470'
  CHART_SURFACE = set.surface
  // Dark marks are light fills, so their in-mark labels flip to near-black.
  CHART_LABEL_ON_MARK = chartMode === 'dark' ? 'rgba(0,0,0,.87)' : '#ffffff'
  // #6b6b6b is a text label (trellis section headers); needs the 4.5:1 text
  // floor, not just the 3:1 non-text floor, so it shares onSurfaceVariant
  // (7.05:1) with CHART_SUBTLE_TEXT rather than a dimmer border token.
  CHART_MUTED_TEXT = chartMode === 'dark' ? set.onSurfaceVariant : '#6b6b6b'
  // Grid frame and boxplot outlines are decorative (3:1 floor); outlineStrong
  // clears 3.34:1 against the dark surface.
  CHART_GRID_BORDER = chartMode === 'dark' ? set.outlineStrong : 'black'
  CHART_BOX_BORDER = chartMode === 'dark' ? set.outlineStrong : '#333'
  // No token is red; light stays at its pre-existing 2.44:1 (unrelated,
  // out of scope). Dark only needs a value that clears 3:1 on its own.
  CHART_OUTLIER_MARKER = chartMode === 'dark' ? 'rgba(255,107,107,0.7)' : 'rgba(255, 0, 0, 0.5)'
  chartThemeRevision.value++
}

/**
 * Override the chart palettes from `settings.theme` (chartColors /
 * treemapGradient). Passing null or an empty array restores the theme default, so a
 * deployment can override one palette without pinning the other.
 */
export function setChartPalette(palette: {
  chartColors?: readonly string[] | null
  treemapGradient?: readonly string[] | null
}): void {
  paletteOverride = palette.chartColors ?? null
  gradientOverride = palette.treemapGradient ?? null
  applyPalettes()
}

export function setChartTheme(mode: 'light' | 'dark'): void {
  chartMode = mode
  applyPalettes()
}

/**
 * Root-level `textStyle` default for ECharts option objects. Text elements
 * that don't set their own colour (axis names, tooltip labels ECharts draws
 * internally, etc.) otherwise fall back to ECharts' own dark-grey default,
 * which is invisible on the dark surface. Light omits the key entirely so
 * light-mode options stay byte-identical to before this default existed.
 */
export function chartRootTextStyle(): { textStyle: { color: string } } | Record<string, never> {
  return chartMode === 'dark' ? { textStyle: { color: CHART_TEXT } } : {}
}

/**
 * Default bar chart configuration
 */
export function defaultBarChartOptions(data: BarChartData): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: unknown) => {
        const paramsArray = Array.isArray(params) ? params : [params]
        const param = paramsArray[0] as { name: string; seriesName: string; value: number }
        const value = formatSINumber(param.value)
        const unit = data.unit ? ` ${data.unit}` : ''
        return `${param.name}<br/>${param.seriesName}: <strong>${value}${unit}</strong>`
      },
    },
    grid: {
      // Use absolute pixel values so the y-axis name and the chart
      // title don't overlap with the chart body when stacked
      // vertically (the previous percentage values gave inconsistent
      // gaps depending on chart height). 56px top leaves room for
      // the y-axis name; 16px bottom reserves space for the x-axis
      // line itself.
      left: 16,
      right: 24,
      bottom: 16,
      top: 56,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.categories,
      axisLabel: {
        // Tier the rotation so labels don't overlap on dense X
        // axes. Up to 8 categories → horizontal; up to 14 → 30°;
        // 15+ → 45°. Matches what Tableau / Apache Superset do
        // with categorical axes.
        rotate: data.categories.length > 14 ? 45 : data.categories.length > 8 ? 30 : 0,
        interval: 0,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      name: data.unit || 'Count',
      // Render the y-axis name vertically along the LEFT side of
      // the axis (rotated 90°) instead of the default top-of-axis
      // placement. The top placement bled into the previous chart's
      // bottom area when charts are stacked vertically — vertical
      // along-axis placement keeps the name inside the chart's own
      // bounds.
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 40,
      nameTextStyle: {
        color: CHART_SUBTLE_TEXT,
        fontSize: 12,
      },
      axisLabel: {
        formatter: (value: number) => formatSINumber(value),
      },
    },
    series: [
      {
        name: data.unit || 'Count',
        type: 'bar',
        data: data.values,
        itemStyle: {
          color: CHART_COLORS[0],
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }
}

/**
 * Default pie chart configuration
 */
export function defaultPieChartOptions(data: PieChartData[], title?: string): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    title: title
      ? {
          text: title,
          left: 'center',
          top: '5%',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        const value = formatSINumber(p.value)
        const percent = p.percent.toFixed(1)
        return `${p.name}<br/><strong>${value}</strong> (${percent}%)`
      },
    },
    legend: {
      // Horizontal legend along the bottom so long category names (e.g. ethnicity)
      // never sit on top of the pie. Scrolls + truncates if there are many/long
      // entries; the full name shows on legend hover.
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      type: 'scroll',
      textStyle: {
        overflow: 'truncate',
        width: 120,
      },
      tooltip: { show: true },
      data: data.map(item => item.name),
    },
    series: [
      {
        name: title || 'Distribution',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 10,
          borderColor: CHART_SURFACE,
          borderWidth: 2,
        },
        // Percentage drawn inside the ring (no leader lines that overflow the card
        // edge); category names live in the legend below.
        label: {
          show: true,
          position: 'inside',
          formatter: '{d}%',
          color: CHART_LABEL_ON_MARK,
          fontSize: 11,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
        })),
      },
    ],
  }
}

/**
 * Default line chart configuration
 */
export function defaultLineChartOptions(data: LineChartData, title?: string): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    title: title
      ? {
          text: title,
          left: 'center',
          top: '5%',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
      const paramsArray = Array.isArray(params) ? params : [params]
      const param = paramsArray[0] as { name: string; seriesName: string; value: number }
      const value = formatSINumber(param.value)
        return `${param.name}<br/>${param.seriesName}: <strong>${value}</strong>`
      },
    },
    grid: {
      // Absolute pixels for predictable spacing — see
      // defaultBarChartOptions for the same rationale. Add extra
      // top room when a chart title is rendered.
      left: 16,
      right: 24,
      bottom: 16,
      top: title ? 80 : 56,
      containLabel: true,
    },
    xAxis: buildLineXAxis({ ...data, categories: data.categories ?? (data.xAxis as string[]) }),
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => formatSINumber(value),
      },
    },
    series: [
      {
        name: data.seriesName || 'Value',
        type: 'line',
        smooth: true,
        data: mapLineSeriesData(data, data.yAxis),
        itemStyle: {
          color: CHART_COLORS[0],
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: CHART_COLORS[0] + '80' },
              { offset: 1, color: CHART_COLORS[0] + '10' },
            ],
          },
        },
        emphasis: {
          focus: 'series',
        },
      },
    ],
  }
}

/**
 * Default treemap configuration
 */
export function defaultTreemapOptions(data: TreemapNode[], title?: string): EChartsOption {
  trackChartTheme()
  const { min: dataMin, max: dataMax } = extractTreemapValueRange(data)
  return {
    ...chartRootTextStyle(),
    title: title
      ? {
          text: title,
          left: 'center',
          top: '5%',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; data?: { conceptPath?: string } }
        const value = formatSINumber(p.value)

        // Format the concept path with newlines and tabs
        let displayName = p.name
        if (p.data?.conceptPath) {
          const parts = p.data.conceptPath.split('||')
          displayName = parts
            .map((part, index) => {
              const tabs = '\u00A0\u00A0\u00A0\u00A0'.repeat(index) // 4 non-breaking spaces per level
              return tabs + part.trim()
            })
            .join('<br/>')
        }

        return `${displayName}<br/><strong>${value}</strong>`
      },
    },
    // Color-by-value legend: shows the gradient horizontally at the
    // bottom of the chart with min/max labels so a user can read the
    // encoding ("darker = larger value"). Display-only \u2014 actual node
    // colors are computed by paintTreemapNodesByValue.
    visualMap: {
      show: true,
      type: 'continuous',
      min: dataMin,
      max: dataMax,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 8,
      itemWidth: 12,
      itemHeight: 140,
      inRange: { color: [...TREEMAP_GRADIENT] },
      text: [formatSINumber(dataMax), formatSINumber(dataMin)],
      textStyle: {
        fontSize: 11,
        color: CHART_SUBTLE_TEXT,
      },
    },
    series: [
      {
        type: 'treemap',
        top: title ? '15%' : '5%',
        bottom: '14%',
        left: '5%',
        right: '5%',
        roam: false,
        // Click-to-drilldown without zoom. ECharts' built-in
        // `zoomToNode` was conflicting with the drill-down details
        // panel: clicking a leaf would zoom + emit drill-down +
        // re-render the chart, occasionally unmounting the panel
        // before the user could read it. With nodeClick:false, all
        // clicks bubble through to TreemapChart's @click handler,
        // which decides whether the click is a leaf (drill-down)
        // or a parent (no-op). The breadcrumb is hidden because
        // it tracks zoom state which we no longer use; the concept
        // path is shown in the drill-down panel header instead.
        nodeClick: false,
        breadcrumb: { show: false },
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          ellipsis: '...',
          // Sits on the node's own gradient-sampled fill, not the page
          // background, so the root textStyle default (on-surface, made for
          // text on CHART_SURFACE) would be too light against it in dark.
          // Dark-only so light — which never set a colour here — is untouched.
          ...(chartMode === 'dark' ? { color: CHART_LABEL_ON_MARK } : {}),
        },
        upperLabel: {
          show: true,
          height: 30,
          color: CHART_LABEL_ON_MARK,
        },
        itemStyle: {
          borderColor: CHART_SURFACE,
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              gapWidth: 3,
            },
          },
          {
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.6,
            },
          },
        ],
        // Each node gets its own itemStyle.color computed from the
        // single-hue gradient — higher aggregate value → darker color.
        // Matches Atlas 2.15's getcolorvalue semantic.
        data: paintTreemapNodesByValue(data),
      },
    ],
  }
}

/**
 * Walk a tree of treemap nodes and return the min / max numeric
 * value across all leaves.
 */
function extractTreemapValueRange(nodes: TreemapNode[]): { min: number; max: number } {
  let min = Infinity
  let max = -Infinity
  function walk(list: TreemapNode[]) {
    list.forEach(n => {
      if (typeof n.value === 'number' && Number.isFinite(n.value)) {
        if (n.value < min) min = n.value
        if (n.value > max) max = n.value
      }
      if (n.children?.length) walk(n.children)
    })
  }
  walk(nodes)
  if (!Number.isFinite(min)) min = 0
  if (!Number.isFinite(max)) max = 1
  return { min, max }
}

/**
 * Convert a hex string like "#1f425a" to its RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace('#', '')
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  }
}

/**
 * Linearly interpolate across an N-stop gradient. Returns a hex color.
 * @param stops Array of hex strings, ordered light → dark.
 * @param t Normalized position in [0, 1].
 */
function sampleGradient(stops: readonly string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const segments = stops.length - 1
  if (segments < 1) return stops[0] ?? '#1f425a'
  const segmentSize = 1 / segments
  const segmentIndex = Math.min(Math.floor(clamped / segmentSize), segments - 1)
  const localT = (clamped - segmentIndex * segmentSize) / segmentSize
  const a = hexToRgb(stops[segmentIndex] ?? '#1f425a')
  const b = hexToRgb(stops[segmentIndex + 1] ?? '#1f425a')
  const r = Math.round(a.r + (b.r - a.r) * localT)
  const g = Math.round(a.g + (b.g - a.g) * localT)
  const blue = Math.round(a.b + (b.b - a.b) * localT)
  return `#${[r, g, blue].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Recursively assign each treemap node an itemStyle.color taken
 * from the TREEMAP_GRADIENT, scaled by the node's *colour* magnitude
 * relative to the global colour range.
 *
 * Atlas 2.15 semantics: the rectangle AREA encodes prevalence /
 * personCount (the `value` field); the COLOUR encodes
 * records-per-person (the `colorValue` field). When `colorValue` is
 * absent — older callers, hierarchical parent rollups — we fall
 * back to `value` so the gradient still has something to scale by.
 *
 * Higher colour magnitude → darker tile.
 */
function paintTreemapNodesByValue(nodes: TreemapNode[]): TreemapNode[] {
  // Pick the colour magnitude per node: prefer colorValue, else fall
  // back to value.
  const colorMagnitude = (node: TreemapNode): number => node.colorValue ?? node.value ?? 0

  // Compute global min/max of colour magnitudes (recurse).
  const allColorValues: number[] = []
  function collect(list: TreemapNode[]) {
    for (const n of list) {
      // Only count leaves for the colour scale — parent rollups
      // would otherwise dominate the range with summed values.
      if (!n.children || n.children.length === 0) {
        allColorValues.push(colorMagnitude(n))
      }
      if (n.children) collect(n.children)
    }
  }
  collect(nodes)

  const min = allColorValues.length ? Math.min(...allColorValues) : 0
  const max = allColorValues.length ? Math.max(...allColorValues) : 1
  const range = max - min || 1

  // Pull the lightest possible sample off zero so tiles with the
  // smallest colour magnitude don't tint near-white and disappear
  // against the page background. 0.15 leaves the lowest tile
  // visibly distinct from a value of 0 / undefined while still
  // preserving relative ordering across the rest of the range.
  const FLOOR = 0.15

  function paint(list: TreemapNode[]): TreemapNode[] {
    return list.map(node => {
      const tRaw = (colorMagnitude(node) - min) / range
      const t = FLOOR + tRaw * (1 - FLOOR)
      const color = sampleGradient(TREEMAP_GRADIENT, t)
      return {
        ...node,
        itemStyle: {
          ...node.itemStyle,
          color: node.itemStyle?.color || color,
        },
        children: node.children ? paint(node.children) : undefined,
      }
    })
  }

  return paint(nodes)
}

/**
 * Responsive chart resize handler
 */
export function createResizeHandler(
  chart: { isDisposed: () => boolean; resize: () => void },
  debounceMs = 150
) {
  let resizeTimer: ReturnType<typeof setTimeout> | null = null

  const handleResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer)
    }

    resizeTimer = setTimeout(() => {
      if (chart && typeof chart.isDisposed === 'function' && !chart.isDisposed()) {
        chart.resize()
      }
    }, debounceMs)
  }

  return handleResize
}

/**
 * Export chart configuration with consistent styling
 */
export function getExportConfig(backgroundColor?: string) {
  return {
    backgroundColor: backgroundColor ?? CHART_SURFACE,
    pixelRatio: 2, // 2x for high-DPI displays
    excludeComponents: ['toolbox'],
  }
}

// Minimal subset of the ECharts RenderItem API we use in renderItem
type LocalRenderItemAPI = {
  value: (idx: number) => number | string | undefined
  coord: (v: number[]) => number[]
  style: (opts: Record<string, unknown>) => unknown
}

// Encoded data slot indices used by histogram series data arrays
const ENCODE_X_START = 0
const ENCODE_X_END = 1
const ENCODE_Y_VALUE = 2

// Fraction of each bin's width left empty as the gap between bars, matching the
// category gap a normal ECharts bar chart leaves between columns.
const HISTOGRAM_BAR_GAP_RATIO = 0.2

// ============================================================================
// Dashboard-specific Chart Configurations
// ============================================================================

import type {
  HistogramChartData as DatasourceHistogramChartData,
  PieChartData as DatasourcePieChartData,
  LineChartData as DatasourceLineChartData,
  MultiLineChartData as DatasourceMultiLineChartData,
} from '@/models/datasource.types'
import type { LineChartData as UILineChartData } from '@/ui/chart-types'

import { logger } from '@/utils/logger'

/**
 * Dashboard Gender Pie Chart Configuration
 */
export function dashboardGenderPieOptions(data: DatasourcePieChartData[]): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number; percent: number }
        const value = formatSINumber(p.value)
        const percent = p.percent.toFixed(1)
        return `<strong>${p.name}</strong><br/>Count: ${value}<br/>Percentage: ${percent}%`
      },
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        name: 'Gender Distribution',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: CHART_SURFACE,
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12,
          // On the pie slice fill, not the page background — confirmed live as
          // dark-on-dark with the root textStyle default. Dark-only override so
          // light (which never set a colour here) stays byte-identical.
          ...(chartMode === 'dark' ? { color: CHART_LABEL_ON_MARK } : {}),
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: {
            color: CHART_COLORS[index % CHART_COLORS.length],
          },
        })),
      },
    ],
  }
}

/**
 * Dashboard Age Bar Chart Configuration
 */
export function dashboardAgeBarOptions(data: DatasourceHistogramChartData): EChartsOption {
  trackChartTheme()
  const validBins = data.bins.filter(
    b => Number.isFinite(b.intervalIndex) && Number.isFinite(b.countValue) && b.countValue >= 0
  )

  if (validBins.length === 0) {
    // No numeric histogram bins — log and return an empty options object.
    logger.error('Chart', 'DashboardAgeChart expected non-empty numeric histogram bins.', data.bins)
    return {}
  }

  const intervalSize = data.intervalSize
  const offset = data.offset
  const binStarts = validBins.map(bin => offset + bin.intervalIndex * intervalSize)
  const yValues = validBins.map(bin => bin.countValue)
  const axisLabel = data.xAxisLabel || 'Age'
  // Bin bounds can be fractional (e.g. days expressed as years, interval
  // ~0.082), so round for display instead of dumping raw floats. Shared by
  // the tooltip and the x-axis tick labels so both charts and this one
  // format consistently instead of the axis truncating fractional ticks to
  // whole numbers (#208).
  const fmtBin = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const param = params as { data?: [number, number, number] }
        const point = param.data
        if (!point) {
          return ''
        }

        const [xStart, xEnd, yValue] = point
        const value = formatSINumber(yValue)
        const label = intervalSize === 1 ? fmtBin(xStart) : `${fmtBin(xStart)} - ${fmtBin(xEnd)}`
        return `<strong>${axisLabel}: ${label}</strong><br/>${data.seriesName || data.unit || 'Count'}: ${value}`
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '8%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      min: Math.min(...binStarts),
      max: Math.max(...binStarts) + intervalSize,
      name: axisLabel,
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        formatter: (value: number) => fmtBin(value),
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: data.unit || 'Person Count',
      nameLocation: 'middle',
      nameGap: 60,
      axisLabel: {
        formatter: (value: number) => formatSINumber(value),
        fontSize: 11,
      },
    },
    series: [
      {
        name: data.seriesName || data.unit || 'Count',
        type: 'custom',
        encode: {
          x: [ENCODE_X_START, ENCODE_X_END],
          y: ENCODE_Y_VALUE,
          tooltip: [ENCODE_X_START, ENCODE_X_END, ENCODE_Y_VALUE],
        },
        data: binStarts.map((xStart, binIndex) => [xStart, xStart + intervalSize, yValues[binIndex]]),
        renderItem: (_params: unknown, api: LocalRenderItemAPI) => {
          const xStart = Number(api.value(ENCODE_X_START))
          const xEnd = Number(api.value(ENCODE_X_END))
          const yValue = Number(api.value(ENCODE_Y_VALUE))
          const [xStartPx, yTopPx] = api.coord([xStart, yValue]) as [number, number]
          const [xEndPx] = api.coord([xEnd, yValue]) as [number, number]
          const [, yBasePx] = api.coord([xStart, 0]) as [number, number]

          // Leave a gap between bars by shrinking the rect within its bin and
          // centring it, so adjacent columns don't touch.
          const fullWidthPx = xEndPx - xStartPx
          const gapPx = fullWidthPx * HISTOGRAM_BAR_GAP_RATIO

          return {
            type: 'rect',
            shape: {
              x: xStartPx + gapPx / 2,
              y: yTopPx,
              width: Math.max(0.5, fullWidthPx - gapPx),
              height: Math.max(0, yBasePx - yTopPx),
            },
            style: {
              fill: CHART_COLORS[0],
            },
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  }
}

/**
 * Dashboard Cumulative Observation Line Chart Configuration
 */
export function dashboardCumulativeLineOptions(data: DatasourceLineChartData): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params]
        const p = arr[0] as { value: [number, number] }
        return `<strong>${data.xAxisLabel || 'Years'}: ${p.value[0]}</strong><br/>${data.yAxisLabel || 'Percentage'}: ${(p.value[1] * 100).toFixed(1)}%`
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '10%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: data.xAxisLabel || 'Years',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: data.yAxisLabel || 'Percent of Persons',
      nameLocation: 'middle',
      nameGap: 50,
      min: 0,
      max: 1,
      axisLabel: {
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
    },
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: s.data.map((v: number, i: number) => [data.xValues?.[i] ?? i, v]),
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
      lineStyle: {
        width: 2.5,
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: CHART_COLORS[index % CHART_COLORS.length] + '50' },
            { offset: 1, color: CHART_COLORS[index % CHART_COLORS.length] + '10' },
          ],
        },
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 2,
          borderColor: CHART_SURFACE,
        },
      },
    })),
  }
}

/**
 * Dashboard Observation by Month Line Chart Configuration
 */
export function dashboardObservationMonthLineOptions(data: DatasourceLineChartData): EChartsOption {
  trackChartTheme()
  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const arr = Array.isArray(params) ? params : [params]
        const p = arr[0] as { value: [number, number] }
        const d = new Date(p.value[0])
        const label = `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
        return `<strong>${label}</strong><br/>${data.yAxisLabel || 'Observations'}: ${formatSINumber(p.value[1])}`
      },
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '12%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'time',
      name: data.xAxisLabel || 'Month',
      nameLocation: 'middle',
      nameGap: 40,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: data.yAxisLabel || 'Observation Count',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => formatSINumber(value),
      },
    },
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
      },
    ],
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: false,
      data: s.data.map((v: number, i: number) => [
        data.monthCodes?.[i] != null ? parseYyyymm(data.monthCodes[i] as string | number) : i,
        v,
      ]),
      symbol: 'none',
      sampling: 'lttb',
      itemStyle: { color: CHART_COLORS[index % CHART_COLORS.length] },
      lineStyle: { width: 2 },
      emphasis: { focus: 'series', lineStyle: { width: 3 } },
    })),
  }
}

/**
 * Multi-Line Chart Configuration for Data Density Reports
 */
export function multiLineChartOptions(data: UILineChartData | DatasourceMultiLineChartData): EChartsOption {
  trackChartTheme()
  const isPercent = 'yAxisFormat' in data && data.yAxisFormat === 'percent'
  const formatValue = (value: number) =>
    isPercent ? `${(value * 100).toFixed(1)}%` : formatSINumber(value)
  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: unknown) => {
        type TooltipParam = {
          name?: string
          seriesName?: string
          // For time/value x-axes the point is a [x, y] pair; for category axes
          // it is the scalar y-value.
          value?: number | Array<number | string>
          axisValueLabel?: string
        }
        const paramsArray = (Array.isArray(params) ? params : [params]) as TooltipParam[]
        if (paramsArray.length === 0) return ''
        const name = paramsArray[0]?.axisValueLabel || paramsArray[0]?.name || ''
        const lines = paramsArray.map(param => {
          const series = param.seriesName || ''
          // ECharts hands back the whole data point: for time/value axes that is
          // [x, y], so pull the y (last element) rather than stringifying the pair.
          const y = Array.isArray(param.value) ? param.value[param.value.length - 1] : param.value
          const val = typeof y === 'number' ? formatValue(y) : String(y)
          return `${series}: <strong>${val}</strong>`
        })
        return `<strong>${name}</strong><br/>${lines.join('<br/>')}`
      },
    },
    legend: {
      data: data.series.map(s => s.name),
      type: 'scroll',
      bottom: 0,
      left: 'center',
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '12%',
      top: '8%',
      containLabel: true,
    },
    xAxis: buildLineXAxis(data),
    yAxis: {
      type: 'value',
      name: 'yAxisLabel' in data ? data.yAxisLabel : undefined,
      ...(isPercent ? { min: 0, max: 1 } : {}),
      axisLabel: {
        formatter: (value: number) =>
          isPercent ? `${Math.round(value * 100)}%` : formatSINumber(value),
      },
    },
    series: data.series.map((s, index) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      data: mapLineSeriesData(data, s.data),
      symbol: 'circle',
      symbolSize: 4,
      itemStyle: {
        color: CHART_COLORS[index % CHART_COLORS.length],
      },
      lineStyle: {
        width: 2,
      },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 2,
          borderColor: CHART_SURFACE,
        },
      },
    })),
  }
}

/**
 * Clinical Domain Treemap Configuration
 */
export function clinicalDomainTreemapOptions(nodes: TreemapNode[]): EChartsOption {
  trackChartTheme()
  // Calculate prevalence range for color mapping
  const values = extractAllValues(nodes)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)

  return {
    ...chartRootTextStyle(),
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as {
          name: string
          value: number
          data: { prevalence?: number; metric?: number }
        }
        const value = formatSINumber(p.value)
        const name = p.name
        const prevalence = p.data?.prevalence
        const metric = p.data?.metric

        let tooltip = `<strong>${name}</strong><br/>`
        tooltip += `Value: ${value}<br/>`
        if (prevalence !== undefined) {
          tooltip += `Prevalence: ${prevalence.toFixed(2)}%<br/>`
        }
        if (metric !== undefined) {
          tooltip += `Metric: ${metric.toFixed(2)}`
        }

        return tooltip
      },
    },
    series: [
      {
        type: 'treemap',
        top: '5%',
        bottom: '5%',
        left: '5%',
        right: '5%',
        roam: true,
        nodeClick: 'zoomToNode',
        breadcrumb: {
          show: true,
          emptyItemWidth: 25,
          height: 22,
          top: '0%',
        },
        label: {
          show: true,
          formatter: '{b}',
          overflow: 'truncate',
          ellipsis: '...',
          fontSize: 12,
          // Sits on the node's prevalence-ramp fill, not the page background;
          // same reasoning as defaultTreemapOptions above. Dark-only.
          ...(chartMode === 'dark' ? { color: CHART_LABEL_ON_MARK } : {}),
        },
        upperLabel: {
          show: true,
          height: 30,
          color: CHART_LABEL_ON_MARK,
          fontSize: 14,
          fontWeight: 'bold',
        },
        itemStyle: {
          borderColor: CHART_SURFACE,
          borderWidth: 2,
          gapWidth: 2,
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 3,
              gapWidth: 3,
            },
          },
          {
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderColorSaturation: 0.6,
            },
          },
        ],
        // Visual mapping for prevalence intensity (light to dark)
        visualMin: minValue,
        visualMax: maxValue,
        visualDimension: 0,
        colorMappingBy: 'value',
        color: [...(chartMode === 'dark' ? DARK_PREVALENCE_RAMP : DEFAULT_PREVALENCE_RAMP)],
        data: nodes,
      },
    ],
  }
}

// Helper function to extract all values for color mapping
function extractAllValues(nodes: TreemapNode[]): number[] {
  const values: number[] = []

  function traverse(node: TreemapNode) {
    values.push(node.value)
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  nodes.forEach(traverse)
  return values.length > 0 ? values : [0]
}

/**
 * Trellis Chart Options
 * Creates small multiple line charts stratified by demographics
 * Based on OHDSI portal implementation
 */
export function trellisChartOptions(
  data: import('@/models/report.types').TrellisChartData,
  title?: string,
  maxPlotsPerRow: number = 5
): EChartsOption {
  trackChartTheme()
  // Sort categories by leading numeric prefix so age brackets come
  // out 0-9, 10-19, 20-29, ..., 100-109 instead of the ASCII order
  // 0-9, 10-19, 100-109, 20-29.
  const categories = [...data.categories].sort((a, b) => {
    const aMatch = /^-?(\d+)/.exec(a)
    const bMatch = /^-?(\d+)/.exec(b)
    if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1])
    return a.localeCompare(b)
  })
  const totalPlots = categories.length
  const plotsPerRow = Math.min(maxPlotsPerRow, totalPlots)
  const numRows = Math.ceil(totalPlots / plotsPerRow)

  // Grid dimensions. Reserved a bit more horizontal margin on the
  // left so the rotated y-axis name + tick labels of the leftmost
  // chart don't collide with the page edge or the previous column.
  // Bump the vertical gap so the title of the next row sits clear
  // of the x-axis tick labels of the row above.
  const GRID_WIDTH = 88 / plotsPerRow
  const GRID_GAP = 5 / plotsPerRow
  const GRID_LEFT_MARGIN = 7
  const GRID_HEIGHT = 56 / numRows
  const GRID_TOP_MARGIN = title ? 15 : 9 // More space if there's a main title
  const GRID_VERTICAL_GAP = 14

  // Calculate global Y-axis range for consistent scale across all plots
  const allYValues = data.series.flatMap(s => s.data.map(d => d.y))
  const globalYMin = Math.floor(Math.min(...allYValues))
  const globalYMax = Math.ceil(Math.max(...allYValues))

  // Create grid configuration for small multiples
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grid: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xAxis: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yAxis: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gridTitles: any[] = []

  // Add the global "Age Group / Gender" header once (above the first
  // row) and a global "Year" footer once (below the last row).
  // Previously these were rendered per-row, which collided with the
  // individual category titles (e.g., "100-109") sitting at the same
  // top offset.
  const lastRowTop = (numRows - 1) * (GRID_HEIGHT + GRID_VERTICAL_GAP) + GRID_TOP_MARGIN
  gridTitles.push({
    text: 'Age Group / Gender',
    top: `${Math.max(GRID_TOP_MARGIN - 7, 1)}%`,
    left: 'center',
    textStyle: {
      fontSize: 13,
      color: CHART_MUTED_TEXT,
    },
  })
  gridTitles.push({
    text: 'Year',
    top: `${lastRowTop + GRID_HEIGHT + 6}%`,
    left: 'center',
    textStyle: {
      fontSize: 13,
      color: CHART_MUTED_TEXT,
    },
  })

  categories.forEach((category, index) => {
    const rowIndex = Math.floor(index / plotsPerRow)
    const colIndex = index % plotsPerRow

    const rowTop = rowIndex * (GRID_HEIGHT + GRID_VERTICAL_GAP) + GRID_TOP_MARGIN

    // Grid positioning
    grid.push({
      show: true,
      width: `${GRID_WIDTH}%`,
      height: `${GRID_HEIGHT}%`,
      left: `${colIndex * (GRID_WIDTH + GRID_GAP) + GRID_LEFT_MARGIN}%`,
      top: `${rowTop}%`,
      borderColor: CHART_GRID_BORDER,
      borderWidth: 1,
      containLabel: true,
    })

    // Grid title (demographic group name) - positioned above the grid
    gridTitles.push({
      textAlign: 'center',
      text: category,
      top: `${rowTop - 3}%`,
      left: `${colIndex * (GRID_WIDTH + GRID_GAP) + GRID_WIDTH / 2 + GRID_LEFT_MARGIN}%`,
      textStyle: {
        fontWeight: 'normal',
        fontSize: 12,
      },
    })

    // Get series for this category and sort by year
    const categorySeries = data.series.filter(s => s.category === category)
    const allYears = new Set<number>()
    categorySeries.forEach(s => {
      s.data.forEach(d => allYears.add(typeof d.x === 'number' ? d.x : Number(d.x)))
    })
    const xAxisData = Array.from(allYears).sort((a, b) => a - b)

    // X axis
    xAxis.push({
      gridIndex: index,
      type: 'category',
      data: xAxisData,
      boundaryGap: false,
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
      },
      axisLabel: {
        show: true,
        fontSize: 10,
      },
      position: 'bottom',
    })

    // Y axis
    yAxis.push({
      gridIndex: index,
      type: 'value',
      min: globalYMin,
      max: globalYMax,
      axisTick: {
        show: false,
      },
      splitLine: {
        show: true,
      },
      // Only show y axis label for leftmost chart in each row
      axisLabel: {
        show: colIndex === 0,
        fontSize: 10,
      },
      // Only show y axis name for leftmost chart in each row.
      // Render the name vertically (rotated 90°) along the y-axis
      // line so it doesn't extend horizontally across the chart
      // area or collide with the row above. nameGap stays modest
      // so the label sits next to the tick numbers, not far left.
      ...(colIndex === 0 && {
        name: 'Prevalence Per 1000 People',
        nameLocation: 'middle',
        nameRotate: 90,
        nameGap: 38,
        position: 'left',
        nameTextStyle: {
          fontSize: 12,
          fontWeight: 'normal',
          color: CHART_SUBTLE_TEXT,
        },
      }),
    })

    // Series for this grid
    categorySeries.forEach(s => {
      // Sort data by year
      const sortedData = s.data.sort((a, b) => {
        const xA = typeof a.x === 'number' ? a.x : Number(a.x)
        const xB = typeof b.x === 'number' ? b.x : Number(b.x)
        return xA - xB
      })
      // Map to just y values in order of xAxisData
      const seriesData = xAxisData.map(year => {
        const point = sortedData.find(d => {
          const pointX = typeof d.x === 'number' ? d.x : Number(d.x)
          return pointX === year
        })
        return point ? Number(point.y.toFixed(2)) : null
      })

      series.push({
        name: s.name,
        type: 'line',
        xAxisIndex: index,
        yAxisIndex: index,
        data: seriesData,
        smooth: false,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
        },
        emphasis: {
          focus: 'series',
        },
        label: {
          show: false,
          position: 'top',
        },
      })
    })
  })

  return {
    ...chartRootTextStyle(),
    title: title
      ? [
          {
            text: title,
            left: 'center',
            top: '1%',
            textStyle: {
              fontSize: 16,
              fontWeight: 'bold',
            },
          },
          ...gridTitles,
        ]
      : gridTitles,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
      },
    },
    grid,
    xAxis,
    yAxis,
    series,
    legend: {
      top: 'bottom',
      data: Array.from(new Set(data.series.map(s => s.name))),
    },
  }
}

/**
 * Box Plot Chart Options
 * Creates box and whisker plots for statistical distributions
 */
export function boxPlotChartOptions(
  data: import('@/models/report.types').BoxPlotData[],
  title?: string
): EChartsOption {
  trackChartTheme()
  const categories = data.map(d => d.category)

  // Convert data to ECharts boxplot format: [min, Q1, median, Q3, max]
  const boxData = data.map(d => [d.min, d.p25, d.median, d.p75, d.max])

  // Outliers (p10 and p90 as whisker extensions)
  const outlierData: [number, number][] = []
  data.forEach((d, index) => {
    if (d.p10 < d.min) {
      outlierData.push([index, d.p10])
    }
    if (d.p90 > d.max) {
      outlierData.push([index, d.p90])
    }
  })

  return {
    ...chartRootTextStyle(),
    title: title
      ? {
          text: title,
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'bold',
          },
        }
      : undefined,
    tooltip: {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        if (params.seriesType === 'boxplot') {
          const value = params.value
          const dataPoint = data[params.dataIndex]
          const p90 = dataPoint?.p90 != null ? formatSINumber(dataPoint.p90) : 'N/A'
          const p10 = dataPoint?.p10 != null ? formatSINumber(dataPoint.p10) : 'N/A'
          return `${params.name}<br/>
            Max: ${formatSINumber(value[5])}<br/>
            P90: ${p90}<br/>
            P75: ${formatSINumber(value[4])}<br/>
            Median: ${formatSINumber(value[3])}<br/>
            P25: ${formatSINumber(value[2])}<br/>
            P10: ${p10}<br/>
            Min: ${formatSINumber(value[1])}`
        }
        return params.name
      },
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '15%',
      top: title ? '15%' : '10%',
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: true,
      nameGap: 30,
      splitArea: {
        show: false,
      },
      axisLabel: {
        formatter: '{value}',
        rotate: categories.length > 5 ? 45 : 0,
      },
      splitLine: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Value',
      splitArea: {
        show: true,
      },
      axisLabel: {
        formatter: (value: number) => formatSINumber(value),
      },
    },
    series: [
      {
        name: 'boxplot',
        type: 'boxplot',
        data: boxData,
        itemStyle: {
          color: CHART_COLORS[0],
          borderColor: CHART_BOX_BORDER,
        },
        tooltip: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (param: any) => {
            return `${param.name}<br/>
              Max: ${formatSINumber(param.value[5])}<br/>
              P75: ${formatSINumber(param.value[4])}<br/>
              Median: ${formatSINumber(param.value[3])}<br/>
              P25: ${formatSINumber(param.value[2])}<br/>
              Min: ${formatSINumber(param.value[1])}`
          },
        },
      },
      {
        name: 'outlier',
        type: 'scatter',
        data: outlierData,
        itemStyle: {
          color: CHART_OUTLIER_MARKER,
        },
      },
    ],
  }
}
