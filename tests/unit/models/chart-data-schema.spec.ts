import { describe, it, expect } from 'vitest'
import { LineChartDataSchema, MultiLineChartDataSchema } from '@/models/datasource.types'

// Regression guard: the dashboard report is run through Zod `safeParse` in the
// service layer, which strips any key the schema does not declare. These schemas
// MUST keep the time/value-axis fields, otherwise the axis data is silently
// removed and the chart builders crash on the missing arrays.
describe('chart data schemas preserve axis fields through parse', () => {
  it('LineChartDataSchema keeps xValues / monthCodes / xAxisType', () => {
    const parsed = LineChartDataSchema.parse({
      categories: ['0', '1'],
      series: [{ name: 'Percent', data: [100, 80] }],
      xAxisType: 'value',
      xValues: [0, 1],
      monthCodes: [200301, 200302],
      xAxisLabel: 'Days',
    })
    expect(parsed.xValues).toEqual([0, 1])
    expect(parsed.monthCodes).toEqual([200301, 200302])
    expect(parsed.xAxisType).toBe('value')
  })

  it('MultiLineChartDataSchema keeps xAxisType / monthCodes', () => {
    const parsed = MultiLineChartDataSchema.parse({
      series: [{ name: 's', data: [1, 2] }],
      xAxisType: 'time',
      monthCodes: [200301, 200302],
    })
    expect(parsed.xAxisType).toBe('time')
    expect(parsed.monthCodes).toEqual([200301, 200302])
  })
})
