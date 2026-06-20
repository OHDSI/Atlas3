// Canonical chart data interfaces for @ohdsi/atlas-ui charts.

export type ChartXAxisType = 'category' | 'value' | 'time'

/** Index-aligned series used in category mode. */
export interface CategoryLineSeries {
  name: string
  data: number[]
}

/** [x, y] point series used in value/time mode. */
export interface ScalarLineSeries {
  name: string
  data: [number, number][]
}

export interface LineChartData {
  xAxisType?: ChartXAxisType
  categories?: string[]
  series: CategoryLineSeries[] | ScalarLineSeries[]
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface PieChartData {
  name: string
  value: number
}
