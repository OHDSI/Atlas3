import { describe, it, expect, vi, beforeEach } from 'vitest'

const chartMock = vi.hoisted(() => ({
  setOption: vi.fn(),
  getDataURL: vi.fn(() => 'data:image/png;base64,AAA'),
  dispose: vi.fn(),
}))
const initMock = vi.hoisted(() => vi.fn(() => chartMock))

vi.mock('echarts/core', () => ({ init: initMock, use: vi.fn() }))

import {
  EXPORT_LAYOUT,
  buildAttritionExportOption,
  buildFunnelSegments,
  computeExportLayout,
  formatStepDetail,
  funnelMinSizePct,
  renderAttritionExportPng,
  wrapLabel,
} from '@/utils/attrition-funnel-export'
import type { AttritionStep } from '@/utils/inclusion-attrition'

const text = {
  title: 'Attrition',
  excludedLabel: 'Excluded at this step',
  formatCount: (n: number) => n.toLocaleString('en-US'),
}

const steps: AttritionStep[] = [
  { label: 'Initial population', remaining: 10000, excluded: 0, percentOfInitial: 100 },
  {
    label: 'Has at least 365 days of continuous observation before the index date and no prior diagnosis of type 1 diabetes mellitus or secondary diabetes',
    remaining: 6000,
    excluded: 4000,
    percentOfInitial: 60,
  },
  { label: 'Age >= 18', remaining: 1500, excluded: 4500, percentOfInitial: 15 },
]

type GraphicText = { type: 'text'; x?: number; y?: number; style: { text: string; rich?: Record<string, { font: string }> } }

function textGraphics(option: Record<string, unknown>): GraphicText[] {
  return (option.graphic as GraphicText[]).filter((g) => g.type === 'text')
}

describe('wrapLabel', () => {
  it('keeps short labels on one line', () => {
    expect(wrapLabel('Age >= 18', 30, 2)).toEqual(['Age >= 18'])
  })

  it('wraps on word boundaries', () => {
    expect(wrapLabel('one two three four', 9, 3)).toEqual(['one two', 'three', 'four'])
  })

  it('hard-splits words longer than a line', () => {
    expect(wrapLabel('abcdefghij', 4, 3)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('truncates with an ellipsis past the line limit', () => {
    const lines = wrapLabel('alpha beta gamma delta epsilon', 11, 2)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('alpha beta')
    expect(lines[1]!.endsWith('…')).toBe(true)
    expect(lines[1]!.length).toBeLessThanOrEqual(11)
  })

  it('returns nothing for blank input', () => {
    expect(wrapLabel('   ', 10, 2)).toEqual([])
  })
})

describe('funnel sizing', () => {
  it('sizes each rule segment from the count entering it', () => {
    expect(buildFunnelSegments(steps).map((s) => s.value)).toEqual([10000, 10000, 6000])
  })

  it('adds a transparent twin for a single step', () => {
    const segs = buildFunnelSegments([steps[0]!])
    expect(segs).toHaveLength(2)
    expect(segs[1]!.placeholder).toBe(true)
  })

  it('lands the last segment on the final count', () => {
    expect(funnelMinSizePct(steps)).toBeCloseTo(15)
    expect(funnelMinSizePct([{ ...steps[0]!, remaining: 0 }])).toBe(0.5)
  })
})

describe('buildAttritionExportOption', () => {
  it('renders on a fixed white background at a large canvas size', () => {
    const { width, height, option } = buildAttritionExportOption(steps, text)
    expect(width).toBeGreaterThanOrEqual(1200)
    expect(height).toBe(computeExportLayout(3).height)
    expect(option.backgroundColor).toBe('#ffffff')
    expect(option.animation).toBe(false)
  })

  it('places one horizontal label block per step beside the funnel, centered on its row', () => {
    const { option } = buildAttritionExportOption(steps, text)
    const layout = computeExportLayout(3)
    const labels = textGraphics(option).slice(1)
    expect(labels).toHaveLength(3)
    labels.forEach((g, i) => {
      expect(g.x).toBe(layout.labelX)
      const rowTop = layout.funnelTop + i * layout.rowHeight
      expect(g.y!).toBeGreaterThanOrEqual(rowTop)
      expect(g.y!).toBeLessThan(rowTop + layout.rowHeight)
    })

    const series = (option.series as Array<{ label: { show: boolean }; left: number; width: number }>)[0]!
    expect(series.label.show).toBe(false)
    expect(series.left + series.width).toBeLessThan(layout.labelX)
  })

  it('uses legible font sizes', () => {
    const { option } = buildAttritionExportOption(steps, text)
    const rich = textGraphics(option)[1]!.style.rich!
    expect(rich.name!.font).toContain(`${EXPORT_LAYOUT.nameFontSize}px`)
    expect(EXPORT_LAYOUT.nameFontSize).toBeGreaterThanOrEqual(18)
    expect(EXPORT_LAYOUT.detailFontSize).toBeGreaterThanOrEqual(16)
  })

  it('wraps long rule names to at most two lines and keeps counts', () => {
    const { option } = buildAttritionExportOption(steps, text)
    const block = textGraphics(option)[2]!.style.text
    const nameLines = block.split('\n').filter((l) => l.startsWith('{name|'))
    expect(nameLines).toHaveLength(2)
    expect(nameLines[1]).toContain('…')
    expect(block).toContain('{detail|6,000 (60.0%)   ▼ Excluded at this step: 4,000}')
  })

  it('omits the excluded count for the initial step', () => {
    expect(formatStepDetail(steps[0]!, text)).toBe('10,000 (100.0%)')
  })
})

describe('renderAttritionExportPng', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders offscreen at the export size and disposes the instance', () => {
    const url = renderAttritionExportPng(steps, text)
    const layout = computeExportLayout(3)
    expect(url).toBe('data:image/png;base64,AAA')
    expect(initMock).toHaveBeenCalledWith(expect.anything(), null, {
      renderer: 'canvas',
      width: layout.width,
      height: layout.height,
    })
    expect(chartMock.getDataURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'png', pixelRatio: EXPORT_LAYOUT.pixelRatio })
    )
    expect(chartMock.dispose).toHaveBeenCalled()
  })
})
