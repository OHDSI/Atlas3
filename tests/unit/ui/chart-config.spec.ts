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

// Regression: when the Zod report schema strips xValues/monthCodes (because the
// schema didn't list them), the builders received undefined arrays and crashed
// during chart render (TypeError: reading '0'), blanking the whole dashboard.
// The builders must not throw when those arrays are absent.
describe('builders are defensive when scalar/time arrays are missing', () => {
  it('dashboardCumulativeLineOptions does not throw without xValues (falls back to index)', () => {
    const opt = dashboardCumulativeLineOptions({
      categories: ['0', '1', '2'],
      series: [{ name: 'Percent', data: [100, 80, 60] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 100], [1, 80], [2, 60]])
  })

  it('multiLineChartOptions time mode does not throw without monthCodes', () => {
    expect(() =>
      multiLineChartOptions({
        xAxisType: 'time',
        series: [{ name: 's', data: [1, 2] }],
      })
    ).not.toThrow()
  })

  it('multiLineChartOptions value mode emits [x, y] pairs from xValues', () => {
    const opt = multiLineChartOptions({
      xAxisType: 'value',
      xValues: [10, 20],
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.xAxis.type).toBe('value')
    expect(opt.series[0].data).toEqual([[10, 1], [20, 2]])
  })

  it('multiLineChartOptions value mode falls back to index when xValues missing', () => {
    const opt = multiLineChartOptions({
      xAxisType: 'value',
      series: [{ name: 's', data: [5, 6] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 5], [1, 6]])
  })

  it('dashboardObservationMonthLineOptions falls back to index without monthCodes', () => {
    const opt = dashboardObservationMonthLineOptions({
      series: [{ name: 's', data: [1, 2] }],
    }) as any
    expect(opt.series[0].data).toEqual([[0, 1], [1, 2]])
  })
})
