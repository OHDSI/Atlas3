/**
 * SunburstChart Component Tests
 *
 * Covers:
 * - Rendering with hierarchical data
 * - chartOption series + tooltip formatter (combinationBits, escapeHtml, buildBreadcrumb)
 * - Inline renderItem returns the expected sector group / null for tiny slices
 * - handleChartClick emits arc-click with the resolved node data
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import SunburstChart, { type SunburstNode } from '@/components/reports/charts/SunburstChart.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

interface ChartOption {
  tooltip: { formatter: (p: { dataIndex: number }) => string }
  series: Array<{
    data: Array<{ value: number; name: string }>
    renderItem: (
      params: { dataIndex: number },
      api: { getWidth: () => number; getHeight: () => number }
    ) => unknown
  }>
}

interface RenderItemGroup {
  type: 'group'
  children: Array<{
    type: 'sector'
    shape: {
      cx: number
      cy: number
      r0: number
      r: number
      startAngle: number
      endAngle: number
      clockwise: boolean
    }
    style: { fill: string; stroke: string; lineWidth: number }
    emphasis: { style: { stroke: string; lineWidth: number } }
  }>
}

function createWrapper(props: Partial<{ data: SunburstNode; colors: (k: string) => string; minHeight: number }> = {}) {
  return mount(SunburstChart, {
    props: {
      data: props.data ?? {
        name: 'root',
        value: 0,
        children: [
          { name: '1', value: 10 },
          { name: '2', value: 5 },
        ],
      },
      colors: props.colors ?? ((k: string) => `#${k.padStart(3, '0').slice(0, 3)}`),
      ...(props.minHeight !== undefined ? { minHeight: props.minHeight } : {}),
    },
    global: {
      plugins: [vuetify],
      stubs: {
        'v-chart': {
          name: 'VChart',
          template: '<div class="v-chart-stub" />',
          props: ['option', 'autoresize', 'style'],
        },
      },
    },
  })
}

describe('SunburstChart', () => {
  describe('Rendering', () => {
    it('renders the container', () => {
      const w = createWrapper()
      expect(w.find('.sunburst-chart-container').exists()).toBe(true)
    })

    it('applies minHeight to the container style', () => {
      const w = createWrapper({ minHeight: 700 })
      const el = w.find('.sunburst-chart-container').element as HTMLElement
      expect(el.style.minHeight).toBe('700px')
    })
  })

  describe('chartOption series data', () => {
    it('lays out children as renderable slices (skips root)', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [
            { name: 'A', value: 10 },
            { name: 'B', value: 5 },
          ],
        },
        colors: () => '#abc',
      })
      const chart = w.findComponent({ name: 'VChart' })
      const opt = chart.props('option') as unknown as ChartOption
      expect(opt.series).toHaveLength(1)
      const series = opt.series[0]
      // Only A and B (depth>0)
      expect(series.data).toHaveLength(2)
      const names = series.data.map(d => d.name).sort()
      expect(names).toEqual(['A', 'B'])
    })
  })

  describe('tooltip formatter (buildBreadcrumb path)', () => {
    it('formats a single-bit node with escaped HTML name', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [{ name: 'A&B<>"\'X', value: 10 }],
        },
        colors: () => '#123',
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const html = opt.tooltip.formatter({ dataIndex: 0 })
      // Escaped output should not contain raw '<' from the node name
      expect(html).toContain('A&amp;B&lt;&gt;&quot;&#39;X')
      expect(html).toContain('count:')
    })

    it('returns empty string when index is out of range', () => {
      const w = createWrapper()
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      expect(opt.tooltip.formatter({ dataIndex: 999 })).toBe('')
    })

    it('decomposes a combination bit-mask name into multiple chips', () => {
      // name "5" = bits 0 + 2 → 2 chips for "1" and "4"
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [{ name: '5', value: 7 }],
        },
        colors: (k: string) => `#color-${k}`,
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const html = opt.tooltip.formatter({ dataIndex: 0 })
      expect(html).toContain('#color-1')
      expect(html).toContain('#color-4')
    })

    it('uses itemColor when available for a single-bit node', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [{ name: 'C', value: 1, itemColor: '#ff0000' }],
        },
        colors: () => '#000',
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const html = opt.tooltip.formatter({ dataIndex: 0 })
      expect(html).toContain('#ff0000')
    })

    it('walks the parent chain for nested nodes', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [
            {
              name: 'Parent',
              value: 0,
              children: [{ name: 'Child', value: 3 }],
            },
          ],
        },
        colors: () => '#999',
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      // Find the child entry (depth=2)
      const childIdx = opt.series[0].data.findIndex(d => d.name === 'Child')
      expect(childIdx).toBeGreaterThanOrEqual(0)
      const html = opt.tooltip.formatter({ dataIndex: childIdx })
      // Breadcrumb should include both Parent and Child
      expect(html).toContain('Parent')
      expect(html).toContain('Child')
    })
  })

  describe('renderItem', () => {
    it('returns a group with one sector for a regular single-bit node', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [{ name: 'A', value: 10 }],
        },
        colors: () => '#aaa',
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const out = opt.series[0].renderItem(
        { dataIndex: 0 },
        { getWidth: () => 600, getHeight: () => 600 }
      ) as RenderItemGroup
      expect(out).toBeTruthy()
      expect(out.type).toBe('group')
      expect(out.children).toHaveLength(1)
      const sector = out.children[0]
      expect(sector.type).toBe('sector')
      expect(sector.shape.clockwise).toBe(true)
      expect(sector.style.fill).toBe('#aaa')
    })

    it('returns multiple bands for combination bit-mask name', () => {
      const w = createWrapper({
        data: {
          name: 'root',
          value: 0,
          children: [{ name: '5', value: 10 }], // bits 0+2 → 2 bands
        },
        colors: (k: string) => `#c${k}`,
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const out = opt.series[0].renderItem(
        { dataIndex: 0 },
        { getWidth: () => 400, getHeight: () => 400 }
      ) as RenderItemGroup
      expect(out.children).toHaveLength(2)
      // Bands should be colored by 2^bit i.e. "1" and "4"
      const fills = out.children.map(c => c.style.fill).sort()
      expect(fills).toEqual(['#c1', '#c4'])
    })

    it('returns null when dataIndex is out of bounds', () => {
      const w = createWrapper()
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const out = opt.series[0].renderItem(
        { dataIndex: 999 },
        { getWidth: () => 400, getHeight: () => 400 }
      )
      expect(out).toBeNull()
    })

    it('returns null for vanishingly small slices', () => {
      // Two siblings with one tiny value to force a thin slice on the other?
      // Easier: a single tree with two huge values, then call renderItem after
      // monkey-checking the slice bounds. We force the path by giving a node a
      // micro angle: with 200 children of equal size the angular width per
      // slice = 2π/200 ≈ 0.0314 (above threshold 0.005). Use 2000 children
      // for a tiny width.
      const data: SunburstNode = {
        name: 'root',
        value: 0,
        children: Array.from({ length: 2000 }, (_, i) => ({ name: `n${i}`, value: 1 })),
      }
      const w = createWrapper({ data, colors: () => '#111' })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      // 2π / 2000 ≈ 0.00314 < 0.005 → null
      const out = opt.series[0].renderItem(
        { dataIndex: 0 },
        { getWidth: () => 400, getHeight: () => 400 }
      )
      expect(out).toBeNull()
    })

    it('uses the smaller of width/height for radius', () => {
      const w = createWrapper({
        data: { name: 'root', value: 0, children: [{ name: 'A', value: 10 }] },
        colors: () => '#aaa',
      })
      const opt = w.findComponent({ name: 'VChart' }).props('option') as unknown as ChartOption
      const out = opt.series[0].renderItem(
        { dataIndex: 0 },
        { getWidth: () => 200, getHeight: () => 800 }
      ) as RenderItemGroup
      // R = min(cx, cy) * 0.9 = min(100, 400) * 0.9 = 90
      expect(out.children[0].shape.r).toBeCloseTo(90, 5)
    })
  })

  describe('arc-click emit', () => {
    it('emits arc-click with the resolved node data', () => {
      const w = createWrapper({
        data: { name: 'root', value: 0, children: [{ name: '1', value: 10 }] },
        colors: () => '#999',
      })
      const exposed = w.vm as unknown as { handleChartClick: (e: { dataIndex?: number }) => void }
      exposed.handleChartClick({ dataIndex: 0 })
      const events = w.emitted('arc-click') as Array<[SunburstNode]> | undefined
      expect(events).toBeTruthy()
      expect(events?.[0]?.[0]?.name).toBe('1')
    })

    it('ignores click without a valid dataIndex', () => {
      const w = createWrapper()
      const exposed = w.vm as unknown as { handleChartClick: (e: { dataIndex?: number }) => void }
      exposed.handleChartClick({})
      expect(w.emitted('arc-click')).toBeUndefined()
    })

    it('ignores click on out-of-range index', () => {
      const w = createWrapper()
      const exposed = w.vm as unknown as { handleChartClick: (e: { dataIndex?: number }) => void }
      exposed.handleChartClick({ dataIndex: 999 })
      expect(w.emitted('arc-click')).toBeUndefined()
    })
  })
})
