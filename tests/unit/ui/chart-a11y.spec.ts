import { describe, it, expect, afterEach } from 'vitest'
import { init, use, type EChartsType } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TitleComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import { applyChartAriaDefaults, installChartA11y } from '@/ui/chart-a11y'

use([BarChart, GridComponent, TitleComponent, SVGRenderer])
installChartA11y()

describe('applyChartAriaDefaults', () => {
  it('enables aria when the option does not set it', () => {
    const option: Record<string, unknown> = { series: [] }
    applyChartAriaDefaults(option)
    expect(option.aria).toEqual({ enabled: true })
  })

  it('keeps an explicit aria setting', () => {
    const option = { aria: { enabled: false } }
    applyChartAriaDefaults(option)
    expect(option.aria).toEqual({ enabled: false })
  })

  it('ignores missing options', () => {
    expect(() => applyChartAriaDefaults(undefined)).not.toThrow()
  })
})

describe('installChartA11y', () => {
  let chart: EChartsType | undefined
  let dom: HTMLDivElement | undefined

  afterEach(() => {
    chart?.dispose()
    dom?.remove()
  })

  it('describes a chart to screen readers through an aria-label', () => {
    dom = document.createElement('div')
    document.body.appendChild(dom)
    chart = init(dom, null, { renderer: 'svg', width: 400, height: 300 })
    chart.setOption({
      title: { text: 'Gender' },
      xAxis: { type: 'category', data: ['Female', 'Male'] },
      yAxis: { type: 'value' },
      series: [{ name: 'Persons', type: 'bar', data: [120, 80] }],
    })

    const label = dom.getAttribute('aria-label') ?? ''
    expect(label).toContain('Gender')
    expect(label).toContain('Female')
    expect(label).toContain('120')
  })
})
