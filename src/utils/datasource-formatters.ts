/**
 * Data Source Formatters and Transformers
 */
import { logger } from '@/utils/logger'
import type {
  DashboardAPIResponse,
  DashboardReport,
  ClinicalDomainAPIResponse,
  PrevalenceData,
  TreemapNode,
  PrevalenceTableRow,
  BarChartData,
  PieChartData,
  LineChartData,
  ReportType
} from '@/models/datasource.types'

/**
 * Transform Dashboard API response to internal format
 */
export function transformDashboardReport(raw: DashboardAPIResponse): DashboardReport {
  const summary = {
    sourceName: raw.summary.find(s => s.attributeName === 'Source name')?.attributeValue || '',
    personCount: parseInt(raw.summary.find(s => s.attributeName === 'Number of persons')?.attributeValue || '0')
  }

  const genderDistribution: PieChartData[] = raw.gender.map(g => ({
    name: g.conceptName,
    value: g.countValue
  }))

  const ageDistribution: BarChartData = {
    categories: raw.ageAtFirstObservation.map(a => `${a.intervalIndex}`),
    series: [{
      name: 'Person Count',
      data: raw.ageAtFirstObservation.map(a => a.countValue)
    }]
  }

  const cumulativeObservation: LineChartData = {
    categories: raw.cumulativeObservation.map(c => c.xLengthOfObservation.toString()),
    series: [{
      name: 'Cumulative Observation',
      data: raw.cumulativeObservation.map(c => c.yPercentPersons)
    }],
    xAxisLabel: 'Days',
    yAxisLabel: 'Percent of Persons'
  }

  const observationByMonth: LineChartData = {
    categories: raw.observedByMonth.map(o => o.monthYear.toString()),
    series: [{
      name: 'Observation Count',
      data: raw.observedByMonth.map(o => o.countValue)
    }],
    xAxisLabel: 'Month',
    yAxisLabel: 'Count'
  }

  return {
    summary,
    genderDistribution,
    ageDistribution,
    cumulativeObservation,
    observationByMonth
  }
}

/**
 * Transform Clinical Domain API response to prevalence data
 */
export function transformClinicalDomainReport(
  raw: ClinicalDomainAPIResponse[],
  reportType: ReportType
): PrevalenceData {
  const isEra = isEraReport(reportType)
  const AGGREGATION_THRESHOLD = 10000
  
  // For very large datasets, aggregate less significant entries
  let processedRaw = raw
  if (raw.length > AGGREGATION_THRESHOLD) {
    logger.info('Transformer', `Large dataset detected (${raw.length} entries), aggregating nodes`)
    // Keep top 1000 by prevalence, aggregate rest as "Other"
    const sorted = [...raw].sort((a, b) => b.percentPersons - a.percentPersons)
    const top = sorted.slice(0, 1000)
    const rest = sorted.slice(1000)
    
    if (rest.length > 0) {
      const otherNode: ClinicalDomainAPIResponse = {
        conceptId: -1,
        conceptPath: `Other (${rest.length} concepts)`,
        numPersons: rest.reduce((sum, r) => sum + r.numPersons, 0),
        percentPersons: rest.reduce((sum, r) => sum + r.percentPersons, 0),
        recordsPerPerson: isEra ? undefined : rest.reduce((sum, r) => sum + (r.recordsPerPerson || 0), 0) / rest.length,
        lengthOfEra: isEra ? rest.reduce((sum, r) => sum + (r.lengthOfEra || 0), 0) / rest.length : undefined
      }
      processedRaw = [...top, otherNode]
    } else {
      processedRaw = top
    }
  }
  
  const tableRows: PrevalenceTableRow[] = processedRaw.map(item => ({
    conceptId: item.conceptId,
    conceptName: item.conceptPath,
    personCount: item.numPersons,
    prevalence: item.percentPersons,
    metric: isEra ? (item.lengthOfEra || 0) : (item.recordsPerPerson || 0)
  }))

  const treemapNodes: TreemapNode[] = processedRaw.map(item => ({
    name: extractConceptDisplayName(item.conceptPath),
    value: item.numPersons,
    conceptId: item.conceptId,
    conceptPath: item.conceptPath,
    itemStyle: {
      colorAlpha: Math.min(1, item.percentPersons / 100)
    }
  }))

  return {
    treemapNodes,
    tableRows,
    totalCount: raw.length  // Original count before aggregation
  }
}

/**
 * Extract display name from concept path
 * Concept paths are in format "Level1||Level2||Name"
 * Returns only the last element for display
 */
function extractConceptDisplayName(conceptPath: string): string {
  if (!conceptPath) return ''
  const parts = conceptPath.split('||')
  return parts[parts.length - 1]?.trim() || ''
}

/**
 * Determine if report type is an Era report
 */
export function isEraReport(reportType: ReportType): boolean {
  return reportType === 'conditionEra' || reportType === 'drugEra'
}

/**
 * Get metric column label for report type
 */
export function getMetricLabel(reportType: ReportType): string {
  return isEraReport(reportType) ? 'Length of Era' : 'Records Per Person'
}

/**
 * Export table data to CSV format
 */
export function exportTableToCSV(rows: PrevalenceTableRow[], metricLabel: string): string {
  const headers = ['Concept ID', 'Name', 'Person Count', 'Prevalence (%)', metricLabel]
  const csvRows = [
    headers.join(','),
    ...rows.map(row => [
      row.conceptId,
      `"${row.conceptName.replace(/"/g, '""')}"`,
      row.personCount,
      row.prevalence.toFixed(2),
      row.metric.toFixed(2)
    ].join(','))
  ]
  return csvRows.join('\n')
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

/**
 * Format percentage with fixed decimal places
 */
export function formatPercentage(num: number, decimals = 2): string {
  return `${num.toFixed(decimals)}%`
}

interface DataDensityRawItem {
  xCalendarMonth?: number;
  seriesName?: string;
  yRecordCount?: number;
  category?: string;
  medianValue?: number;
}

interface DataDensityRaw {
  totalRecords?: DataDensityRawItem[];
  recordsPerPerson?: DataDensityRawItem[];
  conceptsPerPerson?: DataDensityRawItem[];
}

/**
 * Transform Data Density API response to internal format
 */
export function transformDataDensityReport(raw: DataDensityRaw): import('@/models/datasource.types').DataDensityReport {
  // Transform total records time series
  const totalRecords: import('@/models/datasource.types').MultiLineChartData = {
    categories: raw.totalRecords?.map((item) => item.xCalendarMonth?.toString() || '') || [],
    series: []
  }

  // Group totalRecords by series name
  if (raw.totalRecords && raw.totalRecords.length > 0) {
    const groupedBySeriesName = new Map<string, number[]>()
    raw.totalRecords.forEach((item) => {
      const seriesName = item.seriesName || 'Total'
      if (!groupedBySeriesName.has(seriesName)) {
        groupedBySeriesName.set(seriesName, [])
      }
      groupedBySeriesName.get(seriesName)!.push(item.yRecordCount || 0)
    })

    totalRecords.series = Array.from(groupedBySeriesName.entries()).map(([name, data]) => ({
      name,
      data
    }))
  }

  // Transform records per person time series
  const recordsPerPerson: import('@/models/datasource.types').MultiLineChartData = {
    categories: raw.recordsPerPerson?.map((item) => item.xCalendarMonth?.toString() || '') || [],
    series: []
  }

  // Group recordsPerPerson by series name
  if (raw.recordsPerPerson && raw.recordsPerPerson.length > 0) {
    const groupedBySeriesName = new Map<string, number[]>()
    raw.recordsPerPerson.forEach((item) => {
      const seriesName = item.seriesName || 'Records'
      if (!groupedBySeriesName.has(seriesName)) {
        groupedBySeriesName.set(seriesName, [])
      }
      groupedBySeriesName.get(seriesName)!.push(item.yRecordCount || 0)
    })

    recordsPerPerson.series = Array.from(groupedBySeriesName.entries()).map(([name, data]) => ({
      name,
      data
    }))
  }

  // Transform concepts per person - this is statistical data, not time series
  const conceptsPerPerson: import('@/models/datasource.types').BarChartData = {
    categories: raw.conceptsPerPerson?.map((item) => item.category || '') || [],
    series: [
      {
        name: 'Median',
        data: raw.conceptsPerPerson?.map((item) => item.medianValue || 0) || []
      }
    ]
  }

  return {
    totalRecords,
    recordsPerPerson,
    conceptsPerPerson
  }
}

interface PersonRawYearOfBirth {
  year?: number;
  yearOfBirth?: number;
  count?: number;
  countValue?: number;
}

interface PersonRawDistribution {
  conceptName?: string;
  name?: string;
  countValue?: number;
  count?: number;
}

interface PersonRaw {
  yearOfBirth?: PersonRawYearOfBirth[];
  gender?: PersonRawDistribution[];
  race?: PersonRawDistribution[];
  ethnicity?: PersonRawDistribution[];
}

/**
 * Transform Person API response to internal format
 */
export function transformPersonReport(raw: PersonRaw): import('@/models/datasource.types').PersonReport {
  // Year of birth distribution
  const yearOfBirth: import('@/models/datasource.types').BarChartData = {
    categories: raw.yearOfBirth?.map((y) => (y.year?.toString() || y.yearOfBirth?.toString() || '')) || [],
    series: [{
      name: 'Person Count',
      data: raw.yearOfBirth?.map((y) => y.count || y.countValue || 0) || []
    }],
    unit: 'People'
  }

  // Gender distribution
  const gender: import('@/models/datasource.types').PieChartData[] =
    raw.gender?.map((g) => ({
      name: g.conceptName || g.name || 'Unknown',
      value: g.countValue || g.count || 0
    })) || []

  // Race distribution
  const race: import('@/models/datasource.types').PieChartData[] =
    raw.race?.map((r) => ({
      name: r.conceptName || r.name || 'Unknown',
      value: r.countValue || r.count || 0
    })) || []

  // Ethnicity distribution
  const ethnicity: import('@/models/datasource.types').PieChartData[] =
    raw.ethnicity?.map((e) => ({
      name: e.conceptName || e.name || 'Unknown',
      value: e.countValue || e.count || 0
    })) || []

  return {
    yearOfBirth,
    gender,
    race,
    ethnicity
  }
}

interface ObservationPeriodRawItem {
  intervalIndex?: number;
  countValue?: number;
  xLengthOfObservation?: number;
  yPercentPersons?: number;
  monthYear?: number;
  seriesName?: string;
  category?: string;
  averageLength?: number;
  medianValue?: number;
}

interface ObservationPeriodRaw {
  ageAtFirst?: ObservationPeriodRawItem[];
  observationLength?: ObservationPeriodRawItem[];
  cumulativeObservation?: ObservationPeriodRawItem[];
  observedByMonth?: ObservationPeriodRawItem[];
  ageByGender?: ObservationPeriodRawItem[];
  durationByGender?: ObservationPeriodRawItem[];
  observationLengthStats?: Array<{ attributeName: string; attributeValue: string }>;
}

/**
 * Transform Observation Period Report
 * Specialized transformer for observation period data
 */
export function transformObservationPeriodReport(raw: ObservationPeriodRaw): import('@/models/datasource.types').ObservationPeriodReport {
  // Age at First Observation - convert to simple BarChartData format
  const ageAtFirst: { categories: string[]; values: number[] } | undefined = raw.ageAtFirst ? {
    categories: raw.ageAtFirst.map((item) => item.intervalIndex?.toString() || ''),
    values: raw.ageAtFirst.map((item) => item.countValue || 0)
  } : undefined

  // Observation Length Distribution - convert to simple BarChartData format
  const observationLength: { categories: string[]; values: number[] } | undefined = raw.observationLength ? {
    categories: raw.observationLength.map((item) => item.intervalIndex?.toString() || ''),
    values: raw.observationLength.map((item) => item.countValue || 0)
  } : undefined

  // Cumulative Observation
  const cumulativeObservation: import('@/models/datasource.types').MultiLineChartData | undefined = raw.cumulativeObservation ? {
    categories: raw.cumulativeObservation.map((item) => item.xLengthOfObservation?.toString() || ''),
    series: [{
      name: 'Cumulative %',
      data: raw.cumulativeObservation.map((item) => item.yPercentPersons || 0)
    }]
  } : undefined

  // Observed by Month
  const observedByMonth: import('@/models/datasource.types').MultiLineChartData | undefined = raw.observedByMonth ? {
    categories: raw.observedByMonth.map((item) => item.monthYear?.toString() || ''),
    series: [{
      name: 'Persons',
      data: raw.observedByMonth.map((item) => item.countValue || 0)
    }]
  } : undefined

  // Age by Gender - group by series name
  let ageByGender: import('@/models/datasource.types').MultiLineChartData | undefined
  if (raw.ageByGender && raw.ageByGender.length > 0) {
    const grouped = new Map<string, number[]>()
    const categorySet = new Set<string>()
    raw.ageByGender.forEach((item) => {
      const cat = item.intervalIndex?.toString() || ''
      categorySet.add(cat)
    })
    const categories: string[] = Array.from(categorySet)

    raw.ageByGender.forEach((item) => {
      const series = item.seriesName || 'Unknown'
      if (!grouped.has(series)) {
        grouped.set(series, new Array(categories.length).fill(0))
      }
      const idx = categories.indexOf(item.intervalIndex?.toString() || '')
      if (idx >= 0) {
        grouped.get(series)![idx] = item.countValue || 0
      }
    })

    ageByGender = {
      categories,
      series: Array.from(grouped.entries()).map(([name, data]) => ({ name, data }))
    }
  }

  // Duration by Gender - convert to simple BarChartData format
  const durationByGender: { categories: string[]; values: number[] } | undefined = raw.durationByGender ? {
    categories: raw.durationByGender.map((item) => item.category || item.seriesName || ''),
    values: raw.durationByGender.map((item) => item.averageLength || item.medianValue || 0)
  } : undefined

  return {
    ageAtFirst,
    observationLength,
    cumulativeObservation,
    observedByMonth,
    ageByGender,
    durationByGender,
    observationLengthStats: raw.observationLengthStats
  }
}

interface DeathRawDeathByType {
  conceptName?: string;
  countValue?: number;
}

interface DeathRawPrevalenceByMonth {
  xCalendarMonth?: number;
  yPrevalence1000Pp?: number;
}

interface DeathRawPrevalenceByGenderAgeYear {
  xCalendarYear?: number;
  trellisName?: string;
  seriesName?: string;
  yPrevalence1000Pp?: number;
}

interface DeathRaw {
  ageAtDeath?: import('@/models/datasource.types').AgeAtDeathStat[];
  deathByType?: DeathRawDeathByType[];
  prevalenceByMonth?: DeathRawPrevalenceByMonth[];
  prevalenceByGenderAgeYear?: DeathRawPrevalenceByGenderAgeYear[];
}

/**
 * Transform Death Report
 * Specialized transformer for death data
 */
export function transformDeathReport(raw: DeathRaw): import('@/models/datasource.types').DeathReport {
  // Age at Death stats
  const ageAtDeath: import('@/models/datasource.types').AgeAtDeathStat[] = raw.ageAtDeath || []

  // Death by Type - convert to pie chart data
  const deathByType: import('@/models/datasource.types').PieChartData[] = raw.deathByType?.map((item) => ({
    name: item.conceptName || 'Unknown',
    value: item.countValue || 0
  })) || []

  // Prevalence by Month
  const prevalenceByMonth: import('@/models/datasource.types').MultiLineChartData | undefined = raw.prevalenceByMonth ? {
    categories: raw.prevalenceByMonth.map((item) => item.xCalendarMonth?.toString() || ''),
    series: [{
      name: 'Prevalence per 1000',
      data: raw.prevalenceByMonth.map((item) => item.yPrevalence1000Pp || 0)
    }]
  } : undefined

  // Prevalence by Gender, Age, Year - complex multi-series chart
  let prevalenceByGenderAgeYear: import('@/models/datasource.types').MultiLineChartData | undefined
  if (raw.prevalenceByGenderAgeYear && raw.prevalenceByGenderAgeYear.length > 0) {
    const grouped = new Map<string, Map<string, number>>()
    const yearSet = new Set<string>()
    raw.prevalenceByGenderAgeYear.forEach((item) => {
      const year = item.xCalendarYear?.toString() || ''
      yearSet.add(year)
    })
    const years: string[] = Array.from(yearSet).sort()

    raw.prevalenceByGenderAgeYear.forEach((item) => {
      const ageGroup = item.trellisName || 'Unknown'
      const gender = item.seriesName || 'Unknown'
      const key = `${gender} (${ageGroup})`

      if (!grouped.has(key)) {
        grouped.set(key, new Map<string, number>())
      }

      const yearData = grouped.get(key)!
      const year = item.xCalendarYear?.toString() || ''

      if (!yearData.has(year)) {
        yearData.set(year, item.yPrevalence1000Pp || 0)
      }
    })

    prevalenceByGenderAgeYear = {
      categories: years,
      series: Array.from(grouped.entries()).map(([name, yearData]) => ({
        name,
        data: years.map(year => yearData.get(year) || 0)
      }))
    }
  }

  return {
    ageAtDeath,
    deathByType,
    prevalenceByMonth,
    prevalenceByGenderAgeYear
  }
}

