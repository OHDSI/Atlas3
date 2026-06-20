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
  HistogramChartData,
  PieChartData,
  LineChartData,
  ReportType,
} from '@/models/datasource.types'

/**
 * Transform Dashboard API response to internal format
 */
export function transformDashboardReport(raw: DashboardAPIResponse): DashboardReport {
  const summary = {
    sourceName: raw.summary.find(s => s.attributeName === 'Source name')?.attributeValue || '',
    personCount: parseInt(
      raw.summary.find(s => s.attributeName === 'Number of persons')?.attributeValue || '0'
    ),
  }

  const genderDistribution: PieChartData[] = raw.gender.map(g => ({
    name: g.conceptName,
    value: g.countValue,
  }))

  const ageDistribution: HistogramChartData = {
    intervalSize: 1,
    offset: 0,
    bins: raw.ageAtFirstObservation.map(a => ({
      intervalIndex: a.intervalIndex,
      countValue: a.countValue,
    })),
    unit: 'Person Count',
    seriesName: 'Person Count',
    xAxisLabel: 'Age',
  }

  const cumulativeObservation: LineChartData = {
    // Ensure categories/series are ordered by the x value used for the x-axis
    ...(() => {
      const sorted = (raw.cumulativeObservation || []).slice().sort((a, b) => (a.xLengthOfObservation ?? 0) - (b.xLengthOfObservation ?? 0))
      return {
        categories: sorted.map(c => c.xLengthOfObservation?.toString() || ''),
        xValues: sorted.map(c => c.xLengthOfObservation ?? 0),
        series: [
          {
            name: 'Cumulative Observation',
            data: sorted.map(c => c.yPercentPersons || 0),
          },
        ],
      }
    })(),
    xAxisLabel: 'Days',
    yAxisLabel: 'Percent of Persons',
  }

  const observationByMonth: LineChartData = {
    // Order by `monthYear` before splitting into parallel arrays
    ...(() => {
      const sorted = (raw.observedByMonth || []).slice().sort((a, b) => (a.monthYear ?? 0) - (b.monthYear ?? 0))
      return {
        categories: sorted.map(o => o.monthYear?.toString() || ''),
        monthCodes: sorted.map(o => o.monthYear ?? 0),
        xAxisType: 'time' as const,
        series: [
          {
            name: 'Observation Count',
            data: sorted.map(o => o.countValue || 0),
          },
        ],
      }
    })(),
    xAxisLabel: 'Month',
    yAxisLabel: 'Count',
  }

  return {
    summary,
    genderDistribution,
    ageDistribution,
    cumulativeObservation,
    observationByMonth,
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
        recordsPerPerson: isEra
          ? undefined
          : rest.reduce((sum, r) => sum + (r.recordsPerPerson || 0), 0) / rest.length,
        lengthOfEra: isEra
          ? rest.reduce((sum, r) => sum + (r.lengthOfEra || 0), 0) / rest.length
          : undefined,
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
    metric: isEra ? item.lengthOfEra || 0 : item.recordsPerPerson || 0,
  }))

  // Atlas 2.15 treemap encoding (see js/components/reports/classes/Treemap.js
  // and per-domain aggProperty in js/pages/data-sources/components/reports/*):
  //   - rectangle area  → numPersons (size)
  //   - rectangle colour → recordsPerPerson for non-era reports,
  //                         lengthOfEra for era reports.
  // We carry colour magnitude on TreemapNode.colorValue so the
  // gradient shader (paintTreemapNodesByValue) can scale it
  // independently of `value`. Drop the legacy colorAlpha — that
  // was a (different) prevalence-based dimming hack.
  const treemapNodes: TreemapNode[] = processedRaw.map(item => {
    const colorValueRaw = isEra ? item.lengthOfEra : item.recordsPerPerson
    const colorValue =
      typeof colorValueRaw === 'number' && Number.isFinite(colorValueRaw)
        ? colorValueRaw
        : undefined
    return {
      name: extractConceptDisplayName(item.conceptPath),
      value: item.numPersons,
      colorValue,
      conceptId: item.conceptId,
      conceptPath: item.conceptPath,
    }
  })

  return {
    treemapNodes,
    tableRows,
    totalCount: raw.length, // Original count before aggregation
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
    ...rows.map(row =>
      [
        row.conceptId,
        `"${row.conceptName.replace(/"/g, '""')}"`,
        row.personCount,
        row.prevalence.toFixed(2),
        row.metric.toFixed(2),
      ].join(',')
    ),
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
  xCalendarMonth?: number
  seriesName?: string
  yRecordCount?: number
  category?: string
  minValue?: number
  p10Value?: number
  p25Value?: number
  medianValue?: number
  p75Value?: number
  p90Value?: number
  maxValue?: number
}

interface DataDensityRaw {
  totalRecords?: DataDensityRawItem[]
  recordsPerPerson?: DataDensityRawItem[]
  conceptsPerPerson?: DataDensityRawItem[]
}

/**
 * Transform Data Density API response to internal format
 */
export function transformDataDensityReport(
  raw: DataDensityRaw
): import('@/models/datasource.types').DataDensityReport {
  // Build union of months across all series for totalRecords so categories include every month
  const totalRaw = raw.totalRecords || []
    const totalMonthsSet = new Set<number>()
    const totalSeriesNames = new Set<string>()
    const totalLookup = new Map<string, number>()
    totalRaw.forEach(item => {
      const month = item.xCalendarMonth
      if (month == null) return
      totalMonthsSet.add(month)
      const seriesName = item.seriesName || 'Total'
      totalSeriesNames.add(seriesName)
      totalLookup.set(`${seriesName}|${month}`, item.yRecordCount ?? 0)
    })
    const totalMonths = Array.from(totalMonthsSet).sort((a, b) => a - b)
    const totalCategories = totalMonths.map(m => m.toString())

  // totalLookup already populated above in the single iteration

  const totalRecords: import('@/models/datasource.types').MultiLineChartData = {
    categories: totalCategories,
    xAxisType: 'time',
    monthCodes: totalMonths,
    series: Array.from(totalSeriesNames).map(name => ({
      name,
      data: totalMonths.map(m => totalLookup.get(`${name}|${m}`) ?? 0),
    })),
  }

  // Same for recordsPerPerson: union months across its series and align each series
  const recRaw = raw.recordsPerPerson || []
  const recMonthsSet = new Set<number>()
  const recSeriesNames = new Set<string>()
  const recLookup = new Map<string, number>()
  recRaw.forEach(item => {
      const month = item.xCalendarMonth
      if (month == null) return
      recMonthsSet.add(month)
      const seriesName = item.seriesName || 'Records'
      recSeriesNames.add(seriesName)
      recLookup.set(`${seriesName}|${month}`, item.yRecordCount ?? 0)
    })
    const recMonths = Array.from(recMonthsSet).sort((a, b) => a - b)
    const recCategories = recMonths.map(m => m.toString())

  // recLookup already populated above in the single iteration

  const recordsPerPerson: import('@/models/datasource.types').MultiLineChartData = {
    categories: recCategories,
    xAxisType: 'time',
    monthCodes: recMonths,
    series: Array.from(recSeriesNames).map(name => ({
      name,
      data: recMonths.map(m => recLookup.get(`${name}|${m}`) ?? 0),
    })),
  }

  const conceptsPerPerson = (raw.conceptsPerPerson || []).map(item => ({
    category: item.category || '',
    min: item.minValue ?? 0,
    p10: item.p10Value ?? 0,
    p25: item.p25Value ?? 0,
    median: item.medianValue ?? 0,
    p75: item.p75Value ?? 0,
    p90: item.p90Value ?? 0,
    max: item.maxValue ?? 0,
  }))

  return {
    totalRecords,
    recordsPerPerson,
    conceptsPerPerson,
  }
}

interface PersonRawYearOfBirth {
  intervalIndex?: number
  percentValue?: number
  countValue?: number
}

interface PersonRawYearOfBirthStats {
  minValue?: number
  maxValue?: number
  intervalSize?: number
}

interface PersonRawDistribution {
  conceptName?: string
  name?: string
  countValue?: number
  count?: number
}

interface PersonRaw {
  yearOfBirth?: PersonRawYearOfBirth[]
  yearOfBirthStats?: PersonRawYearOfBirthStats[]
  gender?: PersonRawDistribution[]
  race?: PersonRawDistribution[]
  ethnicity?: PersonRawDistribution[]
}

/**
 * Transform Person API response to internal format.
 * Mirrors Atlas 2.x logic:
 *   offset       = yearOfBirthStats[0].minValue   (e.g. 1910)
 *   intervalSize = yearOfBirthStats[0].intervalSize (e.g. 1)
 *   bins         = yearOfBirth[].intervalIndex (0-based from offset)
 *   → actual year = offset + intervalIndex * intervalSize
 */
export function transformPersonReport(
  raw: PersonRaw
): import('@/models/datasource.types').PersonReport {
  // Year of birth distribution
  const yearOfBirth: import('@/models/datasource.types').HistogramChartData = (() => {
    const yearData = raw.yearOfBirth || []
    if (yearData.length === 0) {
      return {
        intervalSize: 1,
        offset: 0,
        bins: [],
        unit: 'Person Count',
        seriesName: 'Person Count',
        xAxisLabel: 'Year of Birth',
      }
    }

    const stats = raw.yearOfBirthStats?.[0]
    const offset = stats?.minValue ?? 0
    const intervalSize = stats?.intervalSize ?? 1

    const bins = yearData
      .map(y => ({
        intervalIndex: y.intervalIndex ?? 0,
        countValue: y.countValue ?? 0,
      }))
      .sort((a, b) => a.intervalIndex - b.intervalIndex)

    return {
      intervalSize,
      offset,
      bins,
      unit: 'Person Count',
      seriesName: 'Person Count',
      xAxisLabel: 'Year of Birth',
    }
  })()

  // Gender distribution
  const gender: import('@/models/datasource.types').PieChartData[] =
    raw.gender?.map(g => ({
      name: g.conceptName || g.name || 'Unknown',
      value: g.countValue || g.count || 0,
    })) || []

  // Race distribution
  const race: import('@/models/datasource.types').PieChartData[] =
    raw.race?.map(r => ({
      name: r.conceptName || r.name || 'Unknown',
      value: r.countValue || r.count || 0,
    })) || []

  // Ethnicity distribution
  const ethnicity: import('@/models/datasource.types').PieChartData[] =
    raw.ethnicity?.map(e => ({
      name: e.conceptName || e.name || 'Unknown',
      value: e.countValue || e.count || 0,
    })) || []

  return {
    yearOfBirth,
    gender,
    race,
    ethnicity,
  }
}

interface RawBoxPlotItem {
  category?: string
  minValue?: number
  p10Value?: number
  p25Value?: number
  medianValue?: number
  p75Value?: number
  p90Value?: number
  maxValue?: number
}

function mapBoxPlotArray(
  raw: RawBoxPlotItem[] | undefined
): import('@/models/report.types').BoxPlotData[] | undefined {
  if (!raw || raw.length === 0) return undefined
  return raw.map(item => ({
    category: item.category || '',
    min: item.minValue ?? 0,
    p10: item.p10Value ?? 0,
    p25: item.p25Value ?? 0,
    median: item.medianValue ?? 0,
    p75: item.p75Value ?? 0,
    p90: item.p90Value ?? 0,
    max: item.maxValue ?? 0,
  }))
}

interface ObservationPeriodRawHistItem {
  intervalIndex?: number
  percentValue?: number
  countValue?: number
}

interface ObservationPeriodRawCumulativeItem {
  xLengthOfObservation?: number
  yPercentPersons?: number
}

interface ObservationPeriodRawMonthItem {
  monthYear?: number
  countValue?: number
}

interface ObservationPeriodsPerPersonItem {
  conceptName?: string
  countValue?: number
}

interface ObservationPeriodRaw {
  ageAtFirst?: ObservationPeriodRawHistItem[]
  observationLength?: ObservationPeriodRawHistItem[]
  cumulativeObservation?: ObservationPeriodRawCumulativeItem[]
  observedByMonth?: ObservationPeriodRawMonthItem[]
  ageByGender?: RawBoxPlotItem[]
  durationByGender?: RawBoxPlotItem[]
  durationByAgeDecile?: RawBoxPlotItem[]
  personsWithContinuousObservationsByYear?: ObservationPeriodRawHistItem[]
  observationPeriodsPerPerson?: ObservationPeriodsPerPersonItem[]
  observationLengthStats?: Array<{ minValue?: number; maxValue?: number; intervalSize?: number }>
}

/**
 * Transform Observation Period Report
 * Specialized transformer for observation period data
 */
export function transformObservationPeriodReport(
  raw: ObservationPeriodRaw
): import('@/models/datasource.types').ObservationPeriodReport {
  // ageAtFirst: offset=0, intervalSize=1 — intervalIndex IS the age (matches Atlas 2.x parseHistogramData)
  const ageAtFirst: import('@/models/datasource.types').HistogramChartData | undefined =
    raw.ageAtFirst
      ? {
          intervalSize: 1,
          offset: 0,
          bins: raw.ageAtFirst
            .map(i => ({
              intervalIndex: i.intervalIndex ?? 0,
              countValue: i.countValue ?? 0,
            }))
            .sort((a, b) => a.intervalIndex - b.intervalIndex),
          unit: 'Person Count',
          seriesName: 'Person Count',
          xAxisLabel: 'Age',
        }
      : undefined

  // observationLength: offset=0, intervalSize from observationLengthStats (e.g. 30 days per bin)
  // x-axis value = intervalIndex * intervalSize (days)
  // Mirrors Atlas 2.x: parseObservationLength sets OFFSET=0, INTERVAL_SIZE=stats.intervalSize
  const observationLength: import('@/models/datasource.types').HistogramChartData | undefined =
    raw.observationLength
      ? {
          intervalSize: raw.observationLengthStats?.[0]?.intervalSize ?? 1,
          offset: 0,
          bins: raw.observationLength
            .map(i => ({
              intervalIndex: i.intervalIndex ?? 0,
              countValue: i.countValue ?? 0,
            }))
            .sort((a, b) => a.intervalIndex - b.intervalIndex),
          unit: 'Person Count',
          seriesName: 'Person Count',
          xAxisLabel: 'Days',
        }
      : undefined

  const cumulativeObservation: import('@/models/datasource.types').MultiLineChartData | undefined =
    raw.cumulativeObservation
      ? (() => {
          const sorted = (raw.cumulativeObservation || []).slice().sort((a, b) => (a.xLengthOfObservation ?? 0) - (b.xLengthOfObservation ?? 0))
          return {
            categories: sorted.map(i => i.xLengthOfObservation?.toString() || ''),
            xAxisType: 'value' as const,
            xValues: sorted.map(i => i.xLengthOfObservation ?? 0),
            series: [
              {
                name: 'Cumulative %',
                data: sorted.map(i => i.yPercentPersons || 0),
              },
            ],
          }
        })()
      : undefined

  const observedByMonth: import('@/models/datasource.types').MultiLineChartData | undefined =
    raw.observedByMonth
      ? (() => {
          const sorted = (raw.observedByMonth || []).slice().sort((a, b) => (a.monthYear ?? 0) - (b.monthYear ?? 0))
          return {
            categories: sorted.map(i => i.monthYear?.toString() || ''),
            xAxisType: 'time' as const,
            monthCodes: sorted.map(i => i.monthYear ?? 0),
            series: [
              {
                name: 'Persons',
                data: sorted.map(i => i.countValue || 0),
              },
            ],
          }
        })()
      : undefined

  const personsWithContinuousObsByYear = raw.personsWithContinuousObservationsByYear
    ? {
        categories: raw.personsWithContinuousObservationsByYear.map(
          i => i.intervalIndex?.toString() || ''
        ),
        values: raw.personsWithContinuousObservationsByYear.map(i => i.countValue || 0),
      }
    : undefined

  const observationPeriodsPerPerson:
    | import('@/models/datasource.types').PieChartData[]
    | undefined =
    raw.observationPeriodsPerPerson && raw.observationPeriodsPerPerson.length > 0
      ? raw.observationPeriodsPerPerson.map(i => ({
          name: i.conceptName || 'Unknown',
          value: i.countValue || 0,
        }))
      : undefined

  return {
    ageAtFirst,
    observationLength,
    cumulativeObservation,
    observedByMonth,
    ageByGender: mapBoxPlotArray(raw.ageByGender),
    durationByGender: mapBoxPlotArray(raw.durationByGender),
    durationByAgeDecile: mapBoxPlotArray(raw.durationByAgeDecile),
    personsWithContinuousObsByYear,
    observationPeriodsPerPerson,
  }
}

interface DeathRawDeathByType {
  conceptName?: string
  countValue?: number
}

interface DeathRawPrevalenceByMonth {
  xCalendarMonth?: number
  yPrevalence1000Pp?: number
}

interface DeathRawPrevalenceByGenderAgeYear {
  xCalendarYear?: number
  trellisName?: string
  seriesName?: string
  yPrevalence1000Pp?: number
}

interface DeathRawAgeAtDeath extends RawBoxPlotItem {
  conceptId?: number
}

interface DeathRaw {
  ageAtDeath?: DeathRawAgeAtDeath[]
  deathByType?: DeathRawDeathByType[]
  prevalenceByMonth?: DeathRawPrevalenceByMonth[]
  prevalenceByGenderAgeYear?: DeathRawPrevalenceByGenderAgeYear[]
}

export function transformDeathReport(
  raw: DeathRaw
): import('@/models/datasource.types').DeathReport {
  const ageAtDeath = mapBoxPlotArray(raw.ageAtDeath) || []

  const deathByType: import('@/models/datasource.types').PieChartData[] =
    raw.deathByType?.map(item => ({
      name: item.conceptName || 'Unknown',
      value: item.countValue || 0,
    })) || []

  const prevalenceByMonth: import('@/models/datasource.types').MultiLineChartData | undefined =
    raw.prevalenceByMonth
      ? (() => {
          const sorted = (raw.prevalenceByMonth || []).slice().sort((a, b) => (a.xCalendarMonth ?? 0) - (b.xCalendarMonth ?? 0))
          return {
            categories: sorted.map(i => i.xCalendarMonth?.toString() || ''),
            xAxisType: 'time' as const,
            monthCodes: sorted.map(i => i.xCalendarMonth ?? 0),
            series: [
              {
                name: 'Prevalence per 1000',
                data: sorted.map(i => i.yPrevalence1000Pp || 0),
              },
            ],
          }
        })()
      : undefined

  let prevalenceByGenderAgeYear: import('@/models/report.types').TrellisChartData | undefined
  if (raw.prevalenceByGenderAgeYear && raw.prevalenceByGenderAgeYear.length > 0) {
    const groupedData = new Map<string, Map<string, { x: number; y: number }[]>>()
    const categories = new Set<string>()

    raw.prevalenceByGenderAgeYear.forEach(item => {
      const trellisName = item.trellisName || 'Unknown'
      const seriesName = item.seriesName || 'Total'
      const year = item.xCalendarYear || 0
      const prevalence = item.yPrevalence1000Pp || 0

      categories.add(trellisName)
      if (!groupedData.has(trellisName)) groupedData.set(trellisName, new Map())
      const trellisGroup = groupedData.get(trellisName)!
      if (!trellisGroup.has(seriesName)) trellisGroup.set(seriesName, [])
      trellisGroup.get(seriesName)!.push({ x: year, y: prevalence })
    })

    const series: import('@/models/report.types').TrellisSeriesData[] = []
    groupedData.forEach((seriesMap, category) => {
      seriesMap.forEach((data, name) => {
        series.push({ name, category, data: data.sort((a, b) => a.x - b.x) })
      })
    })

    prevalenceByGenderAgeYear = { series, categories: Array.from(categories) }
  }

  return { ageAtDeath, deathByType, prevalenceByMonth, prevalenceByGenderAgeYear }
}
