/**
 * Report Service
 * Cohort/CDM reports, batch analysis triggers, and drill-down endpoints
 * (WebAPI /cohortdefinition/.../report, /cohortresults/..., /cdmresults/...)
 */
import { logger } from '@/utils/logger'
import { httpGet, httpPost } from '@/services/http-client'
import { unwrap, ApiError, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import {
  WebAPIReportResponseSchema,
  type WebAPIReportResponse,
  InclusionRuleReportSchema,
  type InclusionRuleReport,
  type InclusionRuleReportMode,
  type InclusionTreemapNode,
  type WebAPIPersonRaw,
  type WebAPIConditionEraRaw,
  type WebAPIConditionRaw,
  type WebAPIDrugEraRaw,
  type WebAPICohortSpecificRaw,
  type WebAPIPersonsExposureRaw,
  type WebAPIVisitsRaw,
  type WebAPIVisitDatesRaw,
  type WebAPICareSiteVisitDatesRaw,
  type WebAPIDrugUtilizationRaw,
  type WebAPIHeraclesHeelRaw,
  type WebAPIConditionsByIndexRaw,
  type WebAPIDeathRaw,
  type WebAPIDrugExposureRaw,
  type WebAPIDrugsByIndexRaw,
  type WebAPIObservationPeriodsRaw,
  type WebAPIProcedureRaw,
  type WebAPIProceduresByIndexRaw,
  type WebAPIDataCompletenessRaw,
  type WebAPIEntropyRaw,
  type WebAPITornadoRaw,
  type WebAPIDrilldownRaw,
} from '@/models/report.types'

const CONTEXT = 'ReportService'

/**
 * Get comprehensive cohort report data for a generated cohort
 * Endpoint: GET /cohortdefinition/{id}/report/{sourceKey}
 */
export async function getCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIReportResponse>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohortdefinition/${cohortId}/report/${sourceKey}`)

    const parsed = parseOrThrow(WebAPIReportResponseSchema, data, 'Invalid cohort report response')
    if (!parsed.summary) {
      throw new ApiError('Invalid cohort report response: missing summary', 0, null)
    }

    return parsed as WebAPIReportResponse
  }, CONTEXT)
}

/**
 * Get the inclusion-rule (generation) report for a generated cohort.
 *
 * Mirrors Atlas 2.15's "Inclusion Report" plugin. The server returns:
 *   - `summary`            – baseCount / finalCount / lostCount / percentMatched
 *   - `inclusionRuleStats` – per-rule attrition statistics
 *   - `treemapData`        – JSON-stringified hierarchical population breakdown
 *
 * This wrapper validates the envelope and parses `treemapData` into a typed tree.
 *
 * Endpoint: GET /cohortdefinition/{id}/report/{sourceKey}/inclusion?mode={0|1|2}
 */
export async function getInclusionRuleReport(
  cohortId: number,
  sourceKey: string,
  mode: InclusionRuleReportMode = 0
): Promise<ApiResult<InclusionRuleReport>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/cohortdefinition/${cohortId}/report/${sourceKey}/inclusion?mode=${mode}`
    )

    const parsed = parseOrThrow(InclusionRuleReportSchema, data, 'Invalid inclusion-rule report response')

    let treemap: InclusionTreemapNode | null = null
    const raw = parsed.treemapData?.trim()
    if (raw) {
      try {
        treemap = JSON.parse(raw) as InclusionTreemapNode
      } catch (err) {
        logger.warn(CONTEXT, 'Inclusion-rule report: treemapData was not valid JSON', err)
      }
    }

    return {
      summary: parsed.summary,
      inclusionRuleStats: parsed.inclusionRuleStats,
      treemap,
      prevalenceThreshold: parsed.prevalenceThreshold,
    }
  }, CONTEXT)
}

/**
 * Get person demographics report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/person
 */
export async function getPersonReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIPersonRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIPersonRaw>(`/cohortresults/${sourceKey}/${cohortId}/person`)
  }, CONTEXT)
}

/**
 * Get condition eras report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/conditionera
 */
export async function getConditionErasReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIConditionEraRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIConditionEraRaw>(`/cohortresults/${sourceKey}/${cohortId}/conditionera`)
  }, CONTEXT)
}

/**
 * Get condition occurrence report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/condition
 */
export async function getConditionReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIConditionRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIConditionRaw>(`/cohortresults/${sourceKey}/${cohortId}/condition`)
  }, CONTEXT)
}

/**
 * Get drug eras report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugera
 */
export async function getDrugErasReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDrugEraRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrugEraRaw>(`/cohortresults/${sourceKey}/${cohortId}/drugera`)
  }, CONTEXT)
}

/**
 * Get cohort-specific analytics report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/cohortspecific
 */
export async function getCohortSpecificReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPICohortSpecificRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPICohortSpecificRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/cohortspecific`
    )
  }, CONTEXT)
}

/**
 * Analysis IDs for different report types
 * Based on Atlas Heracles analysis identifiers
 */
const FULL_ANALYSIS_IDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 101, 102, 103, 104, 105,
  106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 200, 201, 202, 203, 204, 206, 207, 208, 209,
  210, 211, 212, 213, 220, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 320,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 420, 500, 501, 502, 503,
  504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 600, 601, 602, 603, 604, 605, 606,
  607, 608, 609, 610, 611, 612, 613, 620, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710,
  711, 712, 713, 720, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814,
  815, 816, 820, 900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 920, 1000, 1001, 1002, 1003,
  1004, 1005, 1006, 1007, 1008, 1009, 1010, 1020, 1800, 1801, 1802, 1803, 1804, 1805, 1806, 1807,
  1808, 1809, 1810, 1811, 1812, 1813, 1814, 1815, 1816, 1820,
]

const QUICK_ANALYSIS_IDS = [0, 1, 2, 101, 200, 301, 400, 500, 600, 700, 800, 900, 1000, 1800]

/**
 * Trigger cohort analysis job (Heracles)
 * Endpoint: POST /cohortanalysis
 * Based on Atlas implementation
 */
async function triggerCohortAnalysis(
  cohortId: number,
  sourceKey: string,
  analysisIds: number[],
  runHeraclesHeel: boolean = true,
  rollupUtilization: boolean = false
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    const cohortJob = {
      jobName: `HERACLES_COHORT_${cohortId}_${sourceKey}`,
      sourceKey: sourceKey,
      smallCellCount: 5,
      cohortDefinitionIds: [cohortId],
      analysisIds: analysisIds,
      runHeraclesHeel: runHeraclesHeel,
      cohortPeriodOnly: false,
      conditionConceptIds: [],
      drugConceptIds: [],
      procedureConceptIds: [],
      observationConceptIds: [],
      measurementConceptIds: [],
      periods: [],
      rollupUtilizationVisit: rollupUtilization,
      rollupUtilizationDrug: rollupUtilization,
    }

    await httpPost('/cohortanalysis', cohortJob)
  }, CONTEXT)
}

/**
 * Trigger Full Analysis batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerFullAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return triggerCohortAnalysis(cohortId, sourceKey, FULL_ANALYSIS_IDS, true, true)
}

/**
 * Trigger Quick Analysis batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerQuickAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return triggerCohortAnalysis(cohortId, sourceKey, QUICK_ANALYSIS_IDS, true, false)
}

/**
 * Trigger Utilization batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerUtilization(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return triggerCohortAnalysis(cohortId, sourceKey, FULL_ANALYSIS_IDS, false, true)
}

/**
 * Get persons exposure baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/observationperiod
 */
export async function getPersonsExposureBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIPersonsExposureRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIPersonsExposureRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observationperiod`
    )
  }, CONTEXT)
}

/**
 * Get persons exposure cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/cohort
 */
export async function getPersonsExposureCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIPersonsExposureRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIPersonsExposureRaw>(`/cohortresults/${sourceKey}/${cohortId}/cohort`)
  }, CONTEXT)
}

/**
 * Get visits baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitsbaseline
 */
export async function getVisitsBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIVisitsRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIVisitsRaw>(`/cohortresults/${sourceKey}/${cohortId}/visitsbaseline`)
  }, CONTEXT)
}

/**
 * Get visit dates baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitdatesbaseline
 */
export async function getVisitDatesBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIVisitDatesRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitdatesbaseline`
    )
  }, CONTEXT)
}

/**
 * Get care site visit dates baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/caresitevisitdatesbaseline
 */
export async function getCareSiteVisitDatesBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPICareSiteVisitDatesRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPICareSiteVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/caresitevisitdatesbaseline`
    )
  }, CONTEXT)
}

/**
 * Get visits cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitscohort
 */
export async function getVisitsCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIVisitsRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIVisitsRaw>(`/cohortresults/${sourceKey}/${cohortId}/visitscohort`)
  }, CONTEXT)
}

/**
 * Get visit dates cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitdatescohort
 */
export async function getVisitDatesCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIVisitDatesRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitdatescohort`
    )
  }, CONTEXT)
}

/**
 * Get care site visit dates cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/caresitevisitdatescohort
 */
export async function getCareSiteVisitDatesCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPICareSiteVisitDatesRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPICareSiteVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/caresitevisitdatescohort`
    )
  }, CONTEXT)
}

/**
 * Get drug utilization baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugutilizationbaseline
 */
export async function getDrugUtilizationBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDrugUtilizationRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrugUtilizationRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugutilizationbaseline`
    )
  }, CONTEXT)
}

/**
 * Get drug utilization cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugutilizationcohort
 */
export async function getDrugUtilizationCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDrugUtilizationRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrugUtilizationRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugutilizationcohort`
    )
  }, CONTEXT)
}

/**
 * Get Heracles Heel report (data quality)
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/heraclesheel
 */
export async function getHeraclesHeelReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIHeraclesHeelRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIHeraclesHeelRaw>(`/cohortresults/${sourceKey}/${cohortId}/heraclesheel`)
  }, CONTEXT)
}

/**
 * Get completed analyses for a cohort
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/analyses
 * Returns array of completed analysis IDs
 */
export async function getCompletedAnalyses(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<number[]>> {
  return unwrap(async () => {
    const data = await httpGet<number[]>(`/cohortresults/${sourceKey}/${cohortId}/analyses`)
    return data || []
  }, CONTEXT)
}

/**
 * Get conditions by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/conditionsbyindex
 */
export async function getConditionsByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIConditionsByIndexRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIConditionsByIndexRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/conditionsbyindex`
    )
  }, CONTEXT)
}

/**
 * Get death report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/death
 */
export async function getDeathReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDeathRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDeathRaw>(`/cohortresults/${sourceKey}/${cohortId}/death`)
  }, CONTEXT)
}

/**
 * Get drug exposure report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugexposure
 */
export async function getDrugExposureReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDrugExposureRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrugExposureRaw>(`/cohortresults/${sourceKey}/${cohortId}/drugexposure`)
  }, CONTEXT)
}

/**
 * Get drugs by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugsbyindex
 */
export async function getDrugsByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDrugsByIndexRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrugsByIndexRaw>(`/cohortresults/${sourceKey}/${cohortId}/drugsbyindex`)
  }, CONTEXT)
}

/**
 * Get observation periods report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/observationperiod
 */
export async function getObservationPeriodsReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIObservationPeriodsRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIObservationPeriodsRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observationperiod`
    )
  }, CONTEXT)
}

/**
 * Get procedure report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/procedure
 */
export async function getProcedureReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIProcedureRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIProcedureRaw>(`/cohortresults/${sourceKey}/${cohortId}/procedure`)
  }, CONTEXT)
}

/**
 * Get procedures by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/proceduresbyindex
 */
export async function getProceduresByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIProceduresByIndexRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIProceduresByIndexRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/proceduresbyindex`
    )
  }, CONTEXT)
}

/**
 * Get data completeness report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/datacompleteness
 */
export async function getDataCompletenessReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIDataCompletenessRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDataCompletenessRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/datacompleteness`
    )
  }, CONTEXT)
}

/**
 * Get entropy report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/entropy
 */
export async function getEntropyReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPIEntropyRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIEntropyRaw>(`/cohortresults/${sourceKey}/${cohortId}/entropy`)
  }, CONTEXT)
}

/**
 * Get tornado report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/tornado
 */
export async function getTornadoReport(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<WebAPITornadoRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPITornadoRaw>(`/cohortresults/${sourceKey}/${cohortId}/tornado`)
  }, CONTEXT)
}

/**
 * Get drill-down details for any domain in data sources
 * GET /cdmresults/{sourceKey}/{domain}/{conceptId}
 */
export async function getCDMDrilldown(
  sourceKey: string,
  domain: string,
  conceptId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(`/cdmresults/${sourceKey}/${domain}/${conceptId}`)
  }, CONTEXT)
}

/**
 * Get condition drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/condition/{conditionId}
 */
export async function getConditionDrilldown(
  sourceKey: string,
  cohortId: number,
  conditionId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/condition/${conditionId}`
    )
  }, CONTEXT)
}

/**
 * Get condition era drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/conditionera/{conditionId}
 */
export async function getConditionEraDrilldown(
  sourceKey: string,
  cohortId: number,
  conditionId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/conditionera/${conditionId}`
    )
  }, CONTEXT)
}

/**
 * Get drug drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/drug/{drugId}
 */
export async function getDrugDrilldown(
  sourceKey: string,
  cohortId: number,
  drugId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(`/cohortresults/${sourceKey}/${cohortId}/drug/${drugId}`)
  }, CONTEXT)
}

/**
 * Get drug era drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/drugera/{drugId}
 */
export async function getDrugEraDrilldown(
  sourceKey: string,
  cohortId: number,
  drugId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugera/${drugId}`
    )
  }, CONTEXT)
}

/**
 * Get measurement drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/measurement/{conceptId}
 */
export async function getMeasurementDrilldown(
  sourceKey: string,
  cohortId: number,
  conceptId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/measurement/${conceptId}`
    )
  }, CONTEXT)
}

/**
 * Get observation drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/observation/{conceptId}
 */
export async function getObservationDrilldown(
  sourceKey: string,
  cohortId: number,
  conceptId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observation/${conceptId}`
    )
  }, CONTEXT)
}

/**
 * Get procedure drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/procedure/{procedureId}
 */
export async function getProcedureDrilldown(
  sourceKey: string,
  cohortId: number,
  procedureId: number
): Promise<ApiResult<WebAPIDrilldownRaw>> {
  return unwrap(async () => {
    return await httpGet<WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/procedure/${procedureId}`
    )
  }, CONTEXT)
}
