/**
 * Report Analysis Mapping
 * Maps report types to required Heracles analysis IDs
 * Based on OHDSI Atlas visualization packs
 */

import type { ReportType } from '@/models/report.types'

/**
 * Map of report types to required analysis IDs
 * A report is only available if ALL required analyses are completed
 */
export const REPORT_ANALYSIS_REQUIREMENTS: Record<ReportType, number[]> = {
  // Inclusion-rule (generation) report — derived from cohort generation,
  // not from Heracles analyses, so it has no analysis-id requirements.
  'inclusion-rule': [],

  // Person demographics
  'person': [0, 1, 2, 3, 4, 5],

  // Condition reports
  'condition': [116, 117, 400, 401, 402, 404, 405, 406, 1],
  'condition-eras': [1, 1000, 1002, 1004, 1006, 1007],
  'conditions-by-index': [405, 406],

  // Drug reports
  'drug-exposure': [700, 701, 706, 715, 705, 704, 116, 702, 117, 717, 716, 1],
  'drug-eras': [1, 900, 902, 904, 906, 907],
  'drugs-by-index': [705, 706],

  // Procedure reports
  'procedure': [606, 604, 116, 602, 117, 605, 600, 601, 1],
  'procedures-by-index': [605, 606],

  // Observation and health system
  'observation-periods': [101, 104, 106, 107, 108, 109, 110, 113, 1],
  'death': [501, 506, 505, 504, 502, 116, 117],

  // Cohort-specific analytics
  'cohort-specific': [0, 1, 2, 3, 4],

  // Data quality
  'heracles-heel': [], // Heracles Heel has its own flag, no specific analyses

  // Exposure reports (baseline period)
  'persons-exposure-baseline': [101, 104, 106, 107, 108, 109, 110, 113],
  'visits-baseline': [200, 201, 202, 206, 116],
  'visit-dates-baseline': [220],
  'care-site-visit-dates-baseline': [220],
  'drug-utilization-baseline': [900, 901, 902, 903, 904],

  // Exposure reports (cohort period)
  'persons-exposure-cohort': [101, 104, 106, 107, 108, 109, 110, 113],
  'visits-cohort': [200, 201, 202, 206, 116],
  'visit-dates-cohort': [220],
  'care-site-visit-dates-cohort': [220],
  'drug-utilization-cohort': [900, 901, 902, 903, 904],

  // Data quality reports
  'data-completeness': [117],
  'entropy': [117],
  'tornado': [117]
}

/**
 * Check if a report type has all required analyses completed
 */
export function isReportAvailable(
  reportType: ReportType,
  completedAnalyses: number[]
): boolean {
  // Heracles Heel should never appear in standard report selector
  // It has its own dedicated endpoint and handling
  if (reportType === 'heracles-heel') {
    return false
  }

  // Inclusion-rule report is always available once a cohort is generated; it
  // does not depend on Heracles analyses. The report component itself shows
  // an empty state if generation hasn't run yet.
  if (reportType === 'inclusion-rule') {
    return true
  }

  const required = REPORT_ANALYSIS_REQUIREMENTS[reportType]

  // If no requirements specified, require at least one completed analysis
  if (!required || required.length === 0) {
    return completedAnalyses.length > 0
  }

  // Check if all required analyses are in the completed list
  return required.every(analysisId => completedAnalyses.includes(analysisId))
}

/**
 * Filter report types to only those with completed data
 */
export function getAvailableReportTypes(
  completedAnalyses: number[]
): ReportType[] {
  return Object.keys(REPORT_ANALYSIS_REQUIREMENTS)
    .filter(reportType =>
      isReportAvailable(reportType as ReportType, completedAnalyses)
    ) as ReportType[]
}
