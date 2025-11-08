/**
 * Report Data Mapper Service
 * Feature: 005-cohort-reports
 * Tasks: T017-T018
 *
 * Transforms WebAPI report responses to internal data models
 * and provides chart data conversion utilities
 */

import type {
  WebAPIPersonRaw,
  WebAPIConditionEraRaw,
  WebAPIConditionRaw,
  WebAPIDrugEraRaw,
  WebAPICohortSpecificRaw,
  PersonReport,
  ConditionErasReport,
  ConditionReport,
  DrugErasReport,
  CohortSpecificReport,
  BarChartData,
  PieChartData,
  LineChartData,
  TreemapNode,
  YearOfBirthData,
  DemographicData,
  ConditionEraData,
  ConditionData,
  DrugEraData
} from '@/models/report.types'

// ============================================================================
// Report Mappers (T017)
// ============================================================================

/**
 * Map WebAPI person report data to internal PersonReport format
 * Transforms raw OHDSI WebAPI structure to our application types
 */
export function mapPersonReport(data: WebAPIPersonRaw): PersonReport {
  // Calculate total count for percentage calculations
  const totalGender = data.gender.reduce((sum, item) => sum + item.countValue, 0)
  const totalRace = data.race.reduce((sum, item) => sum + item.countValue, 0)
  const totalEthnicity = data.ethnicity.reduce((sum, item) => sum + item.countValue, 0)

  return {
    yearOfBirth: data.yearOfBirth.map((item): YearOfBirthData => ({
      year: item.intervalIndex + 1920, // intervalIndex 0 = 1920, 1 = 1921, etc.
      count: item.countValue
    })),
    demographics: {
      gender: data.gender.map((item): DemographicData => ({
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        count: item.countValue,
        percentage: totalGender > 0 ? (item.countValue / totalGender) * 100 : 0
      })),
      race: data.race.map((item): DemographicData => ({
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        count: item.countValue,
        percentage: totalRace > 0 ? (item.countValue / totalRace) * 100 : 0
      })),
      ethnicity: data.ethnicity.map((item): DemographicData => ({
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        count: item.countValue,
        percentage: totalEthnicity > 0 ? (item.countValue / totalEthnicity) * 100 : 0
      }))
    }
  }
}

/**
 * Map WebAPI condition eras data to internal ConditionErasReport format
 * Transforms raw OHDSI WebAPI array to our application types
 */
export function mapConditionErasReport(data: WebAPIConditionEraRaw): ConditionErasReport {
  const prevalence: ConditionEraData[] = data.map(item => {
    // Parse conceptPath: "SOC||HLT||PT||LLT||ConceptName"
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`
    const soc = pathParts[0] !== 'NA' ? pathParts[0] : undefined
    const hlt = pathParts[1] !== 'NA' ? pathParts[1] : undefined

    return {
      conceptId: item.conceptId,
      conceptName,
      soc,
      hlt,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100, // Convert to percentage
      averageDuration: item.lengthOfEra
    }
  })

  return {
    prevalence,
    treemapData: prevalence.length > 0 ? toTreemapData(prevalence, 'conceptName', 'personCount') : undefined
  }
}

/**
 * Map WebAPI condition data to internal ConditionReport format
 * Transforms raw OHDSI WebAPI array to our application types
 * T079: Condition occurrence report
 */
export function mapConditionReport(data: WebAPIConditionRaw): ConditionReport {
  const prevalence: ConditionData[] = data.map(item => {
    // Parse conceptPath to get condition name
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100 // Convert to percentage
    }
  })

  return {
    prevalence
  }
}

/**
 * Map WebAPI drug eras data to internal DrugErasReport format
 * Transforms raw OHDSI WebAPI array to our application types
 */
export function mapDrugErasReport(data: WebAPIDrugEraRaw): DrugErasReport {
  const prevalence: DrugEraData[] = data.map(item => {
    // Parse conceptPath: "ATC1||ATC4||Ingredient"
    const pathParts = item.conceptPath.split('||')
    const ingredient = pathParts[pathParts.length - 1] || `Drug ${item.conceptId}`
    const atc1 = pathParts[0] !== 'NA' ? pathParts[0] : undefined
    const atc4 = pathParts[1] !== 'NA' ? pathParts[1] : undefined

    return {
      conceptId: item.conceptId,
      conceptName: ingredient,
      atc1,
      atc4,
      ingredient,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100, // Convert to percentage
      averageDuration: item.lengthOfEra
    }
  })

  return {
    prevalence,
    treemapData: prevalence.length > 0 ? toTreemapData(prevalence, 'conceptName', 'personCount') : undefined
  }
}

/**
 * Map WebAPI cohort specific data to internal CohortSpecificReport format
 * Transforms raw OHDSI WebAPI structure to our application types
 */
export function mapCohortSpecificReport(data: WebAPICohortSpecificRaw): CohortSpecificReport {
  return {
    prevalenceByMonth: data.prevalenceByMonth.map(item => ({
      date: item.xCalendarMonth,
      prevalence: item.yPrevalence1000Pp
    })),
    cohortStart: {
      startDate: data.personsInCohortFromCohortStartToEnd?.[0]?.xCalendarMonth || '',
      endDate: data.personsInCohortFromCohortStartToEnd?.slice(-1)[0]?.xCalendarMonth || '',
      totalPersons: data.ageAtIndexDistribution.reduce((sum, item) => sum + item.countValue, 0)
    },
    personsInCohort: data.personsInCohortFromCohortStartToEnd?.map(item => ({
      dayOffset: 0, // This data isn't available in the current structure
      personCount: item.yRecordCount
    })) || [],
    durationDistribution: data.personsByDurationFromStartToEnd.map(item => ({
      days: item.intervalIndex * 30, // Each interval is ~30 days
      percentOfPopulation: item.percentValue * 100
    })),
    ageDistribution: data.ageAtIndexDistribution.map(item => ({
      age: item.intervalIndex + 18, // Assuming intervalIndex 0 = age 18
      count: item.countValue
    }))
  }
}

// ============================================================================
// Chart Data Converters (T018)
// ============================================================================

/**
 * Convert array data to ECharts bar chart format
 * @param data Source data array
 * @param categoryKey Key for X-axis categories (e.g., 'year', 'age')
 * @param valueKey Key for Y-axis values (e.g., 'count', 'personCount')
 * @param unit Optional unit label (e.g., 'People', 'Count')
 */
export function toBarChartData(
  data: any[],
  categoryKey: string,
  valueKey: string,
  unit?: string
): BarChartData {
  return {
    categories: data.map(item => String(item[categoryKey])),
    values: data.map(item => Number(item[valueKey])),
    unit
  }
}

/**
 * Convert array data to ECharts pie chart format
 * @param data Source data array
 * @param nameKey Key for slice names (e.g., 'conceptName', 'gender')
 * @param valueKey Key for slice values (e.g., 'count', 'percentage')
 */
export function toPieChartData(
  data: any[],
  nameKey: string,
  valueKey: string
): PieChartData[] {
  return data.map(item => ({
    name: String(item[nameKey]),
    value: Number(item[valueKey])
  }))
}

/**
 * Convert array data to ECharts line chart format
 * @param data Source data array
 * @param xKey Key for X-axis data (e.g., 'date', 'dayOffset')
 * @param yKey Key for Y-axis data (e.g., 'prevalence', 'count')
 * @param seriesName Optional series name for legend
 */
export function toLineChartData(
  data: any[],
  xKey: string,
  yKey: string,
  seriesName?: string
): LineChartData {
  return {
    xAxis: data.map(item => String(item[xKey])),
    yAxis: data.map(item => Number(item[yKey])),
    seriesName
  }
}

/**
 * Convert array data to ECharts treemap format
 * @param data Source data array
 * @param nameKey Key for node names (e.g., 'conceptName')
 * @param valueKey Key for node values (e.g., 'personCount', 'prevalence')
 */
export function toTreemapData(
  data: any[],
  nameKey: string,
  valueKey: string
): TreemapNode[] {
  return data.map(item => ({
    name: String(item[nameKey]),
    value: Number(item[valueKey])
  }))
}

/**
 * Group treemap data by category for hierarchical treemaps
 * @param data Source data array
 * @param categoryKey Key for grouping (e.g., 'soc', 'atc1')
 * @param nameKey Key for node names
 * @param valueKey Key for node values
 */
export function toHierarchicalTreemapData(
  data: any[],
  categoryKey: string,
  nameKey: string,
  valueKey: string
): TreemapNode[] {
  // Group by category
  const grouped = data.reduce((acc, item) => {
    const category = item[categoryKey] || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, any[]>)

  // Convert to hierarchical structure
  return Object.entries(grouped).map(([category, items]) => ({
    name: category,
    value: items.reduce((sum, item) => sum + Number(item[valueKey]), 0),
    children: items.map(item => ({
      name: String(item[nameKey]),
      value: Number(item[valueKey])
    }))
  }))
}

/**
 * Format percentage for display
 * @param value Percentage value (0-100)
 * @param decimals Number of decimal places (default: 1)
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format large numbers with comma separators
 * @param value Number to format
 */
export function formatNumber(value: number): string {
  return value.toLocaleString()
}

/**
 * Format duration in days to human-readable format
 * @param days Number of days
 */
export function formatDuration(days: number): string {
  if (days < 30) {
    return `${days} days`
  } else if (days < 365) {
    const months = Math.round(days / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  } else {
    const years = Math.round(days / 365 * 10) / 10
    return `${years} year${years > 1 ? 's' : ''}`
  }
}

// ============================================================================
// Additional Report Mappers (T090-T100)
// ============================================================================

/**
 * Map WebAPI persons exposure data to internal PersonsExposureReport format
 * Used for both baseline (T090) and cohort (T091) reports
 */
export function mapPersonsExposureReport(data: import('@/models/report.types').WebAPIPersonsExposureRaw): import('@/models/report.types').PersonsExposureReport {
  const prevalence: import('@/models/report.types').PersonsExposureData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI visits data to internal VisitsReport format
 * Used for both baseline (T092) and cohort (T095) reports
 */
export function mapVisitsReport(data: import('@/models/report.types').WebAPIVisitsRaw): import('@/models/report.types').VisitsReport {
  const prevalence: import('@/models/report.types').VisitsData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI visit dates data to internal VisitDatesReport format
 * Used for both baseline (T093) and cohort (T096) reports
 */
export function mapVisitDatesReport(data: import('@/models/report.types').WebAPIVisitDatesRaw): import('@/models/report.types').VisitDatesReport {
  const visitData: import('@/models/report.types').VisitDatesData[] = data.map(item => ({
    date: item.xCalendarDate,
    visitCount: item.yRecordCount,
    personCount: item.yRecordCount // API doesn't separate these
  }))

  return { data: visitData }
}

/**
 * Map WebAPI care site visit dates data to internal CareSiteVisitDatesReport format
 * Used for both baseline (T094) and cohort (T097) reports
 */
export function mapCareSiteVisitDatesReport(data: import('@/models/report.types').WebAPICareSiteVisitDatesRaw): import('@/models/report.types').CareSiteVisitDatesReport {
  const careSiteData: import('@/models/report.types').CareSiteVisitDatesData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const careSiteName = pathParts[pathParts.length - 1] || `Care Site ${item.conceptId}`

    return {
      careSiteId: item.conceptId,
      careSiteName,
      visitCount: item.countValue,
      personCount: item.numPersons
    }
  })

  return { data: careSiteData }
}

/**
 * Map WebAPI drug utilization data to internal DrugUtilizationReport format
 * Used for both baseline (T098) and cohort (T099) reports
 */
export function mapDrugUtilizationReport(data: import('@/models/report.types').WebAPIDrugUtilizationRaw): import('@/models/report.types').DrugUtilizationReport {
  const prevalence: import('@/models/report.types').DrugUtilizationData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI Heracles Heel data to internal HeraclesHeelReport format
 * T100: Data quality report
 */
export function mapHeraclesHeelReport(data: import('@/models/report.types').WebAPIHeraclesHeelRaw): import('@/models/report.types').HeraclesHeelReport {
  const results: import('@/models/report.types').HeraclesHeelData[] = data.map(item => {
    // Map severity level string to enum
    let severity: 'ERROR' | 'WARNING' | 'NOTIFICATION' = 'NOTIFICATION'
    if (item.severityLevel === 'ERROR') {
      severity = 'ERROR'
    } else if (item.severityLevel === 'WARNING') {
      severity = 'WARNING'
    }

    return {
      analysisId: item.analysisId,
      analysisName: item.analysisName,
      heelRule: item.heelRule,
      recordCount: item.recordCount,
      severity
    }
  })

  return { results }
}

// ============================================================================
// New Report Mappers (T080-T089)
// ============================================================================

/**
 * Map WebAPI conditions by index data to internal format
 * T080: Conditions by index report
 */
export function mapConditionsByIndexReport(data: import('@/models/report.types').WebAPIConditionsByIndexRaw): import('@/models/report.types').ConditionsByIndexReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI death data to internal format
 * T081: Death report
 */
export function mapDeathReport(data: import('@/models/report.types').WebAPIDeathRaw): import('@/models/report.types').DeathReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI drug exposure data to internal format
 * T082: Drug exposure report
 */
export function mapDrugExposureReport(data: import('@/models/report.types').WebAPIDrugExposureRaw): import('@/models/report.types').DrugExposureReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI drugs by index data to internal format
 * T083: Drugs by index report
 */
export function mapDrugsByIndexReport(data: import('@/models/report.types').WebAPIDrugsByIndexRaw): import('@/models/report.types').DrugsByIndexReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI observation periods data to internal format
 * T084: Observation periods report
 */
export function mapObservationPeriodsReport(data: import('@/models/report.types').WebAPIObservationPeriodsRaw): import('@/models/report.types').ObservationPeriodsReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI procedure data to internal format
 * T085: Procedure report
 */
export function mapProcedureReport(data: import('@/models/report.types').WebAPIProcedureRaw): import('@/models/report.types').ProcedureReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI procedures by index data to internal format
 * T086: Procedures by index report
 */
export function mapProceduresByIndexReport(data: import('@/models/report.types').WebAPIProceduresByIndexRaw): import('@/models/report.types').ProceduresByIndexReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI data completeness data to internal format
 * T087: Data completeness report
 */
export function mapDataCompletenessReport(data: import('@/models/report.types').WebAPIDataCompletenessRaw): import('@/models/report.types').DataCompletenessReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI entropy data to internal format
 * T088: Entropy report
 */
export function mapEntropyReport(data: import('@/models/report.types').WebAPIEntropyRaw): import('@/models/report.types').EntropyReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}

/**
 * Map WebAPI tornado data to internal format
 * T089: Tornado report
 */
export function mapTornadoReport(data: import('@/models/report.types').WebAPITornadoRaw): import('@/models/report.types').TornadoReport {
  const prevalence: import('@/models/report.types').ConditionData[] = data.map(item => {
    const pathParts = item.conceptPath.split('||')
    const conceptName = pathParts[pathParts.length - 1] || `Concept ${item.conceptId}`

    return {
      conceptId: item.conceptId,
      conceptName,
      recordsPerPerson: item.recordsPerPerson,
      personCount: item.numPersons,
      prevalence: item.percentPersons * 100
    }
  })

  return { prevalence }
}
