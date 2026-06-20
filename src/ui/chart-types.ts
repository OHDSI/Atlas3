// Canonical chart data interfaces for @ohdsi/atlas-ui charts.

export type ChartXAxisType = 'category' | 'value' | 'time'

export interface LineChartSeries {
  name: string
  data: number[] // y-values, index-aligned to the x source below
}

export interface LineChartData {
  xAxisType?: ChartXAxisType
  /** category mode: the x labels */
  categories?: string[]
  /** time mode: YYYYMM codes aligned to each series' data */
  monthCodes?: (number | string)[]
  /** value mode: numeric x positions aligned to each series' data */
  xValues?: number[]
  series: LineChartSeries[]
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface PieChartData {
  name: string
  value: number
}
