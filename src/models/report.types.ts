/**
 * Report Data Types and Interfaces
 * Feature: 005-cohort-reports
 *
 * This file defines all TypeScript interfaces for the cohort reporting feature,
 * including report configurations, data structures, and WebAPI response formats.
 */

import { z } from 'zod'

/**
 * Report type identifier - matches OHDSI Atlas report types
 */
export type ReportType =
  | 'person'
  | 'condition-eras'
  | 'drug-eras'
  | 'cohort-specific'
  | 'procedure'
  | 'condition'
  | 'conditions-by-index'
  | 'death'
  | 'drug-exposure'
  | 'drugs-by-index'
  | 'observation-periods'
  | 'procedures-by-index'
  | 'data-completeness'
  | 'entropy'
  | 'tornado'
  | 'persons-exposure-baseline'
  | 'persons-exposure-cohort'
  | 'visits-baseline'
  | 'visit-dates-baseline'
  | 'care-site-visit-dates-baseline'
  | 'visits-cohort'
  | 'visit-dates-cohort'
  | 'care-site-visit-dates-cohort'
  | 'drug-utilization-baseline'
  | 'drug-utilization-cohort'
  | 'heracles-heel'

/**
 * Report action button types (trigger batch jobs)
 */
export type ReportAction = 'full-analysis' | 'quick-analysis' | 'utilization'

/**
 * Report metadata and configuration
 */
export interface ReportConfig {
  type: ReportType
  label: string
  description: string
  hasTable: boolean
  hasTreemap: boolean
  sections: ReportSection[]
}

export interface ReportSection {
  id: string
  title: string
  type: 'chart' | 'table' | 'mixed'
  helpText?: string
}

// ============================================================================
// Person Report (Demographics)
// ============================================================================

export interface PersonReport {
  yearOfBirth: YearOfBirthData[]
  demographics: {
    gender: DemographicData[]
    race: DemographicData[]
    ethnicity: DemographicData[]
  }
}

export interface YearOfBirthData {
  year: number
  count: number
}

export interface DemographicData {
  conceptId: number
  conceptName: string
  count: number
  percentage: number
}

// Zod schemas for validation
export const YearOfBirthDataSchema = z.object({
  year: z.number(),
  count: z.number()
})

export const DemographicDataSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  count: z.number(),
  percentage: z.number()
})

export const PersonReportSchema = z.object({
  yearOfBirth: z.array(YearOfBirthDataSchema),
  demographics: z.object({
    gender: z.array(DemographicDataSchema),
    race: z.array(DemographicDataSchema),
    ethnicity: z.array(DemographicDataSchema)
  })
})

// ============================================================================
// Condition Eras Report
// ============================================================================

export interface ConditionErasReport {
  prevalence: ConditionEraData[]
  treemapData?: TreemapNode[]
}

export interface ConditionEraData {
  conceptId: number
  conceptName: string
  soc?: string  // System Organ Class
  hlt?: string  // High Level Term
  personCount: number
  prevalence: number  // Percentage (0-100)
  averageDuration: number  // Days
}

export const ConditionEraDataSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  soc: z.string().optional(),
  hlt: z.string().optional(),
  personCount: z.number(),
  prevalence: z.number(),
  averageDuration: z.number()
})

export const ConditionErasReportSchema = z.object({
  prevalence: z.array(ConditionEraDataSchema),
  treemapData: z.array(z.any()).optional()
})

// ============================================================================
// Condition Occurrence Report
// ============================================================================

export interface ConditionReport {
  prevalence: ConditionData[]
}

export interface ConditionData {
  conceptId: number
  conceptName: string
  recordsPerPerson?: number
  personCount: number
  prevalence: number  // Percentage (0-100)
}

export const ConditionDataSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  recordsPerPerson: z.number().optional(),
  personCount: z.number(),
  prevalence: z.number()
})

export const ConditionReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Conditions by Index Report (T080)
// ============================================================================

export interface ConditionsByIndexReport {
  prevalence: ConditionData[]
}

export type WebAPIConditionsByIndexRaw = WebAPIConditionRaw

export const ConditionsByIndexReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Death Report (T081)
// ============================================================================

export interface DeathReport {
  prevalence: ConditionData[]
}

export type WebAPIDeathRaw = WebAPIConditionRaw

export const DeathReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Drug Exposure Report (T082)
// ============================================================================

export interface DrugExposureReport {
  prevalence: ConditionData[]
}

export type WebAPIDrugExposureRaw = WebAPIConditionRaw

export const DrugExposureReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Drugs by Index Report (T083)
// ============================================================================

export interface DrugsByIndexReport {
  prevalence: ConditionData[]
}

export type WebAPIDrugsByIndexRaw = WebAPIConditionRaw

export const DrugsByIndexReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Observation Periods Report (T084)
// ============================================================================

export interface ObservationPeriodsReport {
  prevalence: ConditionData[]
}

export type WebAPIObservationPeriodsRaw = WebAPIConditionRaw

export const ObservationPeriodsReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Procedure Report (T085)
// ============================================================================

export interface ProcedureReport {
  prevalence: ConditionData[]
}

export type WebAPIProcedureRaw = WebAPIConditionRaw

export const ProcedureReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Procedures by Index Report (T086)
// ============================================================================

export interface ProceduresByIndexReport {
  prevalence: ConditionData[]
}

export type WebAPIProceduresByIndexRaw = WebAPIConditionRaw

export const ProceduresByIndexReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Data Completeness Report (T087)
// ============================================================================

export interface DataCompletenessReport {
  prevalence: ConditionData[]
}

export type WebAPIDataCompletenessRaw = WebAPIConditionRaw

export const DataCompletenessReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Entropy Report (T088)
// ============================================================================

export interface EntropyReport {
  prevalence: ConditionData[]
}

export type WebAPIEntropyRaw = WebAPIConditionRaw

export const EntropyReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Tornado Report (T089)
// ============================================================================

export interface TornadoReport {
  prevalence: ConditionData[]
}

export type WebAPITornadoRaw = WebAPIConditionRaw

export const TornadoReportSchema = z.object({
  prevalence: z.array(ConditionDataSchema)
})

// ============================================================================
// Drug Eras Report
// ============================================================================

export interface DrugErasReport {
  prevalence: DrugEraData[]
  treemapData?: TreemapNode[]
}

export interface DrugEraData {
  conceptId: number
  conceptName: string
  atc1?: string  // ATC Level 1
  atc4?: string  // ATC Level 4
  ingredient: string
  personCount: number
  prevalence: number
  averageDuration: number
}

export const DrugEraDataSchema = z.object({
  conceptId: z.number(),
  conceptName: z.string(),
  atc1: z.string().optional(),
  atc4: z.string().optional(),
  ingredient: z.string(),
  personCount: z.number(),
  prevalence: z.number(),
  averageDuration: z.number()
})

export const DrugErasReportSchema = z.object({
  prevalence: z.array(DrugEraDataSchema),
  treemapData: z.array(z.any()).optional()
})

// ============================================================================
// Cohort Specific Report
// ============================================================================

export interface CohortSpecificReport {
  prevalenceByMonth: PrevalenceByMonthData[]
  cohortStart: CohortStartData
  personsInCohort: PersonsInCohortData[]
  durationDistribution: DurationDistributionData[]
  ageDistribution: AgeDistributionData[]
}

export interface PrevalenceByMonthData {
  date: string  // YYYY-MM format
  prevalence: number  // Per 1000 people
}

export interface CohortStartData {
  startDate: string
  endDate: string
  totalPersons: number
}

export interface PersonsInCohortData {
  dayOffset: number  // Days from cohort start (30-day increments)
  personCount: number
}

export interface DurationDistributionData {
  days: number
  percentOfPopulation: number
}

export interface AgeDistributionData {
  age: number
  count: number
  gender?: 'MALE' | 'FEMALE'
}

// ============================================================================
// Chart Data Formats (ECharts-compatible)
// ============================================================================

export interface BarChartData {
  categories: string[]  // X-axis labels
  values: number[]      // Y-axis values
  unit?: string         // Unit label (e.g., "People", "Count")
}

export interface PieChartData {
  name: string
  value: number
}

export interface LineChartData {
  xAxis: string[] | number[]
  yAxis: number[]
  seriesName?: string
}

export interface TreemapNode {
  name: string
  value: number
  children?: TreemapNode[]
  itemStyle?: {
    color?: string
  }
}

// ============================================================================
// Table Data Formats
// ============================================================================

export interface TableData {
  headers: TableHeader[]
  rows: TableRow[]
  totalRows: number
}

export interface TableHeader {
  key: string
  title: string
  sortable: boolean
  align?: 'start' | 'end' | 'center'
  width?: string | number
}

export interface TableRow {
  [key: string]: string | number | null | undefined
}

/**
 * Condition Eras table-specific row type
 */
export interface ConditionErasTableRow {
  conceptId: number
  soc: string
  hlt: string
  snomed: string
  personCount: number
  prevalence: string  // Formatted percentage
  lengthOfEra: number
}

/**
 * Drug Eras table-specific row type
 */
export interface DrugErasTableRow {
  conceptId: number
  atc1: string
  atc4: string
  ingredient: string
  personCount: number
  prevalence: string
  lengthOfEra: number
}

// ============================================================================
// Persons Exposure Reports (Baseline and Cohort)
// ============================================================================

export interface PersonsExposureReport {
  prevalence: PersonsExposureData[]
}

export interface PersonsExposureData {
  conceptId: number
  conceptName: string
  personCount: number
  prevalence: number  // Percentage (0-100)
  recordsPerPerson?: number
}

export type WebAPIPersonsExposureRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  lengthOfEra: number
  percentPersonsBefore: number
  percentPersonsAfter: number
  riskDiffAfterBefore: number
  logRRAfterBefore: number
  countValue: number
}>

// ============================================================================
// Visits Reports (Baseline and Cohort)
// ============================================================================

export interface VisitsReport {
  prevalence: VisitsData[]
}

export interface VisitsData {
  conceptId: number
  conceptName: string
  personCount: number
  prevalence: number  // Percentage (0-100)
  recordsPerPerson?: number
}

export type WebAPIVisitsRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  lengthOfEra: number
  percentPersonsBefore: number
  percentPersonsAfter: number
  riskDiffAfterBefore: number
  logRRAfterBefore: number
  countValue: number
}>

// ============================================================================
// Visit Dates Reports (Baseline and Cohort)
// ============================================================================

export interface VisitDatesReport {
  data: VisitDatesData[]
}

export interface VisitDatesData {
  date: string
  visitCount: number
  personCount: number
}

export type WebAPIVisitDatesRaw = Array<{
  xCalendarDate: string
  yRecordCount: number
  seriesName?: string
}>

// ============================================================================
// Care Site Visit Dates Reports (Baseline and Cohort)
// ============================================================================

export interface CareSiteVisitDatesReport {
  data: CareSiteVisitDatesData[]
}

export interface CareSiteVisitDatesData {
  careSiteId: number
  careSiteName: string
  visitCount: number
  personCount: number
}

export type WebAPICareSiteVisitDatesRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  countValue: number
}>

// ============================================================================
// Drug Utilization Reports (Baseline and Cohort)
// ============================================================================

export interface DrugUtilizationReport {
  prevalence: DrugUtilizationData[]
}

export interface DrugUtilizationData {
  conceptId: number
  conceptName: string
  personCount: number
  prevalence: number  // Percentage (0-100)
  recordsPerPerson?: number
}

export type WebAPIDrugUtilizationRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  lengthOfEra: number
  percentPersonsBefore: number
  percentPersonsAfter: number
  riskDiffAfterBefore: number
  logRRAfterBefore: number
  countValue: number
}>

// ============================================================================
// Heracles Heel Report (Data Quality)
// ============================================================================

export interface HeraclesHeelReport {
  results: HeraclesHeelData[]
}

export interface HeraclesHeelData {
  analysisId: number
  analysisName: string
  heelRule: string
  recordCount: number
  severity: 'ERROR' | 'WARNING' | 'NOTIFICATION'
}

export type WebAPIHeraclesHeelRaw = Array<{
  analysisId: number
  analysisName: string
  heelRule: string
  recordCount: number
  severityLevel: string
}>

// ============================================================================
// Export Data Formats
// ============================================================================

export interface CSVExportData {
  headers: string[]
  rows: (string | number)[][]
  filename: string
}

export interface ChartExportOptions {
  type: 'png' | 'svg'
  filename: string
  backgroundColor?: string
  pixelRatio?: number  // For PNG export (2x for high-DPI)
}

// ============================================================================
// WebAPI Response Mapping
// ============================================================================

/**
 * WebAPI Raw Response Types (actual OHDSI WebAPI structure)
 * These represent the exact structure returned by OHDSI WebAPI endpoints
 */

/**
 * Raw person report response from /cohortresults/{sourceKey}/{cohortId}/person
 */
export interface WebAPIPersonRaw {
  yearOfBirth: Array<{
    intervalIndex: number
    percentValue: number
    countValue: number
  }>
  gender: Array<{
    conceptId: number
    conceptName: string
    countValue: number
    conditionConceptName: string | null
    conditionConceptId: number
    observationConceptName: string | null
    observationConceptId: number
  }>
  race: Array<{
    conceptId: number
    conceptName: string
    countValue: number
    conditionConceptName: string | null
    conditionConceptId: number
    observationConceptName: string | null
    observationConceptId: number
  }>
  ethnicity: Array<{
    conceptId: number
    conceptName: string
    countValue: number
    conditionConceptName: string | null
    conditionConceptId: number
    observationConceptName: string | null
    observationConceptId: number
  }>
}

/**
 * Raw condition era response from /cohortresults/{sourceKey}/{cohortId}/conditionera
 */
export type WebAPIConditionEraRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  lengthOfEra: number
  percentPersonsBefore: number
  percentPersonsAfter: number
  riskDiffAfterBefore: number
  logRRAfterBefore: number
  countValue: number
}>

/**
 * Raw condition response from /cohortresults/{sourceKey}/{cohortId}/condition
 * Same structure as ConditionEraRaw but for individual condition occurrences
 */
export type WebAPIConditionRaw = WebAPIConditionEraRaw

/**
 * Raw drug era response from /cohortresults/{sourceKey}/{cohortId}/drugera
 */
export type WebAPIDrugEraRaw = Array<{
  conceptId: number
  conceptPath: string
  recordsPerPerson: number
  percentPersons: number
  numPersons: number
  lengthOfEra: number
  percentPersonsBefore: number
  percentPersonsAfter: number
  riskDiffAfterBefore: number
  logRRAfterBefore: number
  countValue: number
}>

/**
 * Raw cohort specific response from /cohortresults/{sourceKey}/{cohortId}/cohortspecific
 */
export interface WebAPICohortSpecificRaw {
  prevalenceByMonth: Array<{
    xCalendarMonth: string
    yPrevalence1000Pp: number
  }>
  ageAtIndexDistribution: Array<{
    intervalIndex: number
    percentValue: number
    countValue: number
  }>
  personsByDurationFromStartToEnd: Array<{
    intervalIndex: number
    percentValue: number
    countValue: number
  }>
  personsInCohortFromCohortStartToEnd?: Array<{
    xCalendarMonth: string
    yRecordCount: number
  }>
  distributionAgeCohortStartByGender?: Array<{
    category: string
    minValue: number
    maxValue: number
    avgValue: number
    stdevValue: number
    medianValue: number
    p10Value: number
    p25Value: number
    p75Value: number
    p90Value: number
  }>
  [key: string]: unknown
}

/**
 * WebAPI report response structure (from OHDSI WebAPI)
 */
export interface WebAPIReportResponse {
  summary: {
    cohortId: number
    sourceKey: string
    totalPersons: number
    generatedDate: string
  }
  person?: {
    yearOfBirth: Array<{ year: number; count: number }>
    gender: Array<{ conceptId: number; conceptName: string; count: number; percentage: number }>
    race: Array<{ conceptId: number; conceptName: string; count: number; percentage: number }>
    ethnicity: Array<{ conceptId: number; conceptName: string; count: number; percentage: number }>
  }
  conditionEra?: {
    prevalence: Array<{
      conceptId: number
      conceptName: string
      soc?: string
      hlt?: string
      personCount: number
      prevalence: number
      averageDuration: number
    }>
  }
  drugEra?: {
    prevalence: Array<{
      conceptId: number
      conceptName: string
      ingredientConceptId: number
      ingredient: string
      atc1?: string
      atc4?: string
      personCount: number
      prevalence: number
      averageDuration: number
    }>
  }
  cohortSpecific?: {
    prevalenceByMonth: Array<{ date: string; prevalence: number }>
    ageDistribution: Array<{ age: number; count: number; gender?: string }>
    durationDistribution: Array<{ days: number; count: number }>
  }
}

// Zod schema for WebAPI response validation
export const WebAPIReportResponseSchema = z.object({
  summary: z.object({
    cohortId: z.number(),
    sourceKey: z.string(),
    totalPersons: z.number(),
    generatedDate: z.string()
  }).optional(),
  person: z.object({
    yearOfBirth: z.array(z.object({
      year: z.number(),
      count: z.number()
    })),
    gender: z.array(z.object({
      conceptId: z.number(),
      conceptName: z.string(),
      count: z.number(),
      percentage: z.number()
    })),
    race: z.array(z.object({
      conceptId: z.number(),
      conceptName: z.string(),
      count: z.number(),
      percentage: z.number()
    })),
    ethnicity: z.array(z.object({
      conceptId: z.number(),
      conceptName: z.string(),
      count: z.number(),
      percentage: z.number()
    }))
  }).optional(),
  conditionEra: z.object({
    prevalence: z.array(z.object({
      conceptId: z.number(),
      conceptName: z.string(),
      soc: z.string().optional(),
      hlt: z.string().optional(),
      personCount: z.number(),
      prevalence: z.number(),
      averageDuration: z.number()
    }))
  }).optional(),
  drugEra: z.object({
    prevalence: z.array(z.object({
      conceptId: z.number(),
      conceptName: z.string(),
      ingredientConceptId: z.number(),
      ingredient: z.string(),
      atc1: z.string().optional(),
      atc4: z.string().optional(),
      personCount: z.number(),
      prevalence: z.number(),
      averageDuration: z.number()
    }))
  }).optional(),
  cohortSpecific: z.object({
    prevalenceByMonth: z.array(z.object({
      date: z.string(),
      prevalence: z.number()
    })),
    ageDistribution: z.array(z.object({
      age: z.number(),
      count: z.number(),
      gender: z.string().optional()
    })),
    durationDistribution: z.array(z.object({
      days: z.number(),
      count: z.number()
    }))
  }).optional()
})

// ============================================================================
// Pinia Store State
// ============================================================================

/**
 * Reports Pinia Store State
 */
export interface ReportsState {
  // Current report selection
  currentReportType: ReportType | null
  currentSourceKey: string | null
  currentCohortId: number | null

  // Report data cache (key: "{cohortId}-{sourceKey}-{reportType}")
  reportData: Map<string, ReportData>

  // Loading states
  loading: boolean
  loadingSection: string | null

  // Error states
  error: string | null
  sectionErrors: Map<string, string>

  // UI state
  selectedAction: ReportAction | null
}

/**
 * Generic report data container with cache metadata
 */
export interface ReportData {
  type: ReportType
  cohortId: number
  sourceKey: string
  fetchedAt: Date
  data: PersonReport | ConditionErasReport | ConditionReport | DrugErasReport | CohortSpecificReport | PersonsExposureReport | VisitsReport | VisitDatesReport | CareSiteVisitDatesReport | DrugUtilizationReport | HeraclesHeelReport | ConditionsByIndexReport | DeathReport | DrugExposureReport | DrugsByIndexReport | ObservationPeriodsReport | ProcedureReport | ProceduresByIndexReport | DataCompletenessReport | EntropyReport | TornadoReport
}
