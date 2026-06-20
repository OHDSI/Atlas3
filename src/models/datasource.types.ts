/**
 * Data Source Type Definitions
 */
import { z } from 'zod'
import type { BoxPlotData, TrellisChartData } from '@/models/report.types'

// Core Entities

export type DaimonType = 'CDM' | 'Vocabulary' | 'Results' | 'Temp' | 'CEM' | 'CEMResults'

export const DAIMON_TYPES: DaimonType[] = [
  'CDM',
  'Vocabulary',
  'Results',
  'CEM',
  'CEMResults',
  'Temp',
]

export interface Daimon {
  sourceDaimonId: number
  daimonType: DaimonType
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

// CRUD Request/Response Types

export interface DaimonRequest {
  daimonType: DaimonType
  tableQualifier: string
  priority?: number
}

export interface SourceRequest {
  name: string
  dialect: string
  key: string
  connectionString: string
  username?: string
  password?: string
  daimons?: DaimonRequest[]
  keyfileName?: string
  krbAuthMethod?: 'PASSWORD' | 'KEYTAB' | 'DEFAULT'
  krbAdminServer?: string
  checkConnection?: boolean
}

export interface SourceDetails extends DataSource {
  connectionString: string
  username?: string
  password?: string
  keyfileName?: string
  krbAuthMethod?: string
  krbAdminServer?: string
}

// Supported Database Dialects
export const SUPPORTED_DIALECTS = [
  { value: 'POSTGRESQL', label: 'PostgreSQL' },
  { value: 'SQL_SERVER', label: 'SQL Server' },
  { value: 'ORACLE', label: 'Oracle' },
  { value: 'REDSHIFT', label: 'Amazon Redshift' },
  { value: 'BIGQUERY', label: 'Google BigQuery' },
  { value: 'IMPALA', label: 'Impala' },
  { value: 'PDW', label: 'Microsoft PDW' },
  { value: 'NETEZZA', label: 'IBM Netezza' },
  { value: 'HIVE', label: 'Hive LLAP' },
  { value: 'SPARK', label: 'Spark' },
  { value: 'SNOWFLAKE', label: 'Snowflake' },
  { value: 'SYNAPSE', label: 'Azure Synapse' },
] as const

export type DialectValue = (typeof SUPPORTED_DIALECTS)[number]['value']

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
  death: 'Death',
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

export interface HistogramChartData {
  intervalSize: number
  offset: number
  bins: Array<{
    intervalIndex: number
    countValue: number
  }>
  unit?: string
  seriesName?: string
  /** Label for the value (x) axis and tooltip prefix, e.g. 'Age', 'Year of Birth', 'Days'. */
  xAxisLabel?: string
}

export interface LineChartData {
  categories: string[]
  monthCodes?: (number | string)[]
  xValues?: number[]
  series: Array<{
    name: string
    data: number[]
  }>
  xAxisLabel?: string
  yAxisLabel?: string
}

export interface MultiLineChartData {
  categories?: string[]
  xAxisType?: 'category' | 'value' | 'time'
  monthCodes?: (number | string)[]
  xValues?: number[]
  xAxisLabel?: string
  series: Array<{
    name: string
    data: number[]
  }>
}

export interface TreemapNode {
  name: string
  /** Drives the rectangle area (size). Typically personCount. */
  value: number
  /**
   * Drives the rectangle colour (separate from size). Atlas 2.15
   * encodes magnitude by recordsPerPerson on the colour channel —
   * not the area, which encodes prevalence. Optional: when missing,
   * the colour falls back to `value`.
   */
  colorValue?: number
  conceptId?: number
  conceptPath?: string
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
  ageDistribution: HistogramChartData
  cumulativeObservation: LineChartData
  observationByMonth: LineChartData
}

export interface DataDensityReport {
  totalRecords: MultiLineChartData
  recordsPerPerson: MultiLineChartData
  conceptsPerPerson: BoxPlotData[]
}

export interface PersonReport {
  yearOfBirth: HistogramChartData
  gender: PieChartData[]
  race: PieChartData[]
  ethnicity: PieChartData[]
}

export interface ObservationPeriodReport {
  ageAtFirst?: HistogramChartData
  observationLength?: HistogramChartData
  cumulativeObservation?: MultiLineChartData
  observedByMonth?: MultiLineChartData
  ageByGender?: BoxPlotData[]
  durationByGender?: BoxPlotData[]
  durationByAgeDecile?: BoxPlotData[]
  personsWithContinuousObsByYear?: { categories: string[]; values: number[] }
  observationPeriodsPerPerson?: PieChartData[]
}

export interface DeathReport {
  ageAtDeath: BoxPlotData[]
  deathByType: PieChartData[]
  prevalenceByMonth?: MultiLineChartData
  prevalenceByGenderAgeYear?: TrellisChartData
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
  priority: z.number().int(),
})

export const DataSourceSchema = z.object({
  sourceId: z.number().int().positive(),
  sourceName: z.string().min(1),
  sourceKey: z.string().min(1),
  sourceDialect: z.string(),
  daimons: z.array(DaimonSchema),
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
  'death',
])

export const PieChartDataSchema = z.object({
  name: z.string(),
  value: z.number().nonnegative(),
})

export const BarChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number()),
    })
  ),
  unit: z.string().optional(),
})

export const HistogramChartDataSchema = z.object({
  intervalSize: z.number().positive(),
  offset: z.number(),
  bins: z.array(
    z.object({
      intervalIndex: z.number(),
      countValue: z.number().nonnegative(),
    })
  ),
  unit: z.string().optional(),
  seriesName: z.string().optional(),
  xAxisLabel: z.string().optional(),
})

export const LineChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number()),
    })
  ),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
})

export const MultiLineChartDataSchema = z.object({
  categories: z.array(z.string()),
  series: z.array(
    z.object({
      name: z.string(),
      data: z.array(z.number()),
    })
  ),
})

export const TreemapNodeSchema: z.ZodType<TreemapNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    value: z.number().positive(),
    itemStyle: z
      .object({
        color: z.string().optional(),
        colorAlpha: z.number().min(0).max(1).optional(),
      })
      .optional(),
    children: z.array(TreemapNodeSchema).optional(),
  })
)

export const DashboardReportSchema = z.object({
  summary: z.object({
    sourceName: z.string(),
    personCount: z.number().int().nonnegative(),
  }),
  genderDistribution: z.array(PieChartDataSchema),
  ageDistribution: HistogramChartDataSchema,
  cumulativeObservation: LineChartDataSchema,
  observationByMonth: LineChartDataSchema,
})

export const BoxPlotDataArraySchema = z.array(
  z.object({
    category: z.string(),
    min: z.number(),
    p10: z.number(),
    p25: z.number(),
    median: z.number(),
    p75: z.number(),
    p90: z.number(),
    max: z.number(),
  })
)

export const DataDensityReportSchema = z.object({
  totalRecords: MultiLineChartDataSchema,
  recordsPerPerson: MultiLineChartDataSchema,
  conceptsPerPerson: BoxPlotDataArraySchema,
})

export const PersonReportSchema = z.object({
  yearOfBirth: HistogramChartDataSchema,
  gender: z.array(PieChartDataSchema),
  race: z.array(PieChartDataSchema),
  ethnicity: z.array(PieChartDataSchema),
})

export const PrevalenceTableRowSchema = z.object({
  conceptId: z.number().int().positive(),
  conceptName: z.string().min(1),
  personCount: z.number().int().nonnegative(),
  prevalence: z.number().min(0).max(100),
  metric: z.number().nonnegative(),
})

export const PrevalenceDataSchema = z.object({
  treemapNodes: z.array(TreemapNodeSchema),
  tableRows: z.array(PrevalenceTableRowSchema),
  totalCount: z.number().int().nonnegative(),
})

export const ClinicalDomainReportSchema = z.object({
  prevalenceData: PrevalenceDataSchema,
})
