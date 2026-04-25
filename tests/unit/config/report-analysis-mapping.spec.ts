/**
 * Report Analysis Mapping Tests
 * Tests for report type to analysis ID mappings and availability checks
 */
import { describe, it, expect } from 'vitest'
import {
  REPORT_ANALYSIS_REQUIREMENTS,
  isReportAvailable,
  getAvailableReportTypes
} from '@/config/report-analysis-mapping'
import type { ReportType } from '@/models/report.types'

describe('report-analysis-mapping', () => {
  describe('REPORT_ANALYSIS_REQUIREMENTS', () => {
    it('should export requirements object', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS).toBeDefined()
      expect(typeof REPORT_ANALYSIS_REQUIREMENTS).toBe('object')
    })

    it('should have person report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['person']).toEqual([0, 1, 2, 3, 4, 5])
    })

    it('should have condition report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['condition']).toEqual([116, 117, 400, 401, 402, 404, 405, 406, 1])
      expect(REPORT_ANALYSIS_REQUIREMENTS['condition'].length).toBeGreaterThan(0)
    })

    it('should have condition-eras report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['condition-eras']).toEqual([1, 1000, 1002, 1004, 1006, 1007])
    })

    it('should have conditions-by-index report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['conditions-by-index']).toEqual([405, 406])
    })

    it('should have drug-exposure report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-exposure']).toEqual([700, 701, 706, 715, 705, 704, 116, 702, 117, 717, 716, 1])
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-exposure'].length).toBeGreaterThan(0)
    })

    it('should have drug-eras report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-eras']).toEqual([1, 900, 902, 904, 906, 907])
    })

    it('should have drugs-by-index report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drugs-by-index']).toEqual([705, 706])
    })

    it('should have procedure report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['procedure']).toEqual([606, 604, 116, 602, 117, 605, 600, 601, 1])
      expect(REPORT_ANALYSIS_REQUIREMENTS['procedure'].length).toBeGreaterThan(0)
    })

    it('should have procedures-by-index report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['procedures-by-index']).toEqual([605, 606])
    })

    it('should have observation-periods report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['observation-periods']).toEqual([101, 104, 106, 107, 108, 109, 110, 113, 1])
    })

    it('should have death report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['death']).toEqual([501, 506, 505, 504, 502, 116, 117])
    })

    it('should have cohort-specific report requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['cohort-specific']).toEqual([0, 1, 2, 3, 4])
    })

    it('should have heracles-heel with empty requirements', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['heracles-heel']).toEqual([])
    })

    it('should have baseline exposure period reports', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['persons-exposure-baseline']).toEqual([101, 104, 106, 107, 108, 109, 110, 113])
      expect(REPORT_ANALYSIS_REQUIREMENTS['visits-baseline']).toEqual([200, 201, 202, 206, 116])
      expect(REPORT_ANALYSIS_REQUIREMENTS['visit-dates-baseline']).toEqual([220])
      expect(REPORT_ANALYSIS_REQUIREMENTS['care-site-visit-dates-baseline']).toEqual([220])
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-utilization-baseline']).toEqual([900, 901, 902, 903, 904])
    })

    it('should have cohort period reports', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['persons-exposure-cohort']).toEqual([101, 104, 106, 107, 108, 109, 110, 113])
      expect(REPORT_ANALYSIS_REQUIREMENTS['visits-cohort']).toEqual([200, 201, 202, 206, 116])
      expect(REPORT_ANALYSIS_REQUIREMENTS['visit-dates-cohort']).toEqual([220])
      expect(REPORT_ANALYSIS_REQUIREMENTS['care-site-visit-dates-cohort']).toEqual([220])
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-utilization-cohort']).toEqual([900, 901, 902, 903, 904])
    })

    it('should have data quality reports', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['data-completeness']).toEqual([117])
      expect(REPORT_ANALYSIS_REQUIREMENTS['entropy']).toEqual([117])
      expect(REPORT_ANALYSIS_REQUIREMENTS['tornado']).toEqual([117])
    })

    it('should have all requirements as arrays', () => {
      Object.values(REPORT_ANALYSIS_REQUIREMENTS).forEach(requirements => {
        expect(Array.isArray(requirements)).toBe(true)
      })
    })

    it('should have numeric analysis IDs', () => {
      Object.values(REPORT_ANALYSIS_REQUIREMENTS).forEach(requirements => {
        requirements.forEach(analysisId => {
          expect(typeof analysisId).toBe('number')
          expect(Number.isInteger(analysisId)).toBe(true)
        })
      })
    })
  })

  describe('isReportAvailable', () => {
    it('should return true when all required analyses are completed', () => {
      const completedAnalyses = [0, 1, 2, 3, 4, 5, 100, 200]
      const result = isReportAvailable('person', completedAnalyses)
      expect(result).toBe(true)
    })

    it('should return false when some required analyses are missing', () => {
      const completedAnalyses = [0, 1, 2] // missing 3, 4, 5
      const result = isReportAvailable('person', completedAnalyses)
      expect(result).toBe(false)
    })

    it('should return false when no analyses are completed', () => {
      const completedAnalyses: number[] = []
      const result = isReportAvailable('person', completedAnalyses)
      expect(result).toBe(false)
    })

    it('should return false for heracles-heel report type', () => {
      const completedAnalyses = [0, 1, 2, 3, 4, 5, 100, 200]
      const result = isReportAvailable('heracles-heel', completedAnalyses)
      expect(result).toBe(false) // Always false per implementation
    })

    it('should handle empty requirements array', () => {
      const completedAnalyses = [1, 2, 3]
      const result = isReportAvailable('heracles-heel', completedAnalyses)
      expect(result).toBe(false)
    })

    it('should return true for condition report with all required analyses', () => {
      const completedAnalyses = [1, 116, 117, 400, 401, 402, 404, 405, 406, 999]
      const result = isReportAvailable('condition', completedAnalyses)
      expect(result).toBe(true)
    })

    it('should return false for condition report with missing analysis', () => {
      const completedAnalyses = [1, 116, 117, 400, 401, 402, 404, 405] // missing 406
      const result = isReportAvailable('condition', completedAnalyses)
      expect(result).toBe(false)
    })

    it('should handle reports with single requirement', () => {
      const completedAnalyses = [117, 200, 300]
      expect(isReportAvailable('data-completeness', completedAnalyses)).toBe(true)
      expect(isReportAvailable('entropy', completedAnalyses)).toBe(true)
      expect(isReportAvailable('tornado', completedAnalyses)).toBe(true)
    })

    it('should handle reports with single requirement missing', () => {
      const completedAnalyses = [1, 2, 3, 100, 200]
      expect(isReportAvailable('data-completeness', completedAnalyses)).toBe(false)
    })

    it('should handle drug-exposure report', () => {
      const allRequired = [700, 701, 706, 715, 705, 704, 116, 702, 117, 717, 716, 1]
      expect(isReportAvailable('drug-exposure', allRequired)).toBe(true)
      expect(isReportAvailable('drug-exposure', allRequired.slice(0, -1))).toBe(false)
    })

    it('should handle procedure report', () => {
      const allRequired = [606, 604, 116, 602, 117, 605, 600, 601, 1]
      expect(isReportAvailable('procedure', allRequired)).toBe(true)
      expect(isReportAvailable('procedure', [606, 604, 116])).toBe(false)
    })

    it('should handle baseline and cohort period reports', () => {
      const baselineAnalyses = [101, 104, 106, 107, 108, 109, 110, 113]
      expect(isReportAvailable('persons-exposure-baseline', baselineAnalyses)).toBe(true)
      expect(isReportAvailable('persons-exposure-cohort', baselineAnalyses)).toBe(true)
    })

    it('should verify analysis order does not matter', () => {
      const ordered = [0, 1, 2, 3, 4, 5]
      const unordered = [5, 2, 0, 4, 1, 3]
      expect(isReportAvailable('person', ordered)).toBe(true)
      expect(isReportAvailable('person', unordered)).toBe(true)
    })

    it('should handle duplicate analysis IDs in completed list', () => {
      const withDuplicates = [0, 1, 1, 2, 2, 3, 4, 5, 5]
      expect(isReportAvailable('person', withDuplicates)).toBe(true)
    })
  })

  describe('getAvailableReportTypes', () => {
    it('returns only the inclusion-rule report when no Heracles analyses are completed', () => {
      // The inclusion-rule report comes from cohort generation, not Heracles, so
      // it is always available — every other report needs at least one completed
      // analysis id to qualify.
      const result = getAvailableReportTypes([])
      expect(result).toEqual(['inclusion-rule'])
    })

    it('should return person report when person analyses completed', () => {
      const completedAnalyses = [0, 1, 2, 3, 4, 5]
      const result = getAvailableReportTypes(completedAnalyses)
      expect(result).toContain('person')
    })

    it('should not include heracles-heel in available reports', () => {
      const completedAnalyses = [0, 1, 2, 3, 4, 5, 100, 200, 300, 400, 500]
      const result = getAvailableReportTypes(completedAnalyses)
      expect(result).not.toContain('heracles-heel')
    })

    it('should return multiple report types when their analyses are completed', () => {
      const completedAnalyses = [
        0, 1, 2, 3, 4, 5, // person
        117, // data quality reports
        220  // visit dates
      ]
      const result = getAvailableReportTypes(completedAnalyses)
      expect(result).toContain('person')
      expect(result).toContain('data-completeness')
      expect(result).toContain('entropy')
      expect(result).toContain('tornado')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should return all report types when all analyses completed', () => {
      // Generate a large set of completed analyses
      const allPossibleAnalyses = Array.from({ length: 1010 }, (_, i) => i)
      const result = getAvailableReportTypes(allPossibleAnalyses)

      expect(result.length).toBeGreaterThan(0)
      expect(result).not.toContain('heracles-heel') // Never available
    })

    it('should filter out reports with incomplete requirements', () => {
      const completedAnalyses = [0, 1, 2] // Only partial person report requirements
      const result = getAvailableReportTypes(completedAnalyses)
      expect(result).not.toContain('person')
    })

    it('should handle condition reports', () => {
      const conditionAnalyses = [1, 116, 117, 400, 401, 402, 404, 405, 406]
      const result = getAvailableReportTypes(conditionAnalyses)
      expect(result).toContain('condition')
    })

    it('should handle drug reports', () => {
      const drugAnalyses = [1, 700, 701, 702, 704, 705, 706, 715, 716, 717, 116, 117]
      const result = getAvailableReportTypes(drugAnalyses)
      expect(result).toContain('drug-exposure')
    })

    it('should return ReportType array', () => {
      const completedAnalyses = [0, 1, 2, 3, 4, 5]
      const result = getAvailableReportTypes(completedAnalyses)
      expect(Array.isArray(result)).toBe(true)
      result.forEach(reportType => {
        expect(typeof reportType).toBe('string')
      })
    })

    it('should handle by-index reports separately', () => {
      const analyses = [405, 406, 605, 606, 705, 706]
      const result = getAvailableReportTypes(analyses)
      expect(result).toContain('conditions-by-index')
      expect(result).toContain('procedures-by-index')
      expect(result).toContain('drugs-by-index')
    })

    it('should handle era reports', () => {
      const eraAnalyses = [1, 900, 902, 904, 906, 907, 1000, 1002, 1004, 1006, 1007]
      const result = getAvailableReportTypes(eraAnalyses)
      expect(result).toContain('drug-eras')
      expect(result).toContain('condition-eras')
    })

    it('should handle baseline vs cohort period reports', () => {
      const periodAnalyses = [101, 104, 106, 107, 108, 109, 110, 113]
      const result = getAvailableReportTypes(periodAnalyses)
      // Both baseline and cohort have same requirements, so both should be available
      expect(result).toContain('persons-exposure-baseline')
      expect(result).toContain('persons-exposure-cohort')
    })
  })

  describe('edge cases', () => {
    it('should handle negative analysis IDs gracefully', () => {
      const completedAnalyses = [-1, 0, 1, 2, 3, 4, 5]
      expect(() => isReportAvailable('person', completedAnalyses)).not.toThrow()
    })

    it('should handle very large analysis IDs', () => {
      const completedAnalyses = [999999, 0, 1, 2, 3, 4, 5]
      expect(isReportAvailable('person', completedAnalyses)).toBe(true)
    })

    it('should handle report types consistently', () => {
      const reportTypes = Object.keys(REPORT_ANALYSIS_REQUIREMENTS) as ReportType[]
      const completedAnalyses: number[] = []

      reportTypes.forEach(reportType => {
        expect(() => isReportAvailable(reportType, completedAnalyses)).not.toThrow()
      })
    })

    it('should verify all report types have requirements defined', () => {
      const reportTypes = Object.keys(REPORT_ANALYSIS_REQUIREMENTS)
      expect(reportTypes.length).toBeGreaterThan(20) // Should have many report types

      reportTypes.forEach(reportType => {
        const requirements = REPORT_ANALYSIS_REQUIREMENTS[reportType as ReportType]
        expect(Array.isArray(requirements)).toBe(true)
      })
    })
  })
})
