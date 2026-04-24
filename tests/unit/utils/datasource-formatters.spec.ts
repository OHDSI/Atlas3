/**
 * Data Source Formatters Tests
 * Tests for data source transformation utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  transformDashboardReport,
  transformClinicalDomainReport,
  isEraReport,
  getMetricLabel,
  exportTableToCSV,
  formatNumber,
  formatPercentage,
  transformDataDensityReport,
  transformPersonReport,
  transformObservationPeriodReport,
  transformDeathReport
} from '@/utils/datasource-formatters'

describe('Data Source Formatters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transformDashboardReport', () => {
    it('should transform dashboard API response', () => {
      const raw = {
        summary: [
          { attributeName: 'Source name', attributeValue: 'Test DB' },
          { attributeName: 'Number of persons', attributeValue: '1000000' }
        ],
        gender: [
          { conceptName: 'Male', countValue: 600000 },
          { conceptName: 'Female', countValue: 400000 }
        ],
        ageAtFirstObservation: [
          { intervalIndex: 0, countValue: 100 },
          { intervalIndex: 10, countValue: 200 }
        ],
        cumulativeObservation: [
          { xLengthOfObservation: 30, yPercentPersons: 50 },
          { xLengthOfObservation: 60, yPercentPersons: 75 }
        ],
        observedByMonth: [
          { monthYear: 202301, countValue: 1000 },
          { monthYear: 202302, countValue: 1100 }
        ]
      }

      const result = transformDashboardReport(raw)

      expect(result.summary.sourceName).toBe('Test DB')
      expect(result.summary.personCount).toBe(1000000)
      expect(result.genderDistribution).toHaveLength(2)
      expect(result.ageDistribution.categories).toHaveLength(2)
      expect(result.cumulativeObservation.categories).toHaveLength(2)
      expect(result.observationByMonth.categories).toHaveLength(2)
    })
  })

  describe('transformClinicalDomainReport', () => {
    it('should transform clinical domain data', () => {
      const raw = [
        { conceptId: 1, conceptPath: 'Condition A', numPersons: 100, percentPersons: 10, recordsPerPerson: 2 },
        { conceptId: 2, conceptPath: 'Condition B', numPersons: 50, percentPersons: 5, recordsPerPerson: 1 }
      ]

      const result = transformClinicalDomainReport(raw, 'conditionOccurrence')

      expect(result.tableRows).toHaveLength(2)
      expect(result.treemapNodes).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('should use lengthOfEra for era reports', () => {
      const raw = [
        { conceptId: 1, conceptPath: 'Drug A', numPersons: 100, percentPersons: 10, lengthOfEra: 30 }
      ]

      const result = transformClinicalDomainReport(raw, 'drugEra')

      expect(result.tableRows[0].metric).toBe(30)
    })

    it('should aggregate large datasets', () => {
      // Create 15000 items
      const raw = Array(15000).fill(null).map((_, i) => ({
        conceptId: i,
        conceptPath: `Condition ${i}`,
        numPersons: 100 - (i % 100),
        percentPersons: 0.01,
        recordsPerPerson: 1
      }))

      const result = transformClinicalDomainReport(raw, 'conditionOccurrence')

      // Should be aggregated to ~1001 (top 1000 + Other)
      expect(result.tableRows.length).toBeLessThanOrEqual(1001)
      expect(result.totalCount).toBe(15000)
    })
  })

  describe('isEraReport', () => {
    it('should return true for conditionEra', () => {
      expect(isEraReport('conditionEra')).toBe(true)
    })

    it('should return true for drugEra', () => {
      expect(isEraReport('drugEra')).toBe(true)
    })

    it('should return false for conditionOccurrence', () => {
      expect(isEraReport('conditionOccurrence')).toBe(false)
    })

    it('should return false for drugExposure', () => {
      expect(isEraReport('drugExposure')).toBe(false)
    })
  })

  describe('getMetricLabel', () => {
    it('should return Length of Era for era reports', () => {
      expect(getMetricLabel('conditionEra')).toBe('Length of Era')
      expect(getMetricLabel('drugEra')).toBe('Length of Era')
    })

    it('should return Records Per Person for non-era reports', () => {
      expect(getMetricLabel('conditionOccurrence')).toBe('Records Per Person')
      expect(getMetricLabel('drugExposure')).toBe('Records Per Person')
    })
  })

  describe('exportTableToCSV', () => {
    it('should generate CSV string', () => {
      const rows = [
        { conceptId: 1, conceptName: 'Condition A', personCount: 100, prevalence: 10.5, metric: 2.5 },
        { conceptId: 2, conceptName: 'Condition B', personCount: 50, prevalence: 5.25, metric: 1.0 }
      ]

      const csv = exportTableToCSV(rows, 'Records Per Person')

      expect(csv).toContain('Concept ID,Name,Person Count,Prevalence (%),Records Per Person')
      expect(csv).toContain('1,"Condition A",100,10.50,2.50')
    })

    it('should escape quotes in concept names', () => {
      const rows = [
        { conceptId: 1, conceptName: 'Condition "Test"', personCount: 100, prevalence: 10, metric: 1 }
      ]

      const csv = exportTableToCSV(rows, 'Metric')

      expect(csv).toContain('""Test""')
    })
  })

  describe('formatNumber', () => {
    it('should format with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('should format small numbers', () => {
      expect(formatNumber(100)).toBe('100')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(10.567)).toBe('10.57%')
    })

    it('should format with custom decimals', () => {
      expect(formatPercentage(10.5, 1)).toBe('10.5%')
    })
  })

  describe('transformDataDensityReport', () => {
    it('should transform data density data', () => {
      const raw = {
        totalRecords: [
          { xCalendarMonth: 202301, seriesName: 'Condition', yRecordCount: 1000 }
        ],
        recordsPerPerson: [
          { xCalendarMonth: 202301, seriesName: 'Records', yRecordCount: 5 }
        ],
        conceptsPerPerson: [
          { category: 'Drug', medianValue: 10 }
        ]
      }

      const result = transformDataDensityReport(raw)

      expect(result.totalRecords.categories).toHaveLength(1)
      expect(result.recordsPerPerson.series.length).toBeGreaterThanOrEqual(0)
      expect(result.conceptsPerPerson).toHaveLength(1)
      expect(result.conceptsPerPerson[0].category).toBe('Drug')
      expect(result.conceptsPerPerson[0].median).toBe(10)
    })
  })

  describe('transformDataDensityReport — conceptsPerPerson boxplot', () => {
    it('maps all 7 percentile fields per category', () => {
      const raw = {
        totalRecords: [],
        recordsPerPerson: [],
        conceptsPerPerson: [
          {
            category: 'condition_occurrence',
            minValue: 1, p10Value: 2, p25Value: 5, medianValue: 10,
            p75Value: 18, p90Value: 30, maxValue: 55
          },
          {
            category: 'drug_exposure',
            minValue: 0, p10Value: 1, p25Value: 3, medianValue: 7,
            p75Value: 15, p90Value: 28, maxValue: 60
          }
        ]
      }

      const result = transformDataDensityReport(raw)

      expect(result.conceptsPerPerson).toEqual([
        { category: 'condition_occurrence', min: 1, p10: 2, p25: 5, median: 10, p75: 18, p90: 30, max: 55 },
        { category: 'drug_exposure',        min: 0, p10: 1, p25: 3, median: 7,  p75: 15, p90: 28, max: 60 }
      ])
    })

    it('returns empty array when conceptsPerPerson is missing', () => {
      const result = transformDataDensityReport({ totalRecords: [], recordsPerPerson: [] })
      expect(result.conceptsPerPerson).toEqual([])
    })
  })

  describe('transformPersonReport', () => {
    it('should transform person data', () => {
      const raw = {
        yearOfBirth: [
          { year: 1980, countValue: 1000 },
          { yearOfBirth: 1990, count: 2000 }
        ],
        gender: [
          { conceptName: 'Male', countValue: 5000 },
          { name: 'Female', count: 4000 }
        ],
        race: [
          { conceptName: 'White', countValue: 6000 }
        ],
        ethnicity: [
          { conceptName: 'Non-Hispanic', countValue: 8000 }
        ]
      }

      const result = transformPersonReport(raw)

      expect(result.yearOfBirth.categories).toHaveLength(2)
      expect(result.gender).toHaveLength(2)
      expect(result.race).toHaveLength(1)
      expect(result.ethnicity).toHaveLength(1)
    })
  })

  describe('transformObservationPeriodReport', () => {
    it('should transform observation period data', () => {
      const raw = {
        ageAtFirst: [
          { intervalIndex: 0, countValue: 100 }
        ],
        observationLength: [
          { intervalIndex: 30, countValue: 200 }
        ],
        cumulativeObservation: [
          { xLengthOfObservation: 365, yPercentPersons: 80 }
        ],
        observedByMonth: [
          { monthYear: 202301, countValue: 1000 }
        ]
      }

      const result = transformObservationPeriodReport(raw)

      expect(result.ageAtFirst?.categories).toHaveLength(1)
      expect(result.observationLength?.categories).toHaveLength(1)
      expect(result.cumulativeObservation?.categories).toHaveLength(1)
      expect(result.observedByMonth?.categories).toHaveLength(1)
    })

    it('should handle missing data', () => {
      const raw = {}

      const result = transformObservationPeriodReport(raw)

      expect(result.ageAtFirst).toBeUndefined()
      expect(result.observationLength).toBeUndefined()
    })
  })

  describe('transformObservationPeriodReport — boxplots and new fields', () => {
    it('maps ageByGender to BoxPlotData[]', () => {
      const raw = {
        ageByGender: [
          { category: 'MALE',   minValue: 0, p10Value: 5, p25Value: 15, medianValue: 35, p75Value: 55, p90Value: 70, maxValue: 90 },
          { category: 'FEMALE', minValue: 0, p10Value: 6, p25Value: 16, medianValue: 38, p75Value: 58, p90Value: 72, maxValue: 92 }
        ]
      }

      const result = transformObservationPeriodReport(raw)

      expect(result.ageByGender).toEqual([
        { category: 'MALE',   min: 0, p10: 5, p25: 15, median: 35, p75: 55, p90: 70, max: 90 },
        { category: 'FEMALE', min: 0, p10: 6, p25: 16, median: 38, p75: 58, p90: 72, max: 92 }
      ])
    })

    it('maps durationByGender to BoxPlotData[]', () => {
      const raw = {
        durationByGender: [
          { category: 'MALE',   minValue: 1, p10Value: 30, p25Value: 120, medianValue: 365, p75Value: 730, p90Value: 1095, maxValue: 3650 }
        ]
      }

      const result = transformObservationPeriodReport(raw)
      expect(result.durationByGender).toEqual([
        { category: 'MALE', min: 1, p10: 30, p25: 120, median: 365, p75: 730, p90: 1095, max: 3650 }
      ])
    })

    it('maps durationByAgeDecile to BoxPlotData[]', () => {
      const raw = {
        durationByAgeDecile: [
          { category: '0-9',   minValue: 1, p10Value: 30, p25Value: 100, medianValue: 365, p75Value: 730, p90Value: 1095, maxValue: 3650 },
          { category: '10-19', minValue: 1, p10Value: 40, p25Value: 120, medianValue: 400, p75Value: 800, p90Value: 1200, maxValue: 3700 }
        ]
      }

      const result = transformObservationPeriodReport(raw)
      expect(result.durationByAgeDecile).toHaveLength(2)
      expect(result.durationByAgeDecile?.[0].category).toBe('0-9')
      expect(result.durationByAgeDecile?.[0].median).toBe(365)
    })

    it('maps personsWithContinuousObservationsByYear to histogram', () => {
      const raw = {
        personsWithContinuousObservationsByYear: [
          { intervalIndex: 2005, countValue: 1000 },
          { intervalIndex: 2006, countValue: 1500 },
          { intervalIndex: 2007, countValue: 2000 }
        ]
      }

      const result = transformObservationPeriodReport(raw)
      expect(result.personsWithContinuousObsByYear).toEqual({
        categories: ['2005', '2006', '2007'],
        values: [1000, 1500, 2000]
      })
    })

    it('maps observationPeriodsPerPerson to PieChartData[]', () => {
      const raw = {
        observationPeriodsPerPerson: [
          { conceptName: '1', countValue: 900000 },
          { conceptName: '2', countValue: 80000 },
          { conceptName: '3', countValue: 15000 }
        ]
      }

      const result = transformObservationPeriodReport(raw)
      expect(result.observationPeriodsPerPerson).toEqual([
        { name: '1', value: 900000 },
        { name: '2', value: 80000 },
        { name: '3', value: 15000 }
      ])
    })

    it('returns undefined for missing optional fields', () => {
      const result = transformObservationPeriodReport({})
      expect(result.ageByGender).toBeUndefined()
      expect(result.durationByGender).toBeUndefined()
      expect(result.durationByAgeDecile).toBeUndefined()
      expect(result.personsWithContinuousObsByYear).toBeUndefined()
      expect(result.observationPeriodsPerPerson).toBeUndefined()
    })
  })

  describe('transformDeathReport', () => {
    it('should transform death data', () => {
      const raw = {
        ageAtDeath: [
          { category: '65-70', minValue: 65, p10Value: 66, p25Value: 67, medianValue: 68 }
        ],
        deathByType: [
          { conceptName: 'Natural', countValue: 500 }
        ],
        prevalenceByMonth: [
          { xCalendarMonth: 202301, yPrevalence1000Pp: 0.5 }
        ]
      }

      const result = transformDeathReport(raw)

      expect(result.ageAtDeath).toHaveLength(1)
      expect(result.deathByType).toHaveLength(1)
      expect(result.prevalenceByMonth?.categories).toHaveLength(1)
    })

    it('should handle missing data', () => {
      const raw = {}

      const result = transformDeathReport(raw)

      expect(result.ageAtDeath).toEqual([])
      expect(result.deathByType).toEqual([])
    })
  })

  describe('transformDeathReport — trellis and boxplot', () => {
    it('maps ageAtDeath to BoxPlotData[]', () => {
      const raw = {
        ageAtDeath: [
          { category: 'MALE',   minValue: 30, p10Value: 45, p25Value: 58, medianValue: 70, p75Value: 80, p90Value: 88, maxValue: 100 },
          { category: 'FEMALE', minValue: 32, p10Value: 48, p25Value: 60, medianValue: 72, p75Value: 82, p90Value: 90, maxValue: 105 }
        ]
      }

      const result = transformDeathReport(raw)

      expect(result.ageAtDeath).toEqual([
        { category: 'MALE',   min: 30, p10: 45, p25: 58, median: 70, p75: 80, p90: 88, max: 100 },
        { category: 'FEMALE', min: 32, p10: 48, p25: 60, median: 72, p75: 82, p90: 90, max: 105 }
      ])
    })

    it('maps prevalenceByGenderAgeYear to TrellisChartData grouped by decile and gender', () => {
      const raw = {
        prevalenceByGenderAgeYear: [
          { trellisName: '60 - 69', seriesName: 'MALE',   xCalendarYear: 2010, yPrevalence1000Pp: 12 },
          { trellisName: '60 - 69', seriesName: 'MALE',   xCalendarYear: 2011, yPrevalence1000Pp: 14 },
          { trellisName: '60 - 69', seriesName: 'FEMALE', xCalendarYear: 2010, yPrevalence1000Pp: 10 },
          { trellisName: '70 - 79', seriesName: 'MALE',   xCalendarYear: 2010, yPrevalence1000Pp: 25 }
        ]
      }

      const result = transformDeathReport(raw)
      expect(result.prevalenceByGenderAgeYear).toBeDefined()
      const trellis = result.prevalenceByGenderAgeYear!
      expect(trellis.categories).toEqual(expect.arrayContaining(['60 - 69', '70 - 79']))
      const maleIn60s = trellis.series.find(s => s.category === '60 - 69' && s.name === 'MALE')
      expect(maleIn60s?.data).toEqual([{ x: 2010, y: 12 }, { x: 2011, y: 14 }])
    })

    it('returns undefined prevalenceByGenderAgeYear when raw is missing', () => {
      const result = transformDeathReport({})
      expect(result.prevalenceByGenderAgeYear).toBeUndefined()
    })
  })
})
