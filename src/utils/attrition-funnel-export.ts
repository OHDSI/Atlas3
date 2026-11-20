import { init, use } from 'echarts/core'
import { FunnelChart } from 'echarts/charts'
import { GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { AttritionStep } from '@/utils/inclusion-attrition'

use([FunnelChart, GraphicComponent, CanvasRenderer])

export interface FunnelSegment {
  name: string
  value: number
  stepIndex: number
  placeholder: boolean
}

/**
 * ECharts sizes segment[i] from data[i] (top) to data[i+1] (bottom). Each
 * segment carries the previous step's count so its top edge is the cohort
 * entering that rule, and the last segment's bottom lands on the final count
 * through minSize. A single step gets a transparent twin so it renders as a
 * flat rectangle.
 */
export function buildFunnelSegments(steps: readonly AttritionStep[]): FunnelSegment[] {
  const segments: FunnelSegment[] = steps.map((s, i) => ({
    name: s.label,
    value: i === 0 ? s.remaining : steps[i - 1]!.remaining,
    stepIndex: i,
    placeholder: false,
  }))
  if (segments.length === 1) {
    segments.push({ name: '', value: segments[0]!.value, stepIndex: 0, placeholder: true })
  }
  return segments
}

export function funnelMinSizePct(steps: readonly AttritionStep[]): number {
  const initialValue = steps[0]?.remaining ?? 0
  const lastValue = steps[steps.length - 1]?.remaining ?? 0
  // A zeroed cohort still needs a sliver: echarts treats a 0% minSize unpredictably.
  return initialValue > 0 ? Math.max((lastValue / initialValue) * 100, 0.3) : 0.5
}

export type RetentionTone = 'success' | 'warning' | 'error'

export function toneForRetention(pct: number): RetentionTone {
  if (pct >= 80) return 'success'
  if (pct >= 40) return 'warning'
  return 'error'
}

/**
 * Greedy word wrap by character budget; words longer than a line are hard
 * split, and anything past `maxLines` is cut with an ellipsis.
 */
export function wrapLabel(text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0 || maxChars < 1 || maxLines < 1) return []

  const lines: string[] = []
  let current = ''
  for (const word of words) {
    let rest = word
    while (rest.length > 0) {
      const candidate = current ? `${current} ${rest}` : rest
      if (candidate.length <= maxChars) {
        current = candidate
        rest = ''
      } else if (current) {
        lines.push(current)
        current = ''
      } else {
        lines.push(rest.slice(0, maxChars))
        rest = rest.slice(maxChars)
      }
    }
  }
  if (current) lines.push(current)

  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const last = kept[maxLines - 1]!
  kept[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
  return kept
}

export interface AttritionExportText {
  title: string
  excludedLabel: string
  formatCount: (n: number) => string
}

export const EXPORT_LAYOUT = {
  width: 1400,
  padding: 40,
  titleHeight: 64,
  funnelWidth: 520,
  labelGap: 40,
  nameFontSize: 22,
  detailFontSize: 18,
  lineHeight: 28,
  minRowHeight: 96,
  maxNameLines: 2,
  pixelRatio: 2,
} as const

const EXPORT_COLORS: Record<RetentionTone, { fill: string; stroke: string }> = {
  success: { fill: 'rgba(52, 199, 89, 0.35)', stroke: 'rgb(36, 138, 61)' },
  warning: { fill: 'rgba(255, 149, 0, 0.35)', stroke: 'rgb(178, 104, 0)' },
  error: { fill: 'rgba(255, 59, 48, 0.35)', stroke: 'rgb(196, 40, 32)' },
}
const EXPORT_TEXT = 'rgb(28, 28, 30)'
const EXPORT_MUTED = 'rgb(84, 84, 88)'
const EXPORT_RULE = 'rgba(0, 0, 0, 0.12)'
const EXPORT_FONT = 'Inter, -apple-system, system-ui, Helvetica, Arial, sans-serif'

export interface AttritionExportLayout {
  width: number
  height: number
  funnelTop: number
  rowHeight: number
  labelX: number
  labelWidth: number
  nameMaxChars: number
}

export function computeExportLayout(stepCount: number): AttritionExportLayout {
  const L = EXPORT_LAYOUT
  const rows = Math.max(1, stepCount)
  const labelX = L.padding + L.funnelWidth + L.labelGap
  const labelWidth = L.width - labelX - L.padding
  const funnelTop = L.padding + L.titleHeight
  return {
    width: L.width,
    height: funnelTop + rows * L.minRowHeight + L.padding,
    funnelTop,
    rowHeight: L.minRowHeight,
    labelX,
    labelWidth,
    // ~0.55em average glyph width for a sans-serif face.
    nameMaxChars: Math.floor(labelWidth / (L.nameFontSize * 0.55)),
  }
}

export function formatStepDetail(step: AttritionStep, text: AttritionExportText): string {
  const base = `${text.formatCount(step.remaining)} (${step.percentOfInitial.toFixed(1)}%)`
  return step.excluded > 0
    ? `${base}   ▼ ${text.excludedLabel}: ${text.formatCount(step.excluded)}`
    : base
}

/**
 * Print-oriented option for the downloaded image: fixed light palette so the
 * file reads the same whatever theme was active, and labels laid out
 * horizontally beside the funnel instead of squeezed inside narrow segments.
 */
export function buildAttritionExportOption(
  steps: readonly AttritionStep[],
  text: AttritionExportText
): { width: number; height: number; option: Record<string, unknown> } {
  const L = EXPORT_LAYOUT
  const segments = buildFunnelSegments(steps)
  const layout = computeExportLayout(segments.length)
  const initialValue = steps[0]?.remaining ?? 0

  const graphics: Record<string, unknown>[] = [
    {
      type: 'text',
      left: L.padding,
      top: L.padding,
      style: { text: text.title, fill: EXPORT_TEXT, font: `600 28px ${EXPORT_FONT}` },
    },
  ]

  steps.forEach((step, i) => {
    const rowTop = layout.funnelTop + i * layout.rowHeight
    if (i > 0) {
      graphics.push({
        type: 'line',
        shape: { x1: L.padding, y1: rowTop, x2: layout.width - L.padding, y2: rowTop },
        style: { stroke: EXPORT_RULE, lineWidth: 1 },
        z: 0,
      })
    }
    const nameLines = wrapLabel(step.label, layout.nameMaxChars, L.maxNameLines)
    const blockHeight = (nameLines.length + 1) * L.lineHeight
    graphics.push({
      type: 'text',
      x: layout.labelX,
      y: rowTop + (layout.rowHeight - blockHeight) / 2,
      style: {
        text: [...nameLines.map((l) => `{name|${l}}`), `{detail|${formatStepDetail(step, text)}}`].join('\n'),
        rich: {
          name: { fill: EXPORT_TEXT, font: `600 ${L.nameFontSize}px ${EXPORT_FONT}`, lineHeight: L.lineHeight },
          detail: { fill: EXPORT_MUTED, font: `${L.detailFontSize}px ${EXPORT_FONT}`, lineHeight: L.lineHeight },
        },
      },
    })
  })

  return {
    width: layout.width,
    height: layout.height,
    option: {
      animation: false,
      backgroundColor: '#ffffff',
      graphic: graphics,
      series: [
        {
          type: 'funnel',
          sort: 'none',
          funnelAlign: 'center',
          gap: 0,
          min: 0,
          max: initialValue,
          minSize: `${funnelMinSizePct(steps)}%`,
          maxSize: '100%',
          left: L.padding,
          width: L.funnelWidth,
          top: layout.funnelTop,
          height: segments.length * layout.rowHeight,
          label: { show: false },
          labelLine: { show: false },
          data: segments.map((seg) => {
            const tone = toneForRetention(steps[seg.stepIndex]?.percentOfInitial ?? 0)
            const colors = seg.placeholder
              ? { fill: 'transparent', stroke: 'transparent' }
              : EXPORT_COLORS[tone]
            return {
              name: seg.name,
              value: seg.value,
              itemStyle: { color: colors.fill, borderColor: colors.stroke, borderWidth: 1 },
            }
          }),
        },
      ],
    },
  }
}

export function renderAttritionExportPng(
  steps: readonly AttritionStep[],
  text: AttritionExportText
): string {
  const { width, height, option } = buildAttritionExportOption(steps, text)
  const chart = init(document.createElement('div'), null, { renderer: 'canvas', width, height })
  try {
    chart.setOption(option)
    return chart.getDataURL({ type: 'png', pixelRatio: EXPORT_LAYOUT.pixelRatio, backgroundColor: '#ffffff' })
  } finally {
    chart.dispose()
  }
}
