/**
 * Data Source Type Definitions
 * Feature: 006-datasources
 */
import { z } from 'zod'

// Core Entities

export interface Daimon {
  sourceDaimonId: number
  daimonType: 'CDM' | 'Vocabulary' | 'Results' | 'Temp' | 'CEM' | 'CEMResults'
  tableQualifier: string
  priority: number
}

export interface DataSource {
  sourceId: number
  sourceName: string
  sourceKey: string
  sourceDialect: string
  daimons: Daimon[]
}

// Report Types

export type ReportType =
  | 'dashboard'
  | 'datadensity'
  | 'person'
  | 'visit'
  | 'conditionOccurrence'
  | 'conditionEra'
  | 'procedure'
  | 'drugExposure'
  | 'drugEra'
  | 'measurement'
  | 'observation'
  | 'observationPeriod'
  | 'death'

// Display names mapping
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  dashboard: 'Dashboard',
  datadensity: 'Data Density',
  person: 'Person',
  visit: 'Visit',
  conditionOccurrence: 'Condition Occurrence',
  conditionEra: 'Condition Era',
  procedure: 'Procedure',
  drugExposure: 'Drug Exposure',
  drugEra: 'Drug Era',
  measurement: 'Measurement',
  observation: 'Observation',
  observationPeriod: 'Observation Period',
  death: 'Death'
}

// Chart Data Types

export interface PieChartData {
  name: string
  value: number
}

export interface BarChartData {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
  unit?: string
}

export interface LineChartData {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface MultiLineChartData {
  categories: string[]
  series: Array<{
    name: string
    data: number[]
  }>
}

export interface TreemapNode {
  name: string
  value: number
  itemStyle?: {
    color?: string
    colorAlpha?: number
  }
  children?: TreemapNode[]
}

// Report Types

export interface DashboardReport {
  summary: {
    sourceName: string
    personCount: number
  }
  genderDistribution: PieChartData[]
  ageDistribution: BarChartData
  cumulativeObservation: LineChartData
  observationByMonth: LineChartData
}

export interface DataDensityReport {
  totalRecords: MultiLineChartData
  recordsPerPerson: MultiLineChartData
  conceptsPerPerson: BarChartData
}

export interface DataDensityReport {
  totalRecords: MultiLineChartData
  recordsPerPerson: MultiLineChartData
  conceptsPerPerson: BarChartData
}

export interface PersonReport {
  yearOfBirth: BarChartData
  gender: PieChartData[]
  race: PieChartData[]
  ethnicity: PieChartData[]
}

export interface ObservationPeriodReport {
  ageAtFirst?: BarChartData
  observationLength?: BarChartData
  cumulativeObservation?: MultiLineChartData
  observedByMonth?: MultiLineChartData
  ageByGender?: MultiLineChartData
  durationByGender?: BarChartData
  observationLengthStats?: Array<{ attributeName: string; attributeValue: string }>
}

export interface AgeAtDeathStat {
  category: string
  conceptId: number
  p10Value: number
  p25Value: number
  p75Value: number
  p90Value: number
  minValue: number
  medianValue: number
  maxValue: number
}

export interface DeathReport {
  ageAtDeath: AgeAtDeathStat[]
  deathByType: PieChartData[]
  prevalenceByMonth?: MultiLineChartData
  prevalenceByGenderAgeYear?: MultiLineChartData
}

export interface PrevalenceTableRow {
  conceptId: number
  conceptName: string
  personCount: number
  prevalence: number
  metric: number
}

export interface PrevalenceData {
  treemapNodes: TreemapNode[]
  tableRows: PrevalenceTableRow[]
  totalCount: number
}

export interface ClinicalDomainReport {
  prevalenceData: PrevalenceData
}

// State Management

export interface DataSourcesState {
  sources: DataSource[]
  selectedSourceId: number | null
  selectedReportType: ReportType | null
  reportCache: Map<string, ReportData>
  loading: {
    sources: boolean
    report: boolean
  }
  error: {
    sources: string | null
    report: string | null
  }
}

export type ReportData =
  | { type: 'dashboard'; data: DashboardReport }
  | { type: 'datadensity'; data: DataDensityReport }
  | { type: 'person'; data: PersonReport }
  | { type: 'observationPeriod'; data: ObservationPeriodReport }
  | { type: 'death'; data: DeathReport }
  | { type: 'clinical'; data: ClinicalDomainReport }

// API Response Schemas

export interface ListSourcesResponse {
  sources: DataSource[]
}

export interface DashboardAPIResponse {
  summary: Array<{
    attributeName: string
    attributeValue: string
  }>
  gender: Array<{
    conceptName: string
    countValue: number
    percentValue: number
  }>
  ageAtFirstObservation: Array<{
    intervalIndex: number
    countValue: number
    percentValue: number
  }>
  cumulativeObservation: Array<{
    seriesName: string
    xLengthOfObservation: number
    yPercentPersons: number
  }>
  observedByMonth: Array<{
    monthYear: number
    countValue: number
    percentValue: number
  }>
}

export interface ClinicalDomainAPIResponse {
  conceptId: number
  conceptPath: string
  numPersons: number
  percentPersons: number
  recordsPerPerson?: number
  lengthOfEra?: number
}

// Zod Validation Schemas

export const DaimonSchema = z.object({
  sourceDaimonId: z.number().int().positive(),
  daimonType: z.enum(['CDM', 'Vocabulary', 'Results', 'Temp', 'CEM', 'CEMResults']),
  tableQualifier: z.string(),
  priority: z.number().int()
})

export const DataSourceSchema = z.object({
  sourceId: z.number().int().positive(),
  sourceName: z.string().min(1),
  sourceKey: z.string().min(1),
  sourceDialect: z.string(),
  daimons: z.array(DaimonSchema)
})

export const ReportTypeSchema = z.enum([
  'dashboard',
  'datadensity',
  'person',
  'visit',
  'conditionOccurrence',
  'conditionEra',
  'procedure',
  'drugExposure',
  'drugEra',
  'measurement',
  'observation',
  'observationPeriod',
  'death'
])

export const PieChartDataSchema = z.object({
  name: z.string(),
  value: z.number().nonnegative()
})

export const BarChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(z.object({
    name: z.string(),
    data: z.array(z.number())
  })),
  unit: z.string().optional()
})

export const LineChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(z.object({
    name: z.string(),
    data: z.array(z.number())
  })),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional()
})

export const MultiLineChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(z.object({
    name: z.string(),
    data: z.array(z.number())
  }))
})

export const TreemapNodeSchema: z.ZodType<TreemapNode> = z.lazy(() => 
  z.object({
    name: z.string(),
    value: z.number().positive(),
    itemStyle: z.object({
      color: z.string().optional(),
      colorAlpha: z.number().min(0).max(1).optional()
    }).optional(),
    children: z.array(TreemapNodeSchema).optional()
  })
)

export const DashboardReportSchema = z.object({
  summary: z.object({
    sourceName: z.string(),
    personCount: z.number().int().nonnegative()
  }),
  genderDistribution: z.array(PieChartDataSchema),
  ageDistribution: BarChartDataSchema,
  cumulativeObservation: LineChartDataSchema,
  observationByMonth: LineChartDataSchema
})

export const DataDensityReportSchema = z.object({
  totalRecords: MultiLineChartDataSchema,
  recordsPerPerson: MultiLineChartDataSchema,
  conceptsPerPerson: BarChartDataSchema
})

export const PersonReportSchema = z.object({
  yearOfBirth: BarChartDataSchema,
  gender: z.array(PieChartDataSchema),
  race: z.array(PieChartDataSchema),
  ethnicity: z.array(PieChartDataSchema)
})

export const PrevalenceTableRowSchema = z.object({
  conceptId: z.number().int().positive(),
  conceptName: z.string().min(1),
  personCount: z.number().int().nonnegative(),
  prevalence: z.number().min(0).max(100),
  metric: z.number().nonnegative()
})

export const PrevalenceDataSchema = z.object({
  treemapNodes: z.array(TreemapNodeSchema),
  tableRows: z.array(PrevalenceTableRowSchema),
  totalCount: z.number().int().nonnegative()
})

export const ClinicalDomainReportSchema = z.object({
  prevalenceData: PrevalenceDataSchema
})
