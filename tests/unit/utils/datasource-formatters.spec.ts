/**
 * Unit Tests: Datasource Formatters
 * Tests for src/utils/datasource-formatters.ts
 */

import { describe, it, expect, vi } from 'vitest'
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
  transformDeathReport,
} from '@/utils/datasource-formatters'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('datasource-formatters', () => {
  describe('transformDashboardReport', () => {
    it('transforms dashboard API response', () => {
      const raw = {
        summary: [
          { attributeName: 'Source name', attributeValue: 'Test Source' },
          { attributeName: 'Number of persons', attributeValue: '1000' },
        ],
        gender: [
          { conceptName: 'MALE', countValue: 500 },
          { conceptName: 'FEMALE', countValue: 500 },
        ],
        ageAtFirstObservation: [
          { intervalIndex: 0, countValue: 100 },
          { intervalIndex: 1, countValue: 200 },
        ],
        cumulativeObservation: [
          { xLengthOfObservation: 30, yPercentPersons: 50 },
          { xLengthOfObservation: 60, yPercentPersons: 75 },
        ],
        observedByMonth: [
          { monthYear: 202401, countValue: 100 },
          { monthYear: 202402, countValue: 150 },
        ],
      }

      const result = transformDashboardReport(raw as never)

      expect(result.summary.sourceName).toBe('Test Source')
      expect(result.summary.personCount).toBe(1000)
      expect(result.genderDistribution).toHaveLength(2)
      expect(result.ageDistribution.categories).toHaveLength(2)
      expect(result.cumulativeObservation.series[0].data).toHaveLength(2)
      expect(result.observationByMonth.series[0].data).toHaveLength(2)
    })

    it('handles missing summary attributes', () => {
      const raw = {
        summary: [],
        gender: [],
        ageAtFirstObservation: [],
        cumulativeObservation: [],
        observedByMonth: [],
      }

      const result = transformDashboardReport(raw as never)

      expect(result.summary.sourceName).toBe('')
      expect(result.summary.personCount).toBe(0)
    })
  })

  describe('transformClinicalDomainReport', () => {
    it('transforms clinical domain data', () => {
      const raw = [
        {
          conceptId: 1,
          conceptPath: 'Condition A',
          numPersons: 100,
          percentPersons: 10,
          recordsPerPerson: 2.5,
        },
        {
          conceptId: 2,
          conceptPath: 'Condition B',
          numPersons: 50,
          percentPersons: 5,
          recordsPerPerson: 1.2,
        },
      ]

      const result = transformClinicalDomainReport(raw as never, 'conditionOccurrence')

      expect(result.tableRows).toHaveLength(2)
      expect(result.tableRows[0].conceptName).toBe('Condition A')
      expect(result.treemapNodes).toHaveLength(2)
      expect(result.totalCount).toBe(2)
    })

    it('uses lengthOfEra for era reports', () => {
      const raw = [
        {
          conceptId: 1,
          conceptPath: 'Drug Era A',
          numPersons: 100,
          percentPersons: 10,
          lengthOfEra: 30,
        },
      ]

      const result = transformClinicalDomainReport(raw as never, 'drugEra')

      expect(result.tableRows[0].metric).toBe(30)
    })
  })

  describe('isEraReport', () => {
    it('returns true for conditionEra', () => {
      expect(isEraReport('conditionEra')).toBe(true)
    })

    it('returns true for drugEra', () => {
      expect(isEraReport('drugEra')).toBe(true)
    })

    it('returns false for other report types', () => {
      expect(isEraReport('conditionOccurrence')).toBe(false)
      expect(isEraReport('drugExposure')).toBe(false)
      expect(isEraReport('dashboard')).toBe(false)
    })
  })

  describe('getMetricLabel', () => {
    it('returns Length of Era for era reports', () => {
      expect(getMetricLabel('conditionEra')).toBe('Length of Era')
      expect(getMetricLabel('drugEra')).toBe('Length of Era')
    })

    it('returns Records Per Person for non-era reports', () => {
      expect(getMetricLabel('conditionOccurrence')).toBe('Records Per Person')
      expect(getMetricLabel('drugExposure')).toBe('Records Per Person')
    })
  })

  describe('exportTableToCSV', () => {
    it('exports table rows to CSV format', () => {
      const rows = [
        { conceptId: 1, conceptName: 'Test A', personCount: 100, prevalence: 10.5, metric: 2.5 },
        { conceptId: 2, conceptName: 'Test B', personCount: 50, prevalence: 5.25, metric: 1.2 },
      ]

      const result = exportTableToCSV(rows, 'Records Per Person')

      expect(result).toContain('Concept ID,Name,Person Count,Prevalence (%),Records Per Person')
      expect(result).toContain('1,"Test A",100,10.50,2.50')
      expect(result).toContain('2,"Test B",50,5.25,1.20')
    })

    it('escapes quotes in concept names', () => {
      const rows = [
        { conceptId: 1, conceptName: 'Test "Quoted" Name', personCount: 100, prevalence: 10, metric: 1 },
      ]

      const result = exportTableToCSV(rows, 'Metric')

      expect(result).toContain('""Quoted""')
    })
  })

  describe('formatNumber', () => {
    it('formats number with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('handles negative numbers', () => {
      expect(formatNumber(-1234)).toBe('-1,234')
    })
  })

  describe('formatPercentage', () => {
    it('formats percentage with default decimals', () => {
      expect(formatPercentage(10.5)).toBe('10.50%')
    })

    it('formats percentage with custom decimals', () => {
      expect(formatPercentage(10.567, 1)).toBe('10.6%')
    })

    it('handles zero', () => {
      expect(formatPercentage(0)).toBe('0.00%')
    })
  })

  describe('transformDataDensityReport', () => {
    it('transforms data density report', () => {
      const raw = {
        totalRecords: [
          { xCalendarMonth: 202401, seriesName: 'Condition', yRecordCount: 100 },
          { xCalendarMonth: 202402, seriesName: 'Condition', yRecordCount: 150 },
        ],
        recordsPerPerson: [
          { xCalendarMonth: 202401, seriesName: 'Records', yRecordCount: 2 },
        ],
        conceptsPerPerson: [
          { category: 'Condition', medianValue: 5 },
        ],
      }

      const result = transformDataDensityReport(raw)

      expect(result.totalRecords.categories).toHaveLength(2)
      expect(result.totalRecords.series[0].name).toBe('Condition')
      expect(result.recordsPerPerson.series).toHaveLength(1)
      expect(result.conceptsPerPerson.categories).toHaveLength(1)
    })

    it('handles empty data', () => {
      const raw = {}

      const result = transformDataDensityReport(raw)

      expect(result.totalRecords.categories).toHaveLength(0)
      expect(result.recordsPerPerson.categories).toHaveLength(0)
    })
  })

  describe('transformPersonReport', () => {
    it('transforms person report', () => {
      const raw = {
        yearOfBirth: [
          { year: 1990, count: 100 },
          { year: 1991, count: 150 },
        ],
        gender: [
          { conceptName: 'MALE', countValue: 500 },
        ],
        race: [
          { conceptName: 'White', countValue: 400 },
        ],
        ethnicity: [
          { conceptName: 'Not Hispanic', countValue: 450 },
        ],
      }

      const result = transformPersonReport(raw)

      expect(result.yearOfBirth.categories).toHaveLength(2)
      expect(result.gender).toHaveLength(1)
      expect(result.race).toHaveLength(1)
      expect(result.ethnicity).toHaveLength(1)
    })

    it('handles alternate field names', () => {
      const raw = {
        yearOfBirth: [
          { yearOfBirth: 1990, countValue: 100 },
        ],
        gender: [
          { name: 'FEMALE', count: 300 },
        ],
        race: [],
        ethnicity: [],
      }

      const result = transformPersonReport(raw)

      expect(result.yearOfBirth.categories[0]).toBe('1990')
      expect(result.gender[0].name).toBe('FEMALE')
    })
  })

  describe('transformObservationPeriodReport', () => {
    it('transforms observation period report', () => {
      const raw = {
        ageAtFirst: [
          { intervalIndex: 0, countValue: 100 },
        ],
        observationLength: [
          { intervalIndex: 0, countValue: 50 },
        ],
        cumulativeObservation: [
          { xLengthOfObservation: 30, yPercentPersons: 50 },
        ],
        observedByMonth: [
          { monthYear: 202401, countValue: 100 },
        ],
      }

      const result = transformObservationPeriodReport(raw)

      expect(result.ageAtFirst?.categories).toHaveLength(1)
      expect(result.observationLength?.categories).toHaveLength(1)
      expect(result.cumulativeObservation?.series[0].data).toHaveLength(1)
      expect(result.observedByMonth?.series[0].data).toHaveLength(1)
    })

    it('handles undefined sections', () => {
      const raw = {}

      const result = transformObservationPeriodReport(raw)

      expect(result.ageAtFirst).toBeUndefined()
      expect(result.observationLength).toBeUndefined()
    })
  })

  describe('transformDeathReport', () => {
    it('transforms death report', () => {
      const raw = {
        ageAtDeath: [{ category: '60-70', count: 100 }],
        deathByType: [
          { conceptName: 'Natural', countValue: 80 },
        ],
        prevalenceByMonth: [
          { xCalendarMonth: 202401, yPrevalence1000Pp: 5 },
        ],
      }

      const result = transformDeathReport(raw as never)

      expect(result.ageAtDeath).toHaveLength(1)
      expect(result.deathByType).toHaveLength(1)
      expect(result.prevalenceByMonth?.series[0].data).toHaveLength(1)
    })

    it('handles empty data', () => {
      const raw = {}

      const result = transformDeathReport(raw as never)

      expect(result.ageAtDeath).toHaveLength(0)
      expect(result.deathByType).toHaveLength(0)
    })
  })
})
