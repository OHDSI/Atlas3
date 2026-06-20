import { describe, it, expect } from 'vitest'
import { parseYyyymm, dashboardObservationMonthLineOptions } from '@/ui/chart-config'

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
