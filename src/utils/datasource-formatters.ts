/**
 * Data Source Formatters and Transformers
 * Feature: 006-datasources
 */
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
 * Includes aggregation for large datasets (T068)
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
    console.log(`[Transformer] Large dataset detected (${raw.length} entries), aggregating nodes`)
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
    name: item.conceptPath,
    value: item.numPersons,
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

/**
 * Transform Data Density API response to internal format
 */
export function transformDataDensityReport(raw: any): import('@/models/datasource.types').DataDensityReport {
  // Transform total records time series
  const totalRecords: import('@/models/datasource.types').MultiLineChartData = {
    categories: raw.totalRecords?.map((item: any) => item.xCalendarMonth?.toString() || '') || [],
    series: []
  }
  
  // Group totalRecords by series name
  if (raw.totalRecords && raw.totalRecords.length > 0) {
    const groupedBySeriesName = new Map<string, number[]>()
    raw.totalRecords.forEach((item: any) => {
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
    categories: raw.recordsPerPerson?.map((item: any) => item.xCalendarMonth?.toString() || '') || [],
    series: []
  }
  
  // Group recordsPerPerson by series name
  if (raw.recordsPerPerson && raw.recordsPerPerson.length > 0) {
    const groupedBySeriesName = new Map<string, number[]>()
    raw.recordsPerPerson.forEach((item: any) => {
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
    categories: raw.conceptsPerPerson?.map((item: any) => item.category || '') || [],
    series: [
      {
        name: 'Median',
        data: raw.conceptsPerPerson?.map((item: any) => item.medianValue || 0) || []
      }
    ]
  }

  return {
    totalRecords,
    recordsPerPerson,
    conceptsPerPerson
  }
}

/**
 * Transform Person API response to internal format
 */
export function transformPersonReport(raw: any): import('@/models/datasource.types').PersonReport {
  // Year of birth distribution
  const yearOfBirth: import('@/models/datasource.types').BarChartData = {
    categories: raw.yearOfBirth?.map((y: any) => y.year?.toString() || y.yearOfBirth?.toString()) || [],
    series: [{
      name: 'Person Count',
      data: raw.yearOfBirth?.map((y: any) => y.count || y.countValue || 0) || []
    }],
    unit: 'People'
  }

  // Gender distribution
  const gender: import('@/models/datasource.types').PieChartData[] = 
    raw.gender?.map((g: any) => ({
      name: g.conceptName || g.name || 'Unknown',
      value: g.countValue || g.count || 0
    })) || []

  // Race distribution
  const race: import('@/models/datasource.types').PieChartData[] =
    raw.race?.map((r: any) => ({
      name: r.conceptName || r.name || 'Unknown',
      value: r.countValue || r.count || 0
    })) || []

  // Ethnicity distribution
  const ethnicity: import('@/models/datasource.types').PieChartData[] =
    raw.ethnicity?.map((e: any) => ({
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

/**
 * Transform Observation Period Report
 * Specialized transformer for observation period data
 */
export function transformObservationPeriodReport(raw: any): import('@/models/datasource.types').ObservationPeriodReport {
  // Age at First Observation
  const ageAtFirst: import('@/models/datasource.types').BarChartData | undefined = raw.ageAtFirst ? {
    categories: raw.ageAtFirst.map((item: any) => item.intervalIndex?.toString() || ''),
    series: [{
      name: 'Person Count',
      data: raw.ageAtFirst.map((item: any) => item.countValue || 0)
    }]
  } : undefined

  // Observation Length Distribution
  const observationLength: import('@/models/datasource.types').BarChartData | undefined = raw.observationLength ? {
    categories: raw.observationLength.map((item: any) => item.intervalIndex?.toString() || ''),
    series: [{
      name: 'Person Count',
      data: raw.observationLength.map((item: any) => item.countValue || 0)
    }]
  } : undefined

  // Cumulative Observation
  const cumulativeObservation: import('@/models/datasource.types').MultiLineChartData | undefined = raw.cumulativeObservation ? {
    categories: raw.cumulativeObservation.map((item: any) => item.xLengthOfObservation?.toString() || ''),
    series: [{
      name: 'Cumulative %',
      data: raw.cumulativeObservation.map((item: any) => item.yPercentPersons || 0)
    }]
  } : undefined

  // Observed by Month
  const observedByMonth: import('@/models/datasource.types').MultiLineChartData | undefined = raw.observedByMonth ? {
    categories: raw.observedByMonth.map((item: any) => item.monthYear?.toString() || ''),
    series: [{
      name: 'Persons',
      data: raw.observedByMonth.map((item: any) => item.countValue || 0)
    }]
  } : undefined

  // Age by Gender - group by series name
  let ageByGender: import('@/models/datasource.types').MultiLineChartData | undefined
  if (raw.ageByGender && raw.ageByGender.length > 0) {
    const grouped = new Map<string, number[]>()
    const categories: string[] = [...new Set(raw.ageByGender.map((item: any) => item.intervalIndex?.toString() || ''))]
    
    raw.ageByGender.forEach((item: any) => {
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

  // Duration by Gender
  const durationByGender: import('@/models/datasource.types').BarChartData | undefined = raw.durationByGender ? {
    categories: raw.durationByGender.map((item: any) => item.category || item.seriesName || ''),
    series: [{
      name: 'Average Duration (days)',
      data: raw.durationByGender.map((item: any) => item.averageLength || item.medianValue || 0)
    }]
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

/**
 * Transform Death Report
 * Specialized transformer for death data
 */
export function transformDeathReport(raw: any): import('@/models/datasource.types').DeathReport {
  // Age at Death stats
  const ageAtDeath: import('@/models/datasource.types').AgeAtDeathStat[] = raw.ageAtDeath || []

  // Death by Type - convert to pie chart data
  const deathByType: import('@/models/datasource.types').PieChartData[] = raw.deathByType?.map((item: any) => ({
    name: item.conceptName || 'Unknown',
    value: item.countValue || 0
  })) || []

  // Prevalence by Month
  const prevalenceByMonth: import('@/models/datasource.types').MultiLineChartData | undefined = raw.prevalenceByMonth ? {
    categories: raw.prevalenceByMonth.map((item: any) => item.xCalendarMonth?.toString() || ''),
    series: [{
      name: 'Prevalence per 1000',
      data: raw.prevalenceByMonth.map((item: any) => item.yPrevalence1000Pp || 0)
    }]
  } : undefined

  // Prevalence by Gender, Age, Year - complex multi-series chart
  let prevalenceByGenderAgeYear: import('@/models/datasource.types').MultiLineChartData | undefined
  if (raw.prevalenceByGenderAgeYear && raw.prevalenceByGenderAgeYear.length > 0) {
    const grouped = new Map<string, Map<string, number[]>>()
    const years = [...new Set(raw.prevalenceByGenderAgeYear.map((item: any) => item.xCalendarYear?.toString() || ''))]
    
    raw.prevalenceByGenderAgeYear.forEach((item: any) => {
      const ageGroup = item.trellisName || 'Unknown'
      const gender = item.seriesName || 'Unknown'
      const key = `${gender} (${ageGroup})`
      
      if (!grouped.has(key)) {
        grouped.set(key, new Map())
      }
      
      const yearData = grouped.get(key)!
      const year = item.xCalendarYear?.toString() || ''
      const idx = years.indexOf(year)
      
      if (!yearData.has(year)) {
        yearData.set(year, item.yPrevalence1000Pp || 0)
      }
    })

    prevalenceByGenderAgeYear = {
      categories: years.sort(),
      series: Array.from(grouped.entries()).map(([name, yearData]) => ({
        name,
        data: years.sort().map(year => yearData.get(year) || 0)
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

