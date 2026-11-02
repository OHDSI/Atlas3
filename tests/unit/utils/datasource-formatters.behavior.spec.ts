import { describe, it, expect, vi } from 'vitest'

vi.mock('@/composables/useI18n', async () => (await import('../../helpers/i18n-mock')).mockUseI18n)
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import {
  transformDashboardReport,
  transformClinicalDomainReport,
  getMetricLabel,
  exportTableToCSV,
  transformDataDensityReport,
  transformPersonReport,
  transformObservationPeriodReport,
  transformDeathReport,
} from '@/utils/datasource-formatters'
import type { ClinicalDomainAPIResponse, DashboardAPIResponse } from '@/models/datasource.types'

function dashboard(overrides: Partial<DashboardAPIResponse> = {}): DashboardAPIResponse {
  return {
    summary: [],
    gender: [],
    ageAtFirstObservation: [],
    cumulativeObservation: [],
    observedByMonth: [],
    ...overrides,
  } as DashboardAPIResponse
}

function clinicalRow(overrides: Partial<ClinicalDomainAPIResponse>): ClinicalDomainAPIResponse {
  return {
    conceptId: 1,
    conceptPath: 'A',
    numPersons: 1,
    percentPersons: 0.1,
    recordsPerPerson: 1,
    ...overrides,
  } as ClinicalDomainAPIResponse
}

describe('transformDashboardReport output shape', () => {
  it('maps gender, age and labels and sorts observation series ascending without mutating input', () => {
    const cumulative = [
      { xLengthOfObservation: 60, yPercentPersons: 0.5 },
      { xLengthOfObservation: 30 },
      { yPercentPersons: 0.9 },
    ]
    const byMonth = [
      { monthYear: 202302, countValue: 20 },
      { monthYear: 202301 },
      { countValue: 7 },
    ]
    const raw = dashboard({
      summary: [
        { attributeName: 'Number of persons', attributeValue: '42' },
        { attributeName: 'Source name', attributeValue: 'Synpuf' },
      ],
      gender: [{ conceptName: 'Male', countValue: 3 }],
      ageAtFirstObservation: [{ intervalIndex: 5, countValue: 9 }],
      cumulativeObservation: cumulative,
      observedByMonth: byMonth,
    } as Partial<DashboardAPIResponse>)

    const result = transformDashboardReport(raw)

    expect(result).toEqual({
      summary: { sourceName: 'Synpuf', personCount: 42 },
      genderDistribution: [{ name: 'Male', value: 3 }],
      ageDistribution: {
        intervalSize: 1,
        offset: 0,
        bins: [{ intervalIndex: 5, countValue: 9 }],
        unit: 'Person Count',
        seriesName: 'Person Count',
        xAxisLabel: 'Age',
      },
      cumulativeObservation: {
        categories: ['', '30', '60'],
        xValues: [0, 30, 60],
        series: [{ name: 'Cumulative Observation', data: [0.9, 0, 0.5] }],
        xAxisLabel: 'Days',
        yAxisLabel: 'Percent of Persons',
      },
      observationByMonth: {
        categories: ['', '202301', '202302'],
        monthCodes: [0, 202301, 202302],
        xAxisType: 'time',
        series: [{ name: 'Observation Count', data: [7, 0, 20] }],
        xAxisLabel: 'Month',
        yAxisLabel: 'Count',
      },
    })
    expect(cumulative[0]).toEqual({ xLengthOfObservation: 60, yPercentPersons: 0.5 })
    expect(byMonth[0]).toEqual({ monthYear: 202302, countValue: 20 })
  })

  it('renders a zero x-length as "0" rather than an empty category', () => {
    const result = transformDashboardReport(
      dashboard({ cumulativeObservation: [{ xLengthOfObservation: 0, yPercentPersons: 0 }] } as Partial<DashboardAPIResponse>)
    )
    expect(result.cumulativeObservation.categories).toEqual(['0'])
  })

  it('produces empty series when the observation arrays are missing', () => {
    const raw = dashboard()
    delete (raw as Partial<DashboardAPIResponse>).cumulativeObservation
    delete (raw as Partial<DashboardAPIResponse>).observedByMonth

    const result = transformDashboardReport(raw)

    expect(result.cumulativeObservation.categories).toEqual([])
    expect(result.cumulativeObservation.xValues).toEqual([])
    expect(result.cumulativeObservation.series[0]?.data).toEqual([])
    expect(result.observationByMonth.categories).toEqual([])
    expect(result.observationByMonth.monthCodes).toEqual([])
  })

  it('ignores a summary entry with a different attribute name', () => {
    const result = transformDashboardReport(
      dashboard({ summary: [{ attributeName: 'Other', attributeValue: 'X' }] } as Partial<DashboardAPIResponse>)
    )
    expect(result.summary.sourceName).toBe('')
  })

  describe('length-of-observation axis switches to years only when the span exceeds 1000 days', () => {
    const axisFor = (xs: number[]) =>
      transformDashboardReport(
        dashboard({
          cumulativeObservation: xs.map(x => ({ xLengthOfObservation: x, yPercentPersons: 1 })),
        } as Partial<DashboardAPIResponse>)
      ).cumulativeObservation

    it('converts days to years rounded to two decimals for a large span', () => {
      const axis = axisFor([2000, 0, 1000])
      expect(axis.xAxisLabel).toBe('Years')
      expect(axis.xValues).toEqual([0, 2.74, 5.48])
      expect(axis.categories).toEqual(['0', '1000', '2000'])
    })

    it('keeps days when the span is exactly 1000', () => {
      const axis = axisFor([0, 1000])
      expect(axis.xAxisLabel).toBe('Days')
      expect(axis.xValues).toEqual([0, 1000])
    })

    it('switches to years when the span is 1001', () => {
      expect(axisFor([0, 1001]).xAxisLabel).toBe('Years')
    })

    it('measures the span from the first point, not from zero', () => {
      const axis = axisFor([500, 1400])
      expect(axis.xAxisLabel).toBe('Days')
      expect(axis.xValues).toEqual([500, 1400])
    })
  })
})

describe('transformClinicalDomainReport selection and colour', () => {
  it('keeps every row in input order at exactly the 10000-row threshold', () => {
    const raw = Array.from({ length: 10000 }, (_, i) =>
      clinicalRow({ conceptId: i, percentPersons: i / 10000 })
    )
    const result = transformClinicalDomainReport(raw, 'conditionOccurrence')
    expect(result.tableRows).toHaveLength(10000)
    expect(result.tableRows[0]?.conceptId).toBe(0)
  })

  it('keeps the 1000 highest-prevalence rows, highest first, above the threshold', () => {
    const raw = Array.from({ length: 10001 }, (_, i) =>
      clinicalRow({ conceptId: i, percentPersons: i / 10001 })
    )
    const result = transformClinicalDomainReport(raw, 'conditionOccurrence')
    expect(result.tableRows).toHaveLength(1000)
    expect(result.tableRows[0]?.conceptId).toBe(10000)
    expect(result.tableRows[999]?.conceptId).toBe(9001)
    expect(result.treemapNodes[0]?.conceptId).toBe(10000)
    expect(raw[0]?.conceptId).toBe(0)
  })

  it('maps table rows and treemap nodes field by field', () => {
    const result = transformClinicalDomainReport(
      [clinicalRow({ conceptId: 7, conceptPath: 'X||  Leaf  ', numPersons: 12, percentPersons: 0.25, recordsPerPerson: 3 })],
      'conditionOccurrence'
    )
    expect(result).toEqual({
      tableRows: [{ conceptId: 7, conceptName: 'Leaf', personCount: 12, prevalence: 25, metric: 3 }],
      treemapNodes: [{ name: 'Leaf', value: 12, colorValue: 3, conceptId: 7, conceptPath: 'X||  Leaf  ' }],
      totalCount: 1,
    })
  })

  it('drops a non-finite colour value', () => {
    const result = transformClinicalDomainReport(
      [clinicalRow({ recordsPerPerson: NaN }), clinicalRow({ recordsPerPerson: Infinity })],
      'conditionOccurrence'
    )
    expect(result.treemapNodes.map(n => n.colorValue)).toEqual([undefined, undefined])
  })

  it('colours era reports by lengthOfEra rather than recordsPerPerson', () => {
    const result = transformClinicalDomainReport(
      [clinicalRow({ recordsPerPerson: 2, lengthOfEra: 40 })],
      'conditionEra'
    )
    expect(result.treemapNodes[0]?.colorValue).toBe(40)
    expect(result.tableRows[0]?.metric).toBe(40)
  })

  it('treats a missing conceptPath as an empty name', () => {
    const result = transformClinicalDomainReport(
      [clinicalRow({ conceptPath: null as unknown as string })],
      'conditionOccurrence'
    )
    expect(result.tableRows[0]?.conceptName).toBe('')
  })
})

describe('getMetricLabel / exportTableToCSV', () => {
  it('labels era and non-era metrics', () => {
    expect(getMetricLabel('drugEra')).toBe('Length of Era')
    expect(getMetricLabel('drugExposure')).toBe('Records Per Person')
  })

  it('writes fixed headers and two-decimal numeric columns', () => {
    const csv = exportTableToCSV(
      [{ conceptId: 1, conceptName: 'A', personCount: 5, prevalence: 12.345, metric: 1 }],
      'Metric'
    )
    expect(csv.split(/\r?\n/).slice(0, 2)).toEqual([
      'Concept ID,Name,Person Count,Prevalence (%),Metric',
      '1,A,5,12.35,1.00',
    ])
  })
})

describe('transformDataDensityReport alignment', () => {
  it('sorts months numerically and aligns every series to the union of months', () => {
    const result = transformDataDensityReport({
      totalRecords: [
        { xCalendarMonth: 202303, seriesName: 'Visit', yRecordCount: 3 },
        { xCalendarMonth: 202301, seriesName: 'Drug', yRecordCount: 1 },
        { xCalendarMonth: 202302, seriesName: 'Visit' },
      ],
      recordsPerPerson: [
        { xCalendarMonth: 202305, seriesName: 'Visit', yRecordCount: 0.5 },
        { xCalendarMonth: 202304, seriesName: 'Drug', yRecordCount: 2 },
        { xCalendarMonth: 202306, seriesName: 'Drug' },
      ],
    })

    expect(result.totalRecords).toEqual({
      categories: ['202301', '202302', '202303'],
      xAxisType: 'time',
      monthCodes: [202301, 202302, 202303],
      series: [
        { name: 'Visit', data: [0, 0, 3] },
        { name: 'Drug', data: [1, 0, 0] },
      ],
    })
    expect(result.recordsPerPerson).toEqual({
      categories: ['202304', '202305', '202306'],
      xAxisType: 'time',
      monthCodes: [202304, 202305, 202306],
      series: [
        { name: 'Visit', data: [0, 0.5, 0] },
        { name: 'Drug', data: [2, 0, 0] },
      ],
    })
  })
})

describe('transformPersonReport', () => {
  it('ignores yearOfBirthStats when there are no year-of-birth bins', () => {
    const result = transformPersonReport({
      yearOfBirth: [],
      yearOfBirthStats: [{ minValue: 1910, intervalSize: 5 }],
    })
    expect(result.yearOfBirth).toEqual({
      intervalSize: 1,
      offset: 0,
      bins: [],
      unit: 'Person Count',
      seriesName: 'Person Count',
      xAxisLabel: 'Year of Birth',
    })
  })

  it('uses the stats offset and interval and sorts bins by interval index', () => {
    const result = transformPersonReport({
      yearOfBirth: [
        { intervalIndex: 3, countValue: 30 },
        { intervalIndex: 1, countValue: 10 },
      ],
      yearOfBirthStats: [{ minValue: 1950, intervalSize: 5 }],
    })
    expect(result.yearOfBirth).toEqual({
      intervalSize: 5,
      offset: 1950,
      bins: [
        { intervalIndex: 1, countValue: 10 },
        { intervalIndex: 3, countValue: 30 },
      ],
      unit: 'Person Count',
      seriesName: 'Person Count',
      xAxisLabel: 'Year of Birth',
    })
  })

  it('falls back from conceptName to name and from countValue to count for race and ethnicity', () => {
    const result = transformPersonReport({
      race: [{ name: 'White', count: 4 }],
      ethnicity: [{ name: 'Hispanic', count: 6 }],
    })
    expect(result.race).toEqual([{ name: 'White', value: 4 }])
    expect(result.ethnicity).toEqual([{ name: 'Hispanic', value: 6 }])
  })
})

describe('transformObservationPeriodReport', () => {
  it('sorts age-at-first bins and labels them', () => {
    const result = transformObservationPeriodReport({
      ageAtFirst: [
        { intervalIndex: 40, countValue: 4 },
        { intervalIndex: 20, countValue: 2 },
      ],
    })
    expect(result.ageAtFirst).toEqual({
      intervalSize: 1,
      offset: 0,
      bins: [
        { intervalIndex: 20, countValue: 2 },
        { intervalIndex: 40, countValue: 4 },
      ],
      unit: 'Person Count',
      seriesName: 'Person Count',
      xAxisLabel: 'Age',
    })
  })

  it('defaults the observation-length interval to 1 when the stats array is empty', () => {
    const result = transformObservationPeriodReport({
      observationLength: [{ intervalIndex: 2, countValue: 1 }],
      observationLengthStats: [],
    })
    expect(result.observationLength?.intervalSize).toBe(1)
    expect(result.observationLength?.xAxisLabel).toBe('Days')
  })

  it('switches observation length to years when the last bin lies beyond 1000 days', () => {
    const result = transformObservationPeriodReport({
      observationLength: [
        { intervalIndex: 40, countValue: 1 },
        { intervalIndex: 0, countValue: 5 },
      ],
      observationLengthStats: [{ intervalSize: 30 }],
    })
    expect(result.observationLength).toEqual({
      intervalSize: 30 / 365.25,
      offset: 0,
      bins: [
        { intervalIndex: 0, countValue: 5 },
        { intervalIndex: 40, countValue: 1 },
      ],
      unit: 'Person Count',
      seriesName: 'Person Count',
      xAxisLabel: 'Years',
    })
  })

  it('keeps days when the last bin is exactly 1000 days', () => {
    const result = transformObservationPeriodReport({
      observationLength: [{ intervalIndex: 100, countValue: 1 }],
      observationLengthStats: [{ intervalSize: 10 }],
    })
    expect(result.observationLength?.intervalSize).toBe(10)
    expect(result.observationLength?.xAxisLabel).toBe('Days')
  })

  it('sorts cumulative observation and observed-by-month series and labels them', () => {
    const result = transformObservationPeriodReport({
      cumulativeObservation: [
        { xLengthOfObservation: 90, yPercentPersons: 0.2 },
        { xLengthOfObservation: 30, yPercentPersons: 0.8 },
      ],
      observedByMonth: [
        { monthYear: 202002, countValue: 2 },
        { monthYear: 202001, countValue: 1 },
      ],
    })
    expect(result.cumulativeObservation).toEqual({
      categories: ['30', '90'],
      xAxisType: 'value',
      xValues: [30, 90],
      xAxisLabel: 'Days',
      yAxisLabel: 'Percent of Persons',
      yAxisFormat: 'percent',
      series: [{ name: 'Cumulative %', data: [0.8, 0.2] }],
    })
    expect(result.observedByMonth).toEqual({
      categories: ['202001', '202002'],
      xAxisType: 'time',
      monthCodes: [202001, 202002],
      series: [{ name: 'Persons', data: [1, 2] }],
    })
  })

  it('maps missing x values to 0 on the axis', () => {
    const result = transformObservationPeriodReport({
      cumulativeObservation: [{ yPercentPersons: 1 }],
      observedByMonth: [{ countValue: 1 }],
    })
    expect(result.cumulativeObservation?.xValues).toEqual([0])
    expect(result.observedByMonth?.monthCodes).toEqual([0])
  })
})

describe('transformDeathReport', () => {
  it('sorts prevalence by month and labels the series', () => {
    const result = transformDeathReport({
      prevalenceByMonth: [
        { xCalendarMonth: 201902, yPrevalence1000Pp: 2 },
        { xCalendarMonth: 201901, yPrevalence1000Pp: 1 },
        { yPrevalence1000Pp: 9 },
      ],
    })
    expect(result.prevalenceByMonth).toEqual({
      categories: ['', '201901', '201902'],
      xAxisType: 'time',
      monthCodes: [0, 201901, 201902],
      series: [{ name: 'Prevalence per 1000', data: [9, 1, 2] }],
    })
  })

  it('sorts each trellis series by year', () => {
    const result = transformDeathReport({
      prevalenceByGenderAgeYear: [
        { trellisName: '40-49', seriesName: 'MALE', xCalendarYear: 2012, yPrevalence1000Pp: 2 },
        { trellisName: '40-49', seriesName: 'MALE', xCalendarYear: 2010, yPrevalence1000Pp: 1 },
      ],
    })
    expect(result.prevalenceByGenderAgeYear?.series).toEqual([
      {
        name: 'MALE',
        category: '40-49',
        data: [
          { x: 2010, y: 1 },
          { x: 2012, y: 2 },
        ],
      },
    ])
  })
})
