/**
 * Unit Test: report-mapper.ts
 * Tests report data mapping functions
 */
import { describe, it, expect } from 'vitest'
import {
  mapPersonReport,
  mapConditionErasReport,
  mapConditionReport,
  mapDrugErasReport,
  mapCohortSpecificReport,
  mapPersonsExposureReport,
  mapVisitsReport,
  mapVisitDatesReport,
  mapCareSiteVisitDatesReport,
  mapDrugUtilizationReport,
  mapHeraclesHeelReport,
  mapConditionsByIndexReport,
  mapDeathReport,
  mapDrugExposureReport,
  mapDrugsByIndexReport,
  mapObservationPeriodsReport,
  mapProcedureReport,
  mapProceduresByIndexReport,
  mapDataCompletenessReport,
  mapEntropyReport,
  mapTornadoReport,
  mapDrilldownReport,
  mapBoxPlotData,
  mapTrellisData,
  mapTimeSeriesData,
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
  WebAPICohortSpecificRaw,
  WebAPIDrilldownRaw
} from '@/models/report.types'

describe('report-mapper', () => {
  describe('mapPersonReport', () => {
    it('should map person report data correctly', () => {
      const mockData: WebAPIPersonRaw = {
        yearOfBirth: [
          { intervalIndex: 0, percentValue: 0.4, countValue: 100 },
          { intervalIndex: 1, percentValue: 0.6, countValue: 150 }
        ],
        gender: [
          { conceptId: 8507, conceptName: 'Male', countValue: 60, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
          { conceptId: 8532, conceptName: 'Female', countValue: 40, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 }
        ],
        race: [
          { conceptId: 8527, conceptName: 'White', countValue: 80, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
          { conceptId: 8516, conceptName: 'Black', countValue: 20, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 }
        ],
        ethnicity: [
          { conceptId: 38003564, conceptName: 'Not Hispanic', countValue: 90, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
          { conceptId: 38003563, conceptName: 'Hispanic', countValue: 10, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 }
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

    it('should handle zero totals for percentage calculation', () => {
      const mockData: WebAPIPersonRaw = {
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      }

      const result = mapPersonReport(mockData)

      // Should not throw error and return empty arrays
      expect(result.demographics.gender).toHaveLength(0)
      expect(result.demographics.race).toHaveLength(0)
      expect(result.demographics.ethnicity).toHaveLength(0)
    })

    it('should correctly map conceptId and conceptName', () => {
      const mockData: WebAPIPersonRaw = {
        yearOfBirth: [],
        gender: [
          { conceptId: 8507, conceptName: 'Male', countValue: 100, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 }
        ],
        race: [],
        ethnicity: []
      }

      const result = mapPersonReport(mockData)

      expect(result.demographics.gender[0].conceptId).toBe(8507)
      expect(result.demographics.gender[0].conceptName).toBe('Male')
      expect(result.demographics.gender[0].count).toBe(100)
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
          lengthOfEra: 30,
          recordsPerPerson: 1.5,
          percentPersonsBefore: 0.2,
          percentPersonsAfter: 0.3,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.05,
          countValue: 750
        },
        {
          conceptId: 320128,
          conceptPath: 'Gastrointestinal disorders||Upper gastrointestinal disorders||NA||NA||Gastritis',
          numPersons: 300,
          percentPersons: 0.15,
          lengthOfEra: 45,
          recordsPerPerson: 2.0,
          percentPersonsBefore: 0.1,
          percentPersonsAfter: 0.2,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.03,
          countValue: 600
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
          lengthOfEra: 10,
          recordsPerPerson: 1.0,
          percentPersonsBefore: 0.05,
          percentPersonsAfter: 0.15,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.02,
          countValue: 100
        }
      ]

      const result = mapConditionErasReport(mockData)

      expect(result.prevalence[0].soc).toBeUndefined()
      expect(result.prevalence[0].hlt).toBeUndefined()
      expect(result.prevalence[0].conceptName).toBe('Test Condition')
    })

    it('should handle empty concept path', () => {
      const mockData: WebAPIConditionEraRaw = [
        {
          conceptId: 456,
          conceptPath: '',
          numPersons: 50,
          percentPersons: 0.05,
          lengthOfEra: 5,
          recordsPerPerson: 1.0,
          percentPersonsBefore: 0.02,
          percentPersonsAfter: 0.08,
          riskDiffAfterBefore: 0.06,
          logRRAfterBefore: 0.01,
          countValue: 50
        }
      ]

      const result = mapConditionErasReport(mockData)

      expect(result.prevalence[0].conceptName).toBe('Concept 456')
    })

    it('should not create treemap data when array is empty', () => {
      const mockData: WebAPIConditionEraRaw = []

      const result = mapConditionErasReport(mockData)

      expect(result.prevalence).toHaveLength(0)
      expect(result.treemapData).toBeUndefined()
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
          percentPersons: 0.2,
          lengthOfEra: 20,
          percentPersonsBefore: 0.1,
          percentPersonsAfter: 0.3,
          riskDiffAfterBefore: 0.2,
          logRRAfterBefore: 0.04,
          countValue: 500
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

    it('should handle empty path for condition name', () => {
      const mockData: WebAPIConditionRaw = [
        {
          conceptId: 789,
          conceptPath: '',
          recordsPerPerson: 1.0,
          numPersons: 100,
          percentPersons: 0.1,
          lengthOfEra: 10,
          percentPersonsBefore: 0.05,
          percentPersonsAfter: 0.15,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.02,
          countValue: 100
        }
      ]

      const result = mapConditionReport(mockData)

      expect(result.prevalence[0].conceptName).toBe('Concept 789')
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
          lengthOfEra: 14,
          recordsPerPerson: 3.0,
          percentPersonsBefore: 0.3,
          percentPersonsAfter: 0.5,
          riskDiffAfterBefore: 0.2,
          logRRAfterBefore: 0.06,
          countValue: 2400
        }
      ]

      const result = mapDrugErasReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1503327)
      expect(result.prevalence[0].conceptName).toBe('Acetaminophen')
      expect(result.prevalence[0].atc1).toBe('N')
      expect(result.prevalence[0].atc4).toBe('N02')
      expect(result.prevalence[0].ingredient).toBe('Acetaminophen')
      expect(result.prevalence[0].personCount).toBe(800)
      expect(result.prevalence[0].prevalence).toBe(40) // 0.4 * 100
      expect(result.prevalence[0].averageDuration).toBe(14)
      expect(result.treemapData).toBeDefined()
    })

    it('should handle NA values in drug path', () => {
      const mockData: WebAPIDrugEraRaw = [
        {
          conceptId: 999,
          conceptPath: 'NA||NA||Unknown Drug',
          numPersons: 50,
          percentPersons: 0.05,
          lengthOfEra: 7,
          recordsPerPerson: 1.0,
          percentPersonsBefore: 0.02,
          percentPersonsAfter: 0.08,
          riskDiffAfterBefore: 0.06,
          logRRAfterBefore: 0.01,
          countValue: 50
        }
      ]

      const result = mapDrugErasReport(mockData)

      expect(result.prevalence[0].atc1).toBeUndefined()
      expect(result.prevalence[0].atc4).toBeUndefined()
      expect(result.prevalence[0].ingredient).toBe('Unknown Drug')
    })

    it('should handle empty drug path', () => {
      const mockData: WebAPIDrugEraRaw = [
        {
          conceptId: 888,
          conceptPath: '',
          numPersons: 25,
          percentPersons: 0.025,
          lengthOfEra: 3,
          recordsPerPerson: 1.0,
          percentPersonsBefore: 0.01,
          percentPersonsAfter: 0.04,
          riskDiffAfterBefore: 0.03,
          logRRAfterBefore: 0.005,
          countValue: 25
        }
      ]

      const result = mapDrugErasReport(mockData)

      expect(result.prevalence[0].conceptName).toBe('Drug 888')
      expect(result.prevalence[0].ingredient).toBe('Drug 888')
    })

    it('should not create treemap data when array is empty', () => {
      const mockData: WebAPIDrugEraRaw = []

      const result = mapDrugErasReport(mockData)

      expect(result.prevalence).toHaveLength(0)
      expect(result.treemapData).toBeUndefined()
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
          { intervalIndex: 0, percentValue: 0.4, countValue: 50 },
          { intervalIndex: 1, percentValue: 0.6, countValue: 75 }
        ],
        personsByDurationFromStartToEnd: [
          { intervalIndex: 0, percentValue: 0.3, countValue: 30 },
          { intervalIndex: 1, percentValue: 0.25, countValue: 25 }
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

    it('should handle missing personsInCohortFromCohortStartToEnd', () => {
      const mockData: WebAPICohortSpecificRaw = {
        prevalenceByMonth: [
          { xCalendarMonth: '2020-01', yPrevalence1000Pp: 10.5 }
        ],
        ageAtIndexDistribution: [
          { intervalIndex: 0, percentValue: 1.0, countValue: 100 }
        ],
        personsByDurationFromStartToEnd: [
          { intervalIndex: 0, percentValue: 1.0, countValue: 100 }
        ]
      }

      const result = mapCohortSpecificReport(mockData)

      expect(result.cohortStart.startDate).toBe('')
      expect(result.cohortStart.endDate).toBe('')
      expect(result.personsInCohort).toHaveLength(0)
    })

    it('should handle empty personsInCohortFromCohortStartToEnd array', () => {
      const mockData: WebAPICohortSpecificRaw = {
        prevalenceByMonth: [],
        personsInCohortFromCohortStartToEnd: [],
        ageAtIndexDistribution: [
          { intervalIndex: 0, percentValue: 1.0, countValue: 50 }
        ],
        personsByDurationFromStartToEnd: []
      }

      const result = mapCohortSpecificReport(mockData)

      // Empty arrays result in empty strings for dates (from first/last element access)
      expect(result.cohortStart.startDate).toBe('')
      expect(result.cohortStart.endDate).toBe('')
      expect(result.personsInCohort).toHaveLength(0)
    })

    it('should calculate age correctly based on intervalIndex', () => {
      const mockData: WebAPICohortSpecificRaw = {
        prevalenceByMonth: [],
        ageAtIndexDistribution: [
          { intervalIndex: 0, percentValue: 0.2, countValue: 20 },
          { intervalIndex: 10, percentValue: 0.3, countValue: 30 },
          { intervalIndex: 50, percentValue: 0.5, countValue: 50 }
        ],
        personsByDurationFromStartToEnd: []
      }

      const result = mapCohortSpecificReport(mockData)

      expect(result.ageDistribution[0].age).toBe(18)  // 0 + 18
      expect(result.ageDistribution[1].age).toBe(28)  // 10 + 18
      expect(result.ageDistribution[2].age).toBe(68)  // 50 + 18
    })

    it('should calculate days correctly based on intervalIndex', () => {
      const mockData: WebAPICohortSpecificRaw = {
        prevalenceByMonth: [],
        ageAtIndexDistribution: [],
        personsByDurationFromStartToEnd: [
          { intervalIndex: 0, percentValue: 0.3, countValue: 30 },
          { intervalIndex: 1, percentValue: 0.25, countValue: 25 },
          { intervalIndex: 12, percentValue: 0.45, countValue: 45 }
        ]
      }

      const result = mapCohortSpecificReport(mockData)

      expect(result.durationDistribution[0].days).toBe(0)    // 0 * 30
      expect(result.durationDistribution[1].days).toBe(30)   // 1 * 30
      expect(result.durationDistribution[2].days).toBe(360)  // 12 * 30
    })
  })

  describe('mapPersonsExposureReport', () => {
    it('should map persons exposure data correctly', () => {
      const mockData = [
        {
          conceptId: 123,
          conceptPath: 'Category||Subcategory||Exposure Name',
          recordsPerPerson: 2.5,
          numPersons: 500,
          percentPersons: 0.25,
          lengthOfEra: 30,
          percentPersonsBefore: 0.2,
          percentPersonsAfter: 0.3,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.05,
          countValue: 1250
        }
      ]

      const result = mapPersonsExposureReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(123)
      expect(result.prevalence[0].conceptName).toBe('Exposure Name')
      expect(result.prevalence[0].recordsPerPerson).toBe(2.5)
      expect(result.prevalence[0].personCount).toBe(500)
      expect(result.prevalence[0].prevalence).toBe(25)
    })

    it('should handle empty concept path', () => {
      const mockData = [
        {
          conceptId: 456,
          conceptPath: '',
          recordsPerPerson: 1.0,
          numPersons: 100,
          percentPersons: 0.1,
          lengthOfEra: 10,
          percentPersonsBefore: 0.05,
          percentPersonsAfter: 0.15,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.02,
          countValue: 100
        }
      ]

      const result = mapPersonsExposureReport(mockData)

      expect(result.prevalence[0].conceptName).toBe('Concept 456')
    })
  })

  describe('mapVisitsReport', () => {
    it('should map visits data correctly', () => {
      const mockData = [
        {
          conceptId: 789,
          conceptPath: 'Visit Type||Outpatient Visit',
          recordsPerPerson: 3.2,
          numPersons: 600,
          percentPersons: 0.3,
          lengthOfEra: 1,
          percentPersonsBefore: 0.25,
          percentPersonsAfter: 0.35,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.04,
          countValue: 1920
        }
      ]

      const result = mapVisitsReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(789)
      expect(result.prevalence[0].conceptName).toBe('Outpatient Visit')
      expect(result.prevalence[0].recordsPerPerson).toBe(3.2)
      expect(result.prevalence[0].personCount).toBe(600)
      expect(result.prevalence[0].prevalence).toBe(30)
    })
  })

  describe('mapVisitDatesReport', () => {
    it('should map visit dates data correctly', () => {
      const mockData = [
        { xCalendarDate: '2020-01-15', yRecordCount: 150 },
        { xCalendarDate: '2020-02-20', yRecordCount: 200 }
      ]

      const result = mapVisitDatesReport(mockData)

      expect(result.data).toHaveLength(2)
      expect(result.data[0].date).toBe('2020-01-15')
      expect(result.data[0].visitCount).toBe(150)
      expect(result.data[0].personCount).toBe(150)
    })

    it('should handle empty data', () => {
      const mockData: typeof import('@/models/report.types').WebAPIVisitDatesRaw = []

      const result = mapVisitDatesReport(mockData)

      expect(result.data).toHaveLength(0)
    })
  })

  describe('mapCareSiteVisitDatesReport', () => {
    it('should map care site visit dates data correctly', () => {
      const mockData = [
        {
          conceptId: 101,
          conceptPath: 'Care Site Type||Hospital A',
          recordsPerPerson: 2.0,
          percentPersons: 0.2,
          numPersons: 300,
          countValue: 600
        }
      ]

      const result = mapCareSiteVisitDatesReport(mockData)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].careSiteId).toBe(101)
      expect(result.data[0].careSiteName).toBe('Hospital A')
      expect(result.data[0].visitCount).toBe(600)
      expect(result.data[0].personCount).toBe(300)
    })

    it('should handle empty concept path', () => {
      const mockData = [
        {
          conceptId: 202,
          conceptPath: '',
          recordsPerPerson: 1.5,
          percentPersons: 0.15,
          numPersons: 200,
          countValue: 300
        }
      ]

      const result = mapCareSiteVisitDatesReport(mockData)

      expect(result.data[0].careSiteName).toBe('Care Site 202')
    })
  })

  describe('mapDrugUtilizationReport', () => {
    it('should map drug utilization data correctly', () => {
      const mockData = [
        {
          conceptId: 303,
          conceptPath: 'ATC||ATC3||Drug Name',
          recordsPerPerson: 4.5,
          numPersons: 700,
          percentPersons: 0.35,
          lengthOfEra: 20,
          percentPersonsBefore: 0.3,
          percentPersonsAfter: 0.4,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.05,
          countValue: 3150
        }
      ]

      const result = mapDrugUtilizationReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(303)
      expect(result.prevalence[0].conceptName).toBe('Drug Name')
      expect(result.prevalence[0].recordsPerPerson).toBe(4.5)
      expect(result.prevalence[0].personCount).toBe(700)
      expect(result.prevalence[0].prevalence).toBe(35)
    })
  })

  describe('mapHeraclesHeelReport', () => {
    it('should map heracles heel data correctly', () => {
      const mockData = [
        {
          analysisId: 1,
          analysisName: 'Analysis 1',
          heelRule: 'Rule 1',
          recordCount: 100,
          severityLevel: 'ERROR'
        },
        {
          analysisId: 2,
          analysisName: 'Analysis 2',
          heelRule: 'Rule 2',
          recordCount: 50,
          severityLevel: 'WARNING'
        },
        {
          analysisId: 3,
          analysisName: 'Analysis 3',
          heelRule: 'Rule 3',
          recordCount: 10,
          severityLevel: 'NOTIFICATION'
        }
      ]

      const result = mapHeraclesHeelReport(mockData)

      expect(result.results).toHaveLength(3)
      expect(result.results[0].severity).toBe('ERROR')
      expect(result.results[1].severity).toBe('WARNING')
      expect(result.results[2].severity).toBe('NOTIFICATION')
    })

    it('should default to NOTIFICATION for unknown severity levels', () => {
      const mockData = [
        {
          analysisId: 4,
          analysisName: 'Analysis 4',
          heelRule: 'Rule 4',
          recordCount: 5,
          severityLevel: 'UNKNOWN'
        }
      ]

      const result = mapHeraclesHeelReport(mockData)

      expect(result.results[0].severity).toBe('NOTIFICATION')
    })

    it('should handle INFO severity as NOTIFICATION', () => {
      const mockData = [
        {
          analysisId: 5,
          analysisName: 'Analysis 5',
          heelRule: 'Rule 5',
          recordCount: 3,
          severityLevel: 'INFO'
        }
      ]

      const result = mapHeraclesHeelReport(mockData)

      expect(result.results[0].severity).toBe('NOTIFICATION')
    })
  })

  describe('mapConditionsByIndexReport', () => {
    it('should map conditions by index data correctly', () => {
      const mockData = [
        {
          conceptId: 404,
          conceptPath: 'SOC||HLT||Condition By Index',
          recordsPerPerson: 1.8,
          numPersons: 250,
          percentPersons: 0.125,
          lengthOfEra: 15,
          percentPersonsBefore: 0.1,
          percentPersonsAfter: 0.15,
          riskDiffAfterBefore: 0.05,
          logRRAfterBefore: 0.02,
          countValue: 450
        }
      ]

      const result = mapConditionsByIndexReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(404)
      expect(result.prevalence[0].conceptName).toBe('Condition By Index')
      expect(result.prevalence[0].recordsPerPerson).toBe(1.8)
      expect(result.prevalence[0].personCount).toBe(250)
      expect(result.prevalence[0].prevalence).toBe(12.5)
    })
  })

  describe('mapDeathReport', () => {
    it('should map death data correctly', () => {
      const mockData = [
        {
          conceptId: 505,
          conceptPath: 'Death Type||Natural Death',
          recordsPerPerson: 1.0,
          numPersons: 50,
          percentPersons: 0.025,
          lengthOfEra: 0,
          percentPersonsBefore: 0.02,
          percentPersonsAfter: 0.03,
          riskDiffAfterBefore: 0.01,
          logRRAfterBefore: 0.005,
          countValue: 50
        }
      ]

      const result = mapDeathReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(505)
      expect(result.prevalence[0].conceptName).toBe('Natural Death')
      expect(result.prevalence[0].prevalence).toBe(2.5)
    })
  })

  describe('mapDrugExposureReport', () => {
    it('should map drug exposure data correctly', () => {
      const mockData = [
        {
          conceptId: 606,
          conceptPath: 'ATC||Drug Exposure',
          recordsPerPerson: 2.0,
          numPersons: 400,
          percentPersons: 0.2,
          lengthOfEra: 10,
          percentPersonsBefore: 0.15,
          percentPersonsAfter: 0.25,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.03,
          countValue: 800
        }
      ]

      const result = mapDrugExposureReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(606)
      expect(result.prevalence[0].conceptName).toBe('Drug Exposure')
      expect(result.prevalence[0].prevalence).toBe(20)
    })
  })

  describe('mapDrugsByIndexReport', () => {
    it('should map drugs by index data correctly', () => {
      const mockData = [
        {
          conceptId: 707,
          conceptPath: 'ATC||Drug By Index',
          recordsPerPerson: 1.5,
          numPersons: 350,
          percentPersons: 0.175,
          lengthOfEra: 12,
          percentPersonsBefore: 0.15,
          percentPersonsAfter: 0.2,
          riskDiffAfterBefore: 0.05,
          logRRAfterBefore: 0.025,
          countValue: 525
        }
      ]

      const result = mapDrugsByIndexReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(707)
      expect(result.prevalence[0].conceptName).toBe('Drug By Index')
      expect(result.prevalence[0].prevalence).toBe(17.5)
    })
  })

  describe('mapObservationPeriodsReport', () => {
    it('should map observation periods data correctly', () => {
      const mockData = [
        {
          conceptId: 808,
          conceptPath: 'Period Type||Continuous Period',
          recordsPerPerson: 1.2,
          numPersons: 1000,
          percentPersons: 0.5,
          lengthOfEra: 365,
          percentPersonsBefore: 0.45,
          percentPersonsAfter: 0.55,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.05,
          countValue: 1200
        }
      ]

      const result = mapObservationPeriodsReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(808)
      expect(result.prevalence[0].conceptName).toBe('Continuous Period')
      expect(result.prevalence[0].prevalence).toBe(50)
    })
  })

  describe('mapProcedureReport', () => {
    it('should map procedure data correctly', () => {
      const mockData = [
        {
          conceptId: 909,
          conceptPath: 'Procedure Type||Surgical Procedure',
          recordsPerPerson: 1.3,
          numPersons: 450,
          percentPersons: 0.225,
          lengthOfEra: 2,
          percentPersonsBefore: 0.2,
          percentPersonsAfter: 0.25,
          riskDiffAfterBefore: 0.05,
          logRRAfterBefore: 0.02,
          countValue: 585
        }
      ]

      const result = mapProcedureReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(909)
      expect(result.prevalence[0].conceptName).toBe('Surgical Procedure')
      expect(result.prevalence[0].prevalence).toBe(22.5)
    })
  })

  describe('mapProceduresByIndexReport', () => {
    it('should map procedures by index data correctly', () => {
      const mockData = [
        {
          conceptId: 1010,
          conceptPath: 'Procedure Type||Index Procedure',
          recordsPerPerson: 1.1,
          numPersons: 300,
          percentPersons: 0.15,
          lengthOfEra: 1,
          percentPersonsBefore: 0.12,
          percentPersonsAfter: 0.18,
          riskDiffAfterBefore: 0.06,
          logRRAfterBefore: 0.03,
          countValue: 330
        }
      ]

      const result = mapProceduresByIndexReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1010)
      expect(result.prevalence[0].conceptName).toBe('Index Procedure')
      expect(result.prevalence[0].prevalence).toBe(15)
    })
  })

  describe('mapDataCompletenessReport', () => {
    it('should map data completeness data correctly', () => {
      const mockData = [
        {
          conceptId: 1111,
          conceptPath: 'Data Type||Complete Data',
          recordsPerPerson: 5.0,
          numPersons: 950,
          percentPersons: 0.475,
          lengthOfEra: 0,
          percentPersonsBefore: 0.45,
          percentPersonsAfter: 0.5,
          riskDiffAfterBefore: 0.05,
          logRRAfterBefore: 0.025,
          countValue: 4750
        }
      ]

      const result = mapDataCompletenessReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1111)
      expect(result.prevalence[0].conceptName).toBe('Complete Data')
      expect(result.prevalence[0].prevalence).toBe(47.5)
    })
  })

  describe('mapEntropyReport', () => {
    it('should map entropy data correctly', () => {
      const mockData = [
        {
          conceptId: 1212,
          conceptPath: 'Entropy Type||High Entropy',
          recordsPerPerson: 3.5,
          numPersons: 500,
          percentPersons: 0.25,
          lengthOfEra: 0,
          percentPersonsBefore: 0.2,
          percentPersonsAfter: 0.3,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.05,
          countValue: 1750
        }
      ]

      const result = mapEntropyReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1212)
      expect(result.prevalence[0].conceptName).toBe('High Entropy')
      expect(result.prevalence[0].prevalence).toBe(25)
    })
  })

  describe('mapTornadoReport', () => {
    it('should map tornado data correctly', () => {
      const mockData = [
        {
          conceptId: 1313,
          conceptPath: 'Tornado Type||Risk Factor',
          recordsPerPerson: 2.8,
          numPersons: 600,
          percentPersons: 0.3,
          lengthOfEra: 0,
          percentPersonsBefore: 0.25,
          percentPersonsAfter: 0.35,
          riskDiffAfterBefore: 0.1,
          logRRAfterBefore: 0.04,
          countValue: 1680
        }
      ]

      const result = mapTornadoReport(mockData)

      expect(result.prevalence).toHaveLength(1)
      expect(result.prevalence[0].conceptId).toBe(1313)
      expect(result.prevalence[0].conceptName).toBe('Risk Factor')
      expect(result.prevalence[0].prevalence).toBe(30)
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

      it('should work without unit parameter', () => {
        const data = [
          { year: 2020, count: 100 }
        ]

        const result = toBarChartData(data, 'year', 'count')

        expect(result.unit).toBeUndefined()
      })

      it('should handle empty array', () => {
        const data: Array<{ year: number; count: number }> = []

        const result = toBarChartData(data, 'year', 'count')

        expect(result.categories).toHaveLength(0)
        expect(result.values).toHaveLength(0)
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

      it('should handle empty array', () => {
        const data: Array<{ name: string; value: number }> = []

        const result = toPieChartData(data, 'name', 'value')

        expect(result).toHaveLength(0)
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

      it('should work without seriesName parameter', () => {
        const data = [
          { date: '2020-01', value: 10 }
        ]

        const result = toLineChartData(data, 'date', 'value')

        expect(result.seriesName).toBeUndefined()
      })

      it('should handle empty array', () => {
        const data: Array<{ date: string; value: number }> = []

        const result = toLineChartData(data, 'date', 'value')

        expect(result.xAxis).toHaveLength(0)
        expect(result.yAxis).toHaveLength(0)
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

      it('should handle empty array', () => {
        const data: Array<{ name: string; value: number }> = []

        const result = toTreemapData(data, 'name', 'value')

        expect(result).toHaveLength(0)
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

      it('should handle missing category values', () => {
        const data = [
          { category: null, name: 'Item 1', value: 100 },
          { category: undefined, name: 'Item 2', value: 150 },
          { name: 'Item 3', value: 200 }
        ]

        const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Other')
        expect(result[0].value).toBe(450) // 100 + 150 + 200
        expect(result[0].children).toHaveLength(3)
      })

      it('should handle empty array', () => {
        const data: Array<Record<string, unknown>> = []

        const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')

        expect(result).toHaveLength(0)
      })

      it('should handle mixed categories', () => {
        const data = [
          { category: 'A', name: 'Item 1', value: 10 },
          { category: 'B', name: 'Item 2', value: 20 },
          { category: 'A', name: 'Item 3', value: 30 },
          { category: 'C', name: 'Item 4', value: 40 }
        ]

        const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')

        expect(result).toHaveLength(3)
        const groupA = result.find(r => r.name === 'A')
        const groupB = result.find(r => r.name === 'B')
        const groupC = result.find(r => r.name === 'C')

        expect(groupA?.value).toBe(40)
        expect(groupA?.children).toHaveLength(2)
        expect(groupB?.value).toBe(20)
        expect(groupB?.children).toHaveLength(1)
        expect(groupC?.value).toBe(40)
        expect(groupC?.children).toHaveLength(1)
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

      it('should handle zero', () => {
        expect(formatPercentage(0)).toBe('0.0%')
        expect(formatPercentage(0, 2)).toBe('0.00%')
      })

      it('should handle negative percentages', () => {
        expect(formatPercentage(-5.5)).toBe('-5.5%')
        expect(formatPercentage(-10.123, 2)).toBe('-10.12%')
      })
    })

    describe('formatNumber', () => {
      it('should format numbers with comma separators', () => {
        expect(formatNumber(1000)).toBe('1,000')
        expect(formatNumber(1000000)).toBe('1,000,000')
        expect(formatNumber(123)).toBe('123')
      })

      it('should handle zero', () => {
        expect(formatNumber(0)).toBe('0')
      })

      it('should handle negative numbers', () => {
        expect(formatNumber(-1000)).toBe('-1,000')
        expect(formatNumber(-1234567)).toBe('-1,234,567')
      })

      it('should handle decimal numbers', () => {
        // Note: toLocaleString behavior may vary by locale
        const result = formatNumber(1234.56)
        expect(result).toContain('1')
        expect(result).toContain('234')
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

      it('should handle zero days', () => {
        expect(formatDuration(0)).toBe('0 days')
      })

      it('should handle edge cases around boundaries', () => {
        expect(formatDuration(29)).toBe('29 days')
        expect(formatDuration(30)).toBe('1 month')
        expect(formatDuration(364)).toBe('12 months')
        expect(formatDuration(365)).toBe('1 year')
      })

      it('should round months correctly', () => {
        expect(formatDuration(44)).toBe('1 month')  // rounds to 1
        expect(formatDuration(45)).toBe('2 months') // rounds to 2
      })

      it('should format years with one decimal place', () => {
        expect(formatDuration(400)).toBe('1.1 years')
        expect(formatDuration(401)).toBe('1.1 years')
        expect(formatDuration(547)).toBe('1.5 years')
        expect(formatDuration(548)).toBe('1.5 years')
      })
    })
  })

  describe('mapDrilldownReport', () => {
    const base = { conceptId: 123, conceptName: 'Test', conceptPath: 'Root||Test' }

    it('maps byUnit, byValueAsConcept, byOperator for measurement domain', () => {
      const raw: WebAPIDrilldownRaw = {
        measurementsByUnit: [{ conceptId: 1, conceptName: 'mg/dL', countValue: 500 }],
        measurementsByValueAsConcept: [{ conceptId: 2, conceptName: 'Positive', countValue: 100 }],
        measurementsByOperator: [{ conceptId: 3, conceptName: '>', countValue: 50 }]
      }

      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'measurement')

      expect(result.byUnit).toEqual([{ name: 'mg/dL', value: 500 }])
      expect(result.byValueAsConcept).toEqual([{ name: 'Positive', value: 100 }])
      expect(result.byOperator).toEqual([{ name: '>', value: 50 }])
    })

    it('maps byQualifier and byValueAsConcept for observation domain', () => {
      const raw: WebAPIDrilldownRaw = {
        observationsByQualifier: [{ conceptId: 1, conceptName: 'qualifier-1', countValue: 10 }],
        observationsByValueAsConcept: [{ conceptId: 2, conceptName: 'value-1', countValue: 20 }]
      }

      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'observation')

      expect(result.byQualifier).toEqual([{ name: 'qualifier-1', value: 10 }])
      expect(result.byValueAsConcept).toEqual([{ name: 'value-1', value: 20 }])
    })

    it('maps byFrequency histogram to BarChartData', () => {
      const raw: WebAPIDrilldownRaw = {
        frequencyDistribution: [
          { intervalIndex: 1, countValue: 100 },
          { intervalIndex: 2, countValue: 50 }
        ]
      }

      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'drug')

      expect(result.byFrequency).toEqual({
        categories: ['1', '2'],
        values: [100, 50]
      })
    })

    it('omits breakdowns that are absent', () => {
      const result = mapDrilldownReport({}, base.conceptId, base.conceptName, base.conceptPath, 'visit')
      expect(result.byUnit).toBeUndefined()
      expect(result.byQualifier).toBeUndefined()
      expect(result.byFrequency).toBeUndefined()
    })

    it('omits breakdowns when arrays are present but empty', () => {
      const raw: WebAPIDrilldownRaw = {
        ageAtFirstDiagnosis: [],
        lengthOfEra: [],
        prevalenceByGenderAgeYear: [],
        prevalenceByMonth: [],
        conditionsByType: [],
        measurementsByUnit: [],
        observationsByValueAsConcept: [],
        measurementsByOperator: [],
        observationsByQualifier: [],
        frequencyDistribution: [],
      }
      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'condition')
      expect(result.ageAtFirstOccurrence).toBeUndefined()
      expect(result.lengthOfEra).toBeUndefined()
      expect(result.prevalenceByGenderAgeYear).toBeUndefined()
      expect(result.prevalenceByMonth).toBeUndefined()
      expect(result.byType).toBeUndefined()
      expect(result.byUnit).toBeUndefined()
      expect(result.byValueAsConcept).toBeUndefined()
      expect(result.byOperator).toBeUndefined()
      expect(result.byQualifier).toBeUndefined()
      expect(result.byFrequency).toBeUndefined()
    })

    it('uses ageAtFirstExposure when ageAtFirstDiagnosis is absent', () => {
      const raw: WebAPIDrilldownRaw = {
        ageAtFirstExposure: [{ category: 'A', min: 1, max: 90 }],
      }
      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'drug')
      expect(result.ageAtFirstOccurrence).toBeDefined()
      expect(result.ageAtFirstOccurrence?.[0]?.category).toBe('A')
    })

    it('uses ageAtFirstOccurrence as final fallback', () => {
      const raw: WebAPIDrilldownRaw = {
        ageAtFirstOccurrence: [{ intervalIndex: 5, min: 1, max: 90 }],
      }
      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'condition')
      expect(result.ageAtFirstOccurrence?.[0]?.category).toBe('Interval 5')
    })

    it('maps lengthOfEra and prevalenceByGenderAgeYear and prevalenceByMonth when present', () => {
      const raw: WebAPIDrilldownRaw = {
        lengthOfEra: [{ category: 'L', min: 0, max: 30 }],
        prevalenceByGenderAgeYear: [
          { trellisName: 'Female', seriesName: '20-29', xCalendarYear: 2020, yPrevalence1000Pp: 5 },
        ],
        prevalenceByMonth: [{ xCalendarMonth: 202001, yPrevalence1000Pp: 10 }],
      }
      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'condition')
      expect(result.lengthOfEra).toBeDefined()
      expect(result.prevalenceByGenderAgeYear).toBeDefined()
      expect(result.prevalenceByMonth).toBeDefined()
    })

    it('uses fallback Concept ${conceptId} for missing concept names in byType, byUnit, byValueAsConcept, byOperator, byQualifier', () => {
      const raw: WebAPIDrilldownRaw = {
        // drugsByType branch (when conditionsByType absent)
        drugsByType: [{ conceptId: 999, countValue: 10 }],
        measurementsByUnit: [{ conceptId: 1001, countValue: 5 }],
        measurementsByValueAsConcept: [{ conceptId: 1002, countValue: 3 }],
        measurementsByOperator: [{ conceptId: 1003, countValue: 2 }],
        observationsByQualifier: [{ conceptId: 1004, countValue: 1 }],
      }
      const result = mapDrilldownReport(raw, base.conceptId, base.conceptName, base.conceptPath, 'measurement')
      expect(result.byType?.[0]).toEqual({ name: 'Concept 999', value: 10 })
      expect(result.byUnit?.[0]).toEqual({ name: 'Concept 1001', value: 5 })
      expect(result.byValueAsConcept?.[0]).toEqual({ name: 'Concept 1002', value: 3 })
      expect(result.byOperator?.[0]).toEqual({ name: 'Concept 1003', value: 2 })
      expect(result.byQualifier?.[0]).toEqual({ name: 'Concept 1004', value: 1 })
    })

    it('falls through observationsByType, measurementsByType, proceduresByType for byType', () => {
      const result1 = mapDrilldownReport(
        { observationsByType: [{ conceptId: 1, conceptName: 'Obs', countValue: 5 }] },
        base.conceptId, base.conceptName, base.conceptPath, 'observation'
      )
      expect(result1.byType?.[0]).toEqual({ name: 'Obs', value: 5 })

      const result2 = mapDrilldownReport(
        { measurementsByType: [{ conceptId: 2, conceptName: 'Mea', countValue: 6 }] },
        base.conceptId, base.conceptName, base.conceptPath, 'measurement'
      )
      expect(result2.byType?.[0]).toEqual({ name: 'Mea', value: 6 })

      const result3 = mapDrilldownReport(
        { proceduresByType: [{ conceptId: 3, conceptName: 'Pro', countValue: 7 }] },
        base.conceptId, base.conceptName, base.conceptPath, 'procedure'
      )
      expect(result3.byType?.[0]).toEqual({ name: 'Pro', value: 7 })
    })
  })

  describe('Branch coverage - additional fallback scenarios', () => {
    it('mapPersonReport handles totalGender / totalRace / totalEthnicity = 0 (no division by zero)', () => {
      const data: WebAPIPersonRaw = {
        yearOfBirth: [],
        gender: [
          { conceptId: 8507, conceptName: 'Male', countValue: 0, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
        ],
        race: [
          { conceptId: 8527, conceptName: 'White', countValue: 0, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
        ],
        ethnicity: [
          { conceptId: 38003564, conceptName: 'Not Hispanic', countValue: 0, conditionConceptName: null, conditionConceptId: 0, observationConceptName: null, observationConceptId: 0 },
        ],
      }
      const result = mapPersonReport(data)
      expect(result.demographics.gender[0].percentage).toBe(0)
      expect(result.demographics.race[0].percentage).toBe(0)
      expect(result.demographics.ethnicity[0].percentage).toBe(0)
    })

    it('mapPersonsExposureReport uses fallback Concept name when conceptPath empty', () => {
      const data: import('@/models/report.types').WebAPIPersonsExposureRaw = [
        {
          conceptId: 555,
          conceptPath: '',
          recordsPerPerson: 1,
          percentPersons: 0.1,
          numPersons: 10,
          lengthOfEra: 0,
          percentPersonsBefore: 0,
          percentPersonsAfter: 0,
          riskDiffAfterBefore: 0,
          logRRAfterBefore: 0,
          countValue: 10,
        },
      ]
      const result = mapPersonsExposureReport(data)
      expect(result.prevalence[0].conceptName).toBe('Concept 555')
    })

    it('mapVisitsReport uses fallback Concept name when path empty', () => {
      const data = [
        {
          conceptId: 11,
          conceptPath: '',
          recordsPerPerson: 1,
          percentPersons: 0.1,
          numPersons: 10,
          lengthOfEra: 0,
          percentPersonsBefore: 0,
          percentPersonsAfter: 0,
          riskDiffAfterBefore: 0,
          logRRAfterBefore: 0,
          countValue: 10,
        },
      ]
      const result = mapVisitsReport(data)
      expect(result.prevalence[0].conceptName).toBe('Concept 11')
    })

    it('mapDrugUtilizationReport uses fallback Concept name when path empty', () => {
      const data = [
        {
          conceptId: 22,
          conceptPath: '',
          recordsPerPerson: 1,
          numPersons: 10,
          percentPersons: 0.1,
          lengthOfEra: 0,
          percentPersonsBefore: 0,
          percentPersonsAfter: 0,
          riskDiffAfterBefore: 0,
          logRRAfterBefore: 0,
          countValue: 10,
        },
      ]
      const result = mapDrugUtilizationReport(data)
      expect(result.prevalence[0].conceptName).toBe('Concept 22')
    })

    it.each([
      ['mapConditionsByIndexReport', mapConditionsByIndexReport, 'Concept 33', 33],
      ['mapDeathReport', mapDeathReport, 'Concept 34', 34],
      ['mapDrugExposureReport', mapDrugExposureReport, 'Concept 35', 35],
      ['mapDrugsByIndexReport', mapDrugsByIndexReport, 'Concept 36', 36],
      ['mapObservationPeriodsReport', mapObservationPeriodsReport, 'Concept 37', 37],
      ['mapProcedureReport', mapProcedureReport, 'Concept 38', 38],
      ['mapProceduresByIndexReport', mapProceduresByIndexReport, 'Concept 39', 39],
      ['mapDataCompletenessReport', mapDataCompletenessReport, 'Concept 40', 40],
      ['mapEntropyReport', mapEntropyReport, 'Concept 41', 41],
      ['mapTornadoReport', mapTornadoReport, 'Concept 42', 42],
    ])('%s falls back when conceptPath is empty', (_name, fn, expectedName, conceptId) => {
      const data = [
        {
          conceptId,
          conceptPath: '',
          recordsPerPerson: 1,
          numPersons: 10,
          percentPersons: 0.1,
          lengthOfEra: 0,
          percentPersonsBefore: 0,
          percentPersonsAfter: 0,
          riskDiffAfterBefore: 0,
          logRRAfterBefore: 0,
          countValue: 10,
        },
      ]
      const result = (fn as (d: typeof data) => { prevalence: Array<{ conceptName: string }> })(data)
      expect(result.prevalence[0].conceptName).toBe(expectedName)
    })

    it('toTreemapData omits conceptId/conceptPath keys when not present', () => {
      const data = [
        { name: 'Foo', value: 100 },
      ]
      const result = toTreemapData(data, 'name', 'value')
      expect(result[0].conceptId).toBeUndefined()
      expect(result[0].conceptPath).toBeUndefined()
    })

    it('toTreemapData populates conceptId/conceptPath when keys present', () => {
      const data = [
        { name: 'X||Y', value: 100, conceptId: 42, conceptPath: 'A||B' },
      ]
      const result = toTreemapData(data, 'name', 'value')
      expect(result[0].conceptId).toBe(42)
      expect(result[0].conceptPath).toBe('A||B')
      // extractConceptDisplayName splits on ||
      expect(result[0].name).toBe('Y')
    })

    it('toTreemapData uses extractConceptDisplayName which returns empty string for empty path', () => {
      const data = [
        { name: '', value: 100 },
      ]
      const result = toTreemapData(data, 'name', 'value')
      expect(result[0].name).toBe('')
    })

    it('toTreemapData uses extractConceptDisplayName fallback empty string when last segment is whitespace', () => {
      const data = [
        { name: 'A||B||   ', value: 100 },
      ]
      const result = toTreemapData(data, 'name', 'value')
      expect(result[0].name).toBe('')
    })

    it('toHierarchicalTreemapData omits conceptId/conceptPath when missing on items', () => {
      const data: Array<Record<string, unknown>> = [
        { category: 'A', name: 'Foo', value: 100 },
      ]
      const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')
      expect(result[0].children?.[0]?.conceptId).toBeUndefined()
      expect(result[0].children?.[0]?.conceptPath).toBeUndefined()
    })

    it('toHierarchicalTreemapData populates conceptId/conceptPath when present', () => {
      const data: Array<Record<string, unknown>> = [
        { category: 'A', name: 'Foo', value: 100, conceptId: 7, conceptPath: 'X||Y' },
      ]
      const result = toHierarchicalTreemapData(data, 'category', 'name', 'value')
      expect(result[0].children?.[0]?.conceptId).toBe(7)
      expect(result[0].children?.[0]?.conceptPath).toBe('X||Y')
    })

    it('mapBoxPlotData uses default fallbacks for missing fields', () => {
      const result = mapBoxPlotData([{}])
      expect(result[0]).toEqual({
        category: 'Interval 0',
        min: 0,
        p10: 0,
        p25: 0,
        median: 0,
        p75: 0,
        p90: 0,
        max: 0,
      })
    })

    it('mapBoxPlotData uses avgValue when medianValue is missing', () => {
      const result = mapBoxPlotData([{ avgValue: 50 }])
      expect(result[0].median).toBe(50)
    })

    it('mapBoxPlotData reads WebAPI minValue/maxValue (not min/max)', () => {
      // Real WebAPI payload uses minValue/maxValue (like p25Value/medianValue).
      // Reading min/max yields 0 and collapses the box (the "max is 0" bug).
      const result = mapBoxPlotData([
        { category: 'MALE', minValue: 11438, p25Value: 17556, medianValue: 20972, p75Value: 24703, maxValue: 40005 },
      ])
      expect(result[0].min).toBe(11438)
      expect(result[0].max).toBe(40005)
    })

    it('mapTrellisData applies defaults when fields missing', () => {
      const result = mapTrellisData([
        {}, // all missing
      ])
      expect(result.categories).toContain('Overall')
      expect(result.series[0]?.name).toBe('Total')
    })

    it('mapTrellisData groups multiple series within a category', () => {
      const result = mapTrellisData([
        { trellisName: 'Female', seriesName: '20s', xCalendarYear: 2020, yPrevalence1000Pp: 5 },
        { trellisName: 'Female', seriesName: '20s', xCalendarYear: 2019, yPrevalence1000Pp: 4 },
        { trellisName: 'Female', seriesName: '30s', xCalendarYear: 2020, yPrevalence1000Pp: 6 },
        { trellisName: 'Male', seriesName: '20s', xCalendarYear: 2020, yPrevalence1000Pp: 7 },
      ])
      expect(result.categories.length).toBe(2)
      // Within 'Female' there are 2 series
      const femaleSeries = result.series.filter(s => s.category === 'Female')
      expect(femaleSeries).toHaveLength(2)
      // 20s series sorted ascending by year
      const female20s = femaleSeries.find(s => s.name === '20s')
      expect(female20s?.data?.[0]?.x).toBe(2019)
      expect(female20s?.data?.[1]?.x).toBe(2020)
    })

    it('mapTimeSeriesData converts YYYYMM number to MM/YYYY', () => {
      const result = mapTimeSeriesData([
        { xCalendarMonth: 202005, yPrevalence1000Pp: 12 },
      ])
      expect(result[0].date).toBe('05/2020')
      expect(result[0].value).toBe(12)
    })
  })
})
