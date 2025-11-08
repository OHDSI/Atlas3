/**
 * Unit Test: report-mapper.ts
 * Tests report data mapping functions (T126)
 */
import { describe, it, expect } from 'vitest'
import {
  mapPersonReport,
  mapConditionErasReport,
  mapConditionReport,
  mapDrugErasReport,
  mapCohortSpecificReport,
  toBarChartData,
  toPieChartData,
  toLineChartData,
  toTreemapData,
  toHierarchicalTreemapData,
  formatPercentage,
  formatNumber,
  formatDuration
} from '@/services/report-mapper'
import type {
  WebAPIPersonRaw,
  WebAPIConditionEraRaw,
  WebAPIConditionRaw,
  WebAPIDrugEraRaw,
  WebAPICohortSpecificRaw
} from '@/models/report.types'

describe('report-mapper', () => {
  describe('mapPersonReport', () => {
    it('should map person report data correctly', () => {
      const mockData: WebAPIPersonRaw = {
        yearOfBirth: [
          { intervalIndex: 0, countValue: 100 },
          { intervalIndex: 1, countValue: 150 }
        ],
        gender: [
          { conceptId: 8507, conceptName: 'Male', countValue: 60 },
          { conceptId: 8532, conceptName: 'Female', countValue: 40 }
        ],
        race: [
          { conceptId: 8527, conceptName: 'White', countValue: 80 },
          { conceptId: 8516, conceptName: 'Black', countValue: 20 }
        ],
        ethnicity: [
          { conceptId: 38003564, conceptName: 'Not Hispanic', countValue: 90 },
          { conceptId: 38003563, conceptName: 'Hispanic', countValue: 10 }
        ]
      }

      const result = mapPersonReport(mockData)

      // Check year of birth mapping
      expect(result.yearOfBirth).toHaveLength(2)
      expect(result.yearOfBirth[0]).toEqual({ year: 1920, count: 100 })
      expect(result.yearOfBirth[1]).toEqual({ year: 1921, count: 150 })

      // Check demographics - gender
      expect(result.demographics.gender).toHaveLength(2)
      expect(result.demographics.gender[0].conceptName).toBe('Male')
      expect(result.demographics.gender[0].percentage).toBe(60)
      expect(result.demographics.gender[1].percentage).toBe(40)

      // Check demographics - race
      expect(result.demographics.race).toHaveLength(2)
      expect(result.demographics.race[0].percentage).toBe(80)

      // Check demographics - ethnicity
      expect(result.demographics.ethnicity).toHaveLength(2)
      expect(result.demographics.ethnicity[0].percentage).toBe(90)
    })

    it('should handle empty data', () => {
      const mockData: WebAPIPersonRaw = {
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      }

      const result = mapPersonReport(mockData)

      expect(result.yearOfBirth).toHaveLength(0)
      expect(result.demographics.gender).toHaveLength(0)
      expect(result.demographics.race).toHaveLength(0)
      expect(result.demographics.ethnicity).toHaveLength(0)
    })
  })

  describe('mapConditionErasReport', () => {
    it('should map condition eras data correctly', () => {
      const mockData: WebAPIConditionEraRaw = [
        {
          conceptId: 201826,
          conceptPath: 'Nervous system disorders||Headaches||Migraine||NA||Migraine',
          numPersons: 500,
          percentPersons: 0.25,
          lengthOfEra: 30
        },
        {
          conceptId: 320128,
          conceptPath: 'Gastrointestinal disorders||Upper gastrointestinal disorders||NA||NA||Gastritis',
          numPersons: 300,
          percentPersons: 0.15,
          lengthOfEra: 45
        }
      ]

      const result = mapConditionErasReport(mockData)

      expect(result.prevalence).toHaveLength(2)
      expect(result.prevalence[0].conceptId).toBe(201826)
      expect(result.prevalence[0].conceptName).toBe('Migraine')
      expect(result.prevalence[0].soc).toBe('Nervous system disorders')
      expect(result.prevalence[0].hlt).toBe('Headaches')
      expect(result.prevalence[0].personCount).toBe(500)
      expect(result.prevalence[0].prevalence).toBe(25) // 0.25 * 100
      expect(result.prevalence[0].averageDuration).toBe(30)

      // Check treemap data is generated
      expect(result.treemapData).toBeDefined()
      expect(result.treemapData).toHaveLength(2)
    })

    it('should handle NA values in concept path', () => {
      const mockData: WebAPIConditionEraRaw = [
        {
          conceptId: 123,
          conceptPath: 'NA||NA||NA||NA||Test Condition',
          numPersons: 100,
          percentPersons: 0.1,
          lengthOfEra: 10
        }
      ]

      const result = mapConditionErasReport(mockData)

      expect(result.prevalence[0].soc).toBeUndefined()
      expect(result.prevalence[0].hlt).toBeUndefined()
      expect(result.prevalence[0].conceptName).toBe('Test Condition')
    })
  })

  describe('mapConditionReport', () => {
    it('should map condition occurrence data correctly', () => {
      const mockData: WebAPIConditionRaw = [
        {
          conceptId: 12345,
          conceptPath: 'SOC||HLT||PT||LLT||Condition Name',
          recordsPerPerson: 2.5,
          numPersons: 200,
          percentPersons: 0.2
        }
      ]

      const result = mapConditionReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(12345)
      expect(result.prevalence[0].conceptName).toBe('Condition Name')
      expect(result.prevalence[0].recordsPerPerson).toBe(2.5)
      expect(result.prevalence[0].personCount).toBe(200)
      expect(result.prevalence[0].prevalence).toBe(20) // 0.2 * 100
    })
  })

  describe('mapDrugErasReport', () => {
    it('should map drug eras data correctly', () => {
      const mockData: WebAPIDrugEraRaw = [
        {
          conceptId: 1503327,
          conceptPath: 'N||N02||Acetaminophen',
          numPersons: 800,
          percentPersons: 0.4,
          lengthOfEra: 14
        }
      ]

      const result = mapDrugErasReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1503327)
      expect(result.prevalence[0].conceptName).toBe('Acetaminophen')
      expect(result.prevalence[0].atc1).toBe('N')
      expect(result.prevalence[0].atc4).toBe('N02')
      expect(result.prevalence[0].personCount).toBe(800)
      expect(result.prevalence[0].prevalence).toBe(40) // 0.4 * 100
      expect(result.prevalence[0].averageDuration).toBe(14)
      expect(result.treemapData).toBeDefined()
    })
  })

  describe('mapCohortSpecificReport', () => {
    it('should map cohort specific data correctly', () => {
      const mockData: WebAPICohortSpecificRaw = {
        prevalenceByMonth: [
          { xCalendarMonth: '2020-01', yPrevalence1000Pp: 10.5 },
          { xCalendarMonth: '2020-02', yPrevalence1000Pp: 12.3 }
        ],
        personsInCohortFromCohortStartToEnd: [
          { xCalendarMonth: '2020-01', yRecordCount: 100 },
          { xCalendarMonth: '2020-12', yRecordCount: 150 }
        ],
        ageAtIndexDistribution: [
          { intervalIndex: 0, countValue: 50 },
          { intervalIndex: 1, countValue: 75 }
        ],
        personsByDurationFromStartToEnd: [
          { intervalIndex: 0, percentValue: 0.3 },
          { intervalIndex: 1, percentValue: 0.25 }
        ]
      }

      const result = mapCohortSpecificReport(mockData)

      expect(result.prevalenceByMonth).toHaveLength(2)
      expect(result.prevalenceByMonth[0].date).toBe('2020-01')
      expect(result.prevalenceByMonth[0].prevalence).toBe(10.5)

      expect(result.cohortStart.startDate).toBe('2020-01')
      expect(result.cohortStart.endDate).toBe('2020-12')
      expect(result.cohortStart.totalPersons).toBe(125) // 50 + 75

      expect(result.ageDistribution).toHaveLength(2)
      expect(result.ageDistribution[0].age).toBe(18) // intervalIndex 0 = age 18
      expect(result.ageDistribution[0].count).toBe(50)

      expect(result.durationDistribution).toHaveLength(2)
      expect(result.durationDistribution[0].days).toBe(0) // intervalIndex 0 * 30
      expect(result.durationDistribution[0].percentOfPopulation).toBe(30) // 0.3 * 100
    })
  })

  describe('Chart conversion utilities', () => {
    describe('toBarChartData', () => {
      it('should convert array to bar chart format', () => {
        const data = [
          { year: 2020, count: 100 },
          { year: 2021, count: 150 }
        ]

        const result = toBarChartData(data, 'year', 'count', 'People')

        expect(result.categories).toEqual(['2020', '2021'])
        expect(result.values).toEqual([100, 150])
        expect(result.unit).toBe('People')
      })
    })

    describe('toPieChartData', () => {
      it('should convert array to pie chart format', () => {
        const data = [
          { gender: 'Male', count: 60 },
          { gender: 'Female', count: 40 }
        ]

        const result = toPieChartData(data, 'gender', 'count')

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ name: 'Male', value: 60 })
        expect(result[1]).toEqual({ name: 'Female', value: 40 })
      })
    })

    describe('toLineChartData', () => {
      it('should convert array to line chart format', () => {
        const data = [
          { date: '2020-01', value: 10 },
          { date: '2020-02', value: 20 }
        ]

        const result = toLineChartData(data, 'date', 'value', 'Trend')

        expect(result.xAxis).toEqual(['2020-01', '2020-02'])
        expect(result.yAxis).toEqual([10, 20])
        expect(result.seriesName).toBe('Trend')
      })
    })

    describe('toTreemapData', () => {
      it('should convert array to treemap format', () => {
        const data = [
          { name: 'Category A', value: 100 },
          { name: 'Category B', value: 200 }
        ]

        const result = toTreemapData(data, 'name', 'value')

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ name: 'Category A', value: 100 })
        expect(result[1]).toEqual({ name: 'Category B', value: 200 })
      })
    })

    describe('toHierarchicalTreemapData', () => {
      it('should group data by category for hierarchical treemap', () => {
        const data = [
          { category: 'Group A', name: 'Item 1', value: 100 },
          { category: 'Group A', name: 'Item 2', value: 150 },
          { category: 'Group B', name: 'Item 3', value: 200 }
        ]

        const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')

        expect(result).toHaveLength(2)
        expect(result[0].name).toBe('Group A')
        expect(result[0].value).toBe(250) // 100 + 150
        expect(result[0].children).toHaveLength(2)
        expect(result[1].name).toBe('Group B')
        expect(result[1].value).toBe(200)
        expect(result[1].children).toHaveLength(1)
      })
    })
  })

  describe('Formatting utilities', () => {
    describe('formatPercentage', () => {
      it('should format percentage with default 1 decimal', () => {
        expect(formatPercentage(12.345)).toBe('12.3%')
        expect(formatPercentage(100)).toBe('100.0%')
      })

      it('should format percentage with custom decimals', () => {
        expect(formatPercentage(12.345, 2)).toBe('12.35%')
        expect(formatPercentage(12.345, 0)).toBe('12%')
      })
    })

    describe('formatNumber', () => {
      it('should format numbers with comma separators', () => {
        expect(formatNumber(1000)).toBe('1,000')
        expect(formatNumber(1000000)).toBe('1,000,000')
        expect(formatNumber(123)).toBe('123')
      })
    })

    describe('formatDuration', () => {
      it('should format days when less than 30', () => {
        expect(formatDuration(1)).toBe('1 days')
        expect(formatDuration(29)).toBe('29 days')
      })

      it('should format months when 30-364 days', () => {
        expect(formatDuration(30)).toBe('1 month')
        expect(formatDuration(60)).toBe('2 months')
        expect(formatDuration(90)).toBe('3 months')
      })

      it('should format years when 365+ days', () => {
        expect(formatDuration(365)).toBe('1 year')
        expect(formatDuration(730)).toBe('2 years')
        expect(formatDuration(400)).toBe('1.1 years')
      })
    })
  })
})
