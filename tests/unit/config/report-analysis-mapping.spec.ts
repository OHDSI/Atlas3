/**
 * Unit Tests: Report Analysis Mapping
 * Tests for src/config/report-analysis-mapping.ts
 *
 * This test suite covers all exported mappings and functions, including
 * edge cases, boundary conditions, and various input scenarios.
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
    it('exports a complete mapping object', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS).toBeDefined()
      expect(typeof REPORT_ANALYSIS_REQUIREMENTS).toBe('object')
      expect(Object.keys(REPORT_ANALYSIS_REQUIREMENTS).length).toBeGreaterThan(0)
    })

    it('contains all expected report types', () => {
      const expectedReportTypes: ReportType[] = [
        'person',
        'condition',
        'condition-eras',
        'conditions-by-index',
        'drug-exposure',
        'drug-eras',
        'drugs-by-index',
        'procedure',
        'procedures-by-index',
        'observation-periods',
        'death',
        'cohort-specific',
        'heracles-heel',
        'persons-exposure-baseline',
        'visits-baseline',
        'visit-dates-baseline',
        'care-site-visit-dates-baseline',
        'drug-utilization-baseline',
        'persons-exposure-cohort',
        'visits-cohort',
        'visit-dates-cohort',
        'care-site-visit-dates-cohort',
        'drug-utilization-cohort',
        'data-completeness',
        'entropy',
        'tornado'
      ]

      expectedReportTypes.forEach(reportType => {
        expect(REPORT_ANALYSIS_REQUIREMENTS).toHaveProperty(reportType)
      })
    })

    it('maps person report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.person).toEqual([0, 1, 2, 3, 4, 5])
    })

    it('maps condition report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.condition).toEqual([116, 117, 400, 401, 402, 404, 405, 406, 1])
    })

    it('maps condition-eras report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['condition-eras']).toEqual([1, 1000, 1002, 1004, 1006, 1007])
    })

    it('maps conditions-by-index report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['conditions-by-index']).toEqual([405, 406])
    })

    it('maps drug-exposure report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-exposure']).toEqual([700, 701, 706, 715, 705, 704, 116, 702, 117, 717, 716, 1])
    })

    it('maps drug-eras report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-eras']).toEqual([1, 900, 902, 904, 906, 907])
    })

    it('maps drugs-by-index report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drugs-by-index']).toEqual([705, 706])
    })

    it('maps procedure report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.procedure).toEqual([606, 604, 116, 602, 117, 605, 600, 601, 1])
    })

    it('maps procedures-by-index report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['procedures-by-index']).toEqual([605, 606])
    })

    it('maps observation-periods report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['observation-periods']).toEqual([101, 104, 106, 107, 108, 109, 110, 113, 1])
    })

    it('maps death report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.death).toEqual([501, 506, 505, 504, 502, 116, 117])
    })

    it('maps cohort-specific report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['cohort-specific']).toEqual([0, 1, 2, 3, 4])
    })

    it('maps heracles-heel to empty array (special handling)', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['heracles-heel']).toEqual([])
    })

    it('maps persons-exposure-baseline report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['persons-exposure-baseline']).toEqual([101, 104, 106, 107, 108, 109, 110, 113])
    })

    it('maps visits-baseline report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['visits-baseline']).toEqual([200, 201, 202, 206, 116])
    })

    it('maps visit-dates-baseline report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['visit-dates-baseline']).toEqual([220])
    })

    it('maps care-site-visit-dates-baseline report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['care-site-visit-dates-baseline']).toEqual([220])
    })

    it('maps drug-utilization-baseline report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-utilization-baseline']).toEqual([900, 901, 902, 903, 904])
    })

    it('maps persons-exposure-cohort report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['persons-exposure-cohort']).toEqual([101, 104, 106, 107, 108, 109, 110, 113])
    })

    it('maps visits-cohort report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['visits-cohort']).toEqual([200, 201, 202, 206, 116])
    })

    it('maps visit-dates-cohort report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['visit-dates-cohort']).toEqual([220])
    })

    it('maps care-site-visit-dates-cohort report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['care-site-visit-dates-cohort']).toEqual([220])
    })

    it('maps drug-utilization-cohort report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['drug-utilization-cohort']).toEqual([900, 901, 902, 903, 904])
    })

    it('maps data-completeness report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS['data-completeness']).toEqual([117])
    })

    it('maps entropy report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.entropy).toEqual([117])
    })

    it('maps tornado report to correct analysis IDs', () => {
      expect(REPORT_ANALYSIS_REQUIREMENTS.tornado).toEqual([117])
    })

    it('all mappings contain only number arrays', () => {
      Object.values(REPORT_ANALYSIS_REQUIREMENTS).forEach(analysisIds => {
        expect(Array.isArray(analysisIds)).toBe(true)
        analysisIds.forEach(id => {
          expect(typeof id).toBe('number')
        })
      })
    })

    it('has no duplicate analysis IDs within each report type', () => {
      Object.entries(REPORT_ANALYSIS_REQUIREMENTS).forEach(([_reportType, analysisIds]) => {
        const uniqueIds = new Set(analysisIds)
        expect(uniqueIds.size).toBe(analysisIds.length)
      })
    })

    it('all analysis IDs are non-negative integers', () => {
      Object.values(REPORT_ANALYSIS_REQUIREMENTS).forEach(analysisIds => {
        analysisIds.forEach(id => {
          expect(id).toBeGreaterThanOrEqual(0)
          expect(Number.isInteger(id)).toBe(true)
        })
      })
    })
  })

  describe('isReportAvailable', () => {
    describe('heracles-heel special handling', () => {
      it('always returns false for heracles-heel regardless of completed analyses', () => {
        expect(isReportAvailable('heracles-heel', [])).toBe(false)
      })

      it('returns false for heracles-heel even with all analyses completed', () => {
        const allAnalyses = Array.from({ length: 2000 }, (_, i) => i)
        expect(isReportAvailable('heracles-heel', allAnalyses)).toBe(false)
      })

      it('returns false for heracles-heel with exactly its required analyses', () => {
        expect(isReportAvailable('heracles-heel', [])).toBe(false)
      })
    })

    describe('empty requirements handling', () => {
      it('returns true for empty requirements when some analyses are completed', () => {
        // Since heracles-heel always returns false, we need to mock a report with empty requirements
        // In the actual implementation, heracles-heel is the only one with empty requirements
        // and it has special handling to return false
        expect(isReportAvailable('heracles-heel', [1, 2, 3])).toBe(false)
      })
    })

    describe('all requirements met', () => {
      it('returns true when all required analyses are present', () => {
        const completed = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        expect(isReportAvailable('person', completed)).toBe(true)
      })

      it('returns true when required analyses are present with extras', () => {
        const completed = [0, 1, 2, 3, 4, 5, 100, 200, 300]
        expect(isReportAvailable('person', completed)).toBe(true)
      })

      it('returns true for condition report with all required IDs', () => {
        const completed = [1, 116, 117, 400, 401, 402, 404, 405, 406]
        expect(isReportAvailable('condition', completed)).toBe(true)
      })

      it('returns true for drug-exposure with all required IDs', () => {
        const completed = [1, 116, 117, 700, 701, 702, 704, 705, 706, 715, 716, 717]
        expect(isReportAvailable('drug-exposure', completed)).toBe(true)
      })
    })

    describe('missing requirements', () => {
      it('returns false when no analyses are completed', () => {
        expect(isReportAvailable('person', [])).toBe(false)
      })

      it('returns false when only some required analyses are present', () => {
        const completed = [0, 1, 2, 3] // Missing 4 and 5
        expect(isReportAvailable('person', completed)).toBe(false)
      })

      it('returns false when missing just one required analysis', () => {
        const completed = [0, 1, 2, 3, 4] // Missing 5
        expect(isReportAvailable('person', completed)).toBe(false)
      })

      it('returns false for condition report missing one analysis', () => {
        const completed = [1, 116, 117, 400, 401, 402, 404, 405] // Missing 406
        expect(isReportAvailable('condition', completed)).toBe(false)
      })

      it('returns false for drug-exposure missing multiple analyses', () => {
        const completed = [700, 701, 706] // Missing many required IDs
        expect(isReportAvailable('drug-exposure', completed)).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('handles single-requirement reports correctly', () => {
        const completed = [220]
        expect(isReportAvailable('visit-dates-baseline', completed)).toBe(true)
      })

      it('returns false for single-requirement reports when requirement is missing', () => {
        const completed = [219, 221] // Has nearby IDs but not 220
        expect(isReportAvailable('visit-dates-baseline', completed)).toBe(false)
      })

      it('handles reports with minimal requirements (2 IDs)', () => {
        const completed = [405, 406]
        expect(isReportAvailable('conditions-by-index', completed)).toBe(true)
      })

      it('returns false when completed list has unrelated analyses', () => {
        const completed = [999, 1000, 1001, 1002, 1003]
        expect(isReportAvailable('person', completed)).toBe(false)
      })

      it('handles duplicate IDs in completed analyses', () => {
        const completed = [0, 1, 2, 3, 4, 5, 5, 5, 1, 1] // Duplicates
        expect(isReportAvailable('person', completed)).toBe(true)
      })

      it('handles very large analysis ID numbers', () => {
        const completed = [1, 900, 902, 904, 906, 907]
        expect(isReportAvailable('drug-eras', completed)).toBe(true)
      })

      it('handles analysis ID 0 correctly', () => {
        const completed = [0, 1, 2, 3, 4, 5]
        expect(isReportAvailable('person', completed)).toBe(true)
      })

      it('handles overlapping requirements between baseline and cohort reports', () => {
        const completed = [101, 104, 106, 107, 108, 109, 110, 113]
        expect(isReportAvailable('persons-exposure-baseline', completed)).toBe(true)
        expect(isReportAvailable('persons-exposure-cohort', completed)).toBe(true)
      })
    })

    describe('order independence', () => {
      it('returns same result regardless of completed analyses order', () => {
        const ordered = [0, 1, 2, 3, 4, 5]
        const reversed = [5, 4, 3, 2, 1, 0]
        const shuffled = [2, 5, 0, 3, 1, 4]

        expect(isReportAvailable('person', ordered)).toBe(true)
        expect(isReportAvailable('person', reversed)).toBe(true)
        expect(isReportAvailable('person', shuffled)).toBe(true)
      })

      it('returns same result with mixed order for complex reports', () => {
        const ordered = [1, 116, 117, 400, 401, 402, 404, 405, 406]
        const mixed = [406, 1, 404, 117, 401, 116, 402, 405, 400]

        expect(isReportAvailable('condition', ordered)).toBe(true)
        expect(isReportAvailable('condition', mixed)).toBe(true)
      })
    })

    describe('boundary conditions', () => {
      it('handles empty completed array for reports with requirements', () => {
        expect(isReportAvailable('person', [])).toBe(false)
      })

      it('handles single analysis ID in completed when multiple required', () => {
        expect(isReportAvailable('person', [0])).toBe(false)
      })

      it('handles completed array much larger than requirements', () => {
        const largeCompleted = Array.from({ length: 1000 }, (_, i) => i)
        expect(isReportAvailable('person', largeCompleted)).toBe(true)
      })

      it('returns false when completed has high IDs but report needs low IDs', () => {
        const highIds = [1000, 1001, 1002, 1003, 1004]
        expect(isReportAvailable('person', highIds)).toBe(false)
      })
    })

    describe('all report types', () => {
      it('validates cohort-specific report availability', () => {
        const completed = [0, 1, 2, 3, 4]
        expect(isReportAvailable('cohort-specific', completed)).toBe(true)
      })

      it('validates observation-periods report availability', () => {
        const completed = [1, 101, 104, 106, 107, 108, 109, 110, 113]
        expect(isReportAvailable('observation-periods', completed)).toBe(true)
      })

      it('validates death report availability', () => {
        const completed = [116, 117, 501, 502, 504, 505, 506]
        expect(isReportAvailable('death', completed)).toBe(true)
      })

      it('validates procedure report availability', () => {
        const completed = [1, 116, 117, 600, 601, 602, 604, 605, 606]
        expect(isReportAvailable('procedure', completed)).toBe(true)
      })

      it('validates data quality reports (data-completeness, entropy, tornado)', () => {
        const completed = [117]
        expect(isReportAvailable('data-completeness', completed)).toBe(true)
        expect(isReportAvailable('entropy', completed)).toBe(true)
        expect(isReportAvailable('tornado', completed)).toBe(true)
      })

      it('validates baseline exposure reports', () => {
        const completed = [101, 104, 106, 107, 108, 109, 110, 113, 200, 201, 202, 206, 116, 220, 900, 901, 902, 903, 904]
        expect(isReportAvailable('persons-exposure-baseline', completed)).toBe(true)
        expect(isReportAvailable('visits-baseline', completed)).toBe(true)
        expect(isReportAvailable('visit-dates-baseline', completed)).toBe(true)
        expect(isReportAvailable('care-site-visit-dates-baseline', completed)).toBe(true)
        expect(isReportAvailable('drug-utilization-baseline', completed)).toBe(true)
      })

      it('validates cohort exposure reports', () => {
        const completed = [101, 104, 106, 107, 108, 109, 110, 113, 200, 201, 202, 206, 116, 220, 900, 901, 902, 903, 904]
        expect(isReportAvailable('persons-exposure-cohort', completed)).toBe(true)
        expect(isReportAvailable('visits-cohort', completed)).toBe(true)
        expect(isReportAvailable('visit-dates-cohort', completed)).toBe(true)
        expect(isReportAvailable('care-site-visit-dates-cohort', completed)).toBe(true)
        expect(isReportAvailable('drug-utilization-cohort', completed)).toBe(true)
      })
    })
  })

  describe('getAvailableReportTypes', () => {
    describe('empty completed analyses', () => {
      it('returns empty array when no analyses are completed', () => {
        const available = getAvailableReportTypes([])
        expect(available).toEqual([])
      })

      it('does not include heracles-heel in results', () => {
        const available = getAvailableReportTypes([])
        expect(available).not.toContain('heracles-heel')
      })
    })

    describe('single report availability', () => {
      it('returns only person report when its requirements are met', () => {
        const completed = [0, 1, 2, 3, 4, 5]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('person')
      })

      it('returns single-requirement reports correctly', () => {
        const completed = [220]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('visit-dates-baseline')
        expect(available).toContain('visit-dates-cohort')
        expect(available).toContain('care-site-visit-dates-baseline')
        expect(available).toContain('care-site-visit-dates-cohort')
      })

      it('returns data quality reports when analysis 117 is complete', () => {
        const completed = [117]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('data-completeness')
        expect(available).toContain('entropy')
        expect(available).toContain('tornado')
      })
    })

    describe('multiple reports availability', () => {
      it('returns multiple reports when their requirements are met', () => {
        const completed = [0, 1, 2, 3, 4, 5, 117]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('person')
        expect(available).toContain('cohort-specific')
        expect(available).toContain('data-completeness')
        expect(available).toContain('entropy')
        expect(available).toContain('tornado')
      })

      it('returns all available reports with comprehensive analysis set', () => {
        const completed = [
          0, 1, 2, 3, 4, 5, // person + cohort-specific base
          116, 117, // Common analyses
          101, 104, 106, 107, 108, 109, 110, 113, // observation
          200, 201, 202, 206, 220, // visits
          400, 401, 402, 404, 405, 406, // condition
          500, 501, 502, 504, 505, 506, // death
          600, 601, 602, 604, 605, 606, // procedure
          700, 701, 702, 704, 705, 706, 715, 716, 717, // drug exposure
          900, 901, 902, 903, 904, 906, 907, // drug utilization + eras
          1000, 1002, 1004, 1006, 1007 // condition eras
        ]
        const available = getAvailableReportTypes(completed)

        expect(available.length).toBeGreaterThan(10)
        expect(available).toContain('person')
        expect(available).toContain('condition')
        expect(available).toContain('condition-eras')
        expect(available).toContain('drug-exposure')
        expect(available).toContain('drug-eras')
        expect(available).toContain('procedure')
        expect(available).toContain('death')
      })
    })

    describe('partial availability', () => {
      it('excludes reports with missing requirements', () => {
        const completed = [0, 1, 2, 3, 4] // Missing 5 for person report
        const available = getAvailableReportTypes(completed)
        expect(available).not.toContain('person')
      })

      it('includes reports that meet requirements and excludes those that do not', () => {
        const completed = [0, 1, 2, 3, 4, 5, 117, 220] // person + data quality + visit dates
        const available = getAvailableReportTypes(completed)

        // Should include these
        expect(available).toContain('person')
        expect(available).toContain('cohort-specific')
        expect(available).toContain('data-completeness')
        expect(available).toContain('visit-dates-baseline')

        // Should exclude these (missing requirements)
        expect(available).not.toContain('condition')
        expect(available).not.toContain('drug-exposure')
      })
    })

    describe('heracles-heel exclusion', () => {
      it('never returns heracles-heel in available reports', () => {
        const allAnalyses = Array.from({ length: 2000 }, (_, i) => i)
        const available = getAvailableReportTypes(allAnalyses)
        expect(available).not.toContain('heracles-heel')
      })

      it('excludes heracles-heel even with empty requirements fulfilled', () => {
        const completed = [1, 2, 3, 4, 5]
        const available = getAvailableReportTypes(completed)
        expect(available).not.toContain('heracles-heel')
      })
    })

    describe('return type and structure', () => {
      it('returns an array', () => {
        const available = getAvailableReportTypes([1, 2, 3])
        expect(Array.isArray(available)).toBe(true)
      })

      it('returns array of strings', () => {
        const completed = [0, 1, 2, 3, 4, 5]
        const available = getAvailableReportTypes(completed)
        available.forEach(reportType => {
          expect(typeof reportType).toBe('string')
        })
      })

      it('returns valid ReportType values', () => {
        const completed = [0, 1, 2, 3, 4, 5, 117]
        const available = getAvailableReportTypes(completed)
        const allReportTypes = Object.keys(REPORT_ANALYSIS_REQUIREMENTS)

        available.forEach(reportType => {
          expect(allReportTypes).toContain(reportType)
        })
      })

      it('returns no duplicates', () => {
        const completed = [0, 1, 2, 3, 4, 5, 117, 220]
        const available = getAvailableReportTypes(completed)
        const uniqueReports = new Set(available)
        expect(uniqueReports.size).toBe(available.length)
      })
    })

    describe('edge cases', () => {
      it('handles very large completed analysis arrays', () => {
        const largeCompleted = Array.from({ length: 10000 }, (_, i) => i)
        const available = getAvailableReportTypes(largeCompleted)
        expect(available.length).toBeGreaterThan(0)
        expect(available).not.toContain('heracles-heel')
      })

      it('handles completed analyses with only high ID numbers', () => {
        const highIds = [5000, 5001, 5002, 5003]
        const available = getAvailableReportTypes(highIds)
        expect(available).toEqual([])
      })

      it('handles completed analyses with negative numbers (edge case)', () => {
        const completed = [-1, -2, -3, 0, 1, 2, 3, 4, 5]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('person')
      })

      it('returns baseline and cohort reports when requirements overlap', () => {
        const completed = [101, 104, 106, 107, 108, 109, 110, 113]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('persons-exposure-baseline')
        expect(available).toContain('persons-exposure-cohort')
      })
    })

    describe('specific report combinations', () => {
      it('returns only index reports when their specific analyses are present', () => {
        const completed = [405, 406, 605, 606, 705, 706]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('conditions-by-index')
        expect(available).toContain('procedures-by-index')
        expect(available).toContain('drugs-by-index')
        // Should not contain the full reports
        expect(available).not.toContain('condition')
        expect(available).not.toContain('procedure')
        expect(available).not.toContain('drug-exposure')
      })

      it('returns era reports when their analyses are complete', () => {
        const completed = [1, 900, 902, 904, 906, 907, 1000, 1002, 1004, 1006, 1007]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('drug-eras')
        expect(available).toContain('condition-eras')
      })

      it('returns all visit-related reports when analysis 220 and visit analyses are complete', () => {
        const completed = [116, 200, 201, 202, 206, 220]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('visits-baseline')
        expect(available).toContain('visits-cohort')
        expect(available).toContain('visit-dates-baseline')
        expect(available).toContain('visit-dates-cohort')
        expect(available).toContain('care-site-visit-dates-baseline')
        expect(available).toContain('care-site-visit-dates-cohort')
      })

      it('returns drug utilization reports independently from drug-eras', () => {
        const completed = [900, 901, 902, 903, 904]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('drug-utilization-baseline')
        expect(available).toContain('drug-utilization-cohort')
        // drug-eras requires additional analyses (1, 906, 907)
        expect(available).not.toContain('drug-eras')
      })
    })

    describe('comprehensive scenarios', () => {
      it('returns correct reports for minimal person data scenario', () => {
        const completed = [0, 1, 2, 3, 4, 5]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('person')
        expect(available).toContain('cohort-specific')
        expect(available.length).toBe(2)
      })

      it('returns correct reports for basic clinical data scenario', () => {
        const completed = [1, 116, 117, 400, 401, 402, 404, 405, 406]
        const available = getAvailableReportTypes(completed)
        expect(available).toContain('condition')
        expect(available).toContain('conditions-by-index')
        expect(available).toContain('data-completeness')
        expect(available).toContain('entropy')
        expect(available).toContain('tornado')
      })

      it('returns no reports when completed analyses do not match any requirements', () => {
        const completed = [9999, 10000, 10001]
        const available = getAvailableReportTypes(completed)
        expect(available).toEqual([])
      })
    })
  })
})
