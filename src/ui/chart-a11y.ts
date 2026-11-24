/**
 * Screen reader support for ECharts.
 *
 * Charts render to a canvas, which assistive technology cannot read. ECharts'
 * aria component writes a generated description of the chart (title, series,
 * and their leading data values) into an aria-label on the chart container.
 * It is off by default, so a global preprocessor turns it on for every chart
 * that does not set `aria` itself.
 */
import { registerPreprocessor, use } from 'echarts/core'
import { AriaComponent } from 'echarts/components'

type RawOption = { aria?: unknown } & Record<string, unknown>

export function applyChartAriaDefaults(option: RawOption | null | undefined): void {
  if (!option || typeof option !== 'object') return
  if (option.aria !== undefined) return
  option.aria = { enabled: true }
}

let installed = false

export function installChartA11y(): void {
  if (installed) return
  installed = true
  use([AriaComponent])
  registerPreprocessor(option => applyChartAriaDefaults(option as RawOption))
}
