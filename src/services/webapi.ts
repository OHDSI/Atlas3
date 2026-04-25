/**
 * OHDSI WebAPI Client
 * HTTP client for Atlas WebAPI endpoints
 *
 * In development: Uses Vite proxy (/WebAPI -> https://atlas-demo.ohdsi.org/WebAPI)
 * In production: Override with VITE_WEBAPI_URL environment variable
 */
import { logger } from '@/utils/logger'
import { type ApiResult, success, failure } from '@/types/api'
import {
  CDMSourceListSchema,
  CohortGenerationInfoListSchema,
  type CDMSource,
  type GenerationJob,
  type CohortGenerationInfoList,
  type GenerationStatus,
} from '@/models/webapi.types'
import { ConceptSearchResponseSchema, type Concept, type ConceptSet } from '@/models/concept-set.types'
import {
  type AtlasCohortDefinition,
  type AtlasCohortDefinitionInput,
  isAtlasCohortDefinitionWrapper,
} from '@/models/atlas.types'
import type { ValidationResponse } from '@/models/cohort-validation.types'
import {
  WebAPIReportResponseSchema,
  type WebAPIReportResponse,
  InclusionRuleReportSchema,
  type InclusionRuleReport,
  type InclusionRuleReportMode,
  type InclusionTreemapNode,
} from '@/models/report.types'
import { httpClient, getBaseUrl, type HttpClientOptions } from '@/services/http-client'

/**
 * @deprecated Use httpClient from '@/services/http-client' for new code
 */
export async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const clientOptions: HttpClientOptions = {
    method: options?.method,
    headers: options?.headers,
  }

  if (options?.body) {
    clientOptions.body = options.body
  }

  return httpClient<T>(endpoint, clientOptions)
}

/**
 * Get list of available CDM data sources
 * Endpoint: GET /source/sources
 */
export async function fetchCDMSources(): Promise<ApiResult<CDMSource[]>> {
  try {
    const data = await fetchJSON<unknown>('/source/sources')
    const parsed = CDMSourceListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('WebAPI', 'CDM sources validation error', parsed.error)
      return failure('Invalid CDM sources response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch CDM sources'
    logger.error('WebAPI', 'Failed to fetch CDM sources', error)
    return failure(message)
  }
}

/**
 * Search for concepts in vocabulary
 * Endpoint: GET /vocabulary/{sourceKey}/search?query={query}
 */
export async function searchConcepts(
  sourceKey: string,
  query: string,
  domain?: string
): Promise<ApiResult<Concept[]>> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    return failure('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  let endpoint = `/vocabulary/${sourceKey}/search?query=${encodeURIComponent(query)}`

  if (domain) {
    endpoint += `&domain=${encodeURIComponent(domain)}`
  }

  try {
    const data = await fetchJSON<unknown>(endpoint)
    const parsed = ConceptSearchResponseSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('WebAPI', 'Concept search validation failed', parsed.error)
      return failure('Invalid concept search response format')
    }

    return success(parsed.data.map(c => ({
      conceptId: c.CONCEPT_ID,
      conceptName: c.CONCEPT_NAME,
      conceptCode: c.CONCEPT_CODE,
      domainId: c.DOMAIN_ID,
      vocabularyId: c.VOCABULARY_ID,
      conceptClassId: c.CONCEPT_CLASS_ID,
      standardConcept: c.STANDARD_CONCEPT,
      invalidReason: c.INVALID_REASON,
    })))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search concepts'
    logger.error('WebAPI', 'searchConcepts error', error)
    return failure(message)
  }
}


/**
 * Get cohort definition by ID
 * Endpoint: GET /cohortdefinition/{id}
 */
export async function getCohortDefinition(id: number): Promise<AtlasCohortDefinition | null> {
  try {
    return await fetchJSON<AtlasCohortDefinition>(`/cohortdefinition/${id}`)
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch cohort definition ${id}`, error)
    return null
  }
}

/**
 * WebAPI save payload format
 */
interface CohortSavePayload {
  id?: number
  name: string
  description?: string
  expressionType?: string
  expression: object // Must be object, not stringified JSON
}

/**
 * Save cohort definition (create or update)
 * Endpoint: POST /cohortdefinition (create) or PUT /cohortdefinition/{id} (update)
 */
export async function saveCohortDefinition(
  cohort: CohortSavePayload
): Promise<CohortSavePayload | null> {
  try {
    logger.debug('WebAPI', 'Saving cohort definition', { id: cohort.id, name: cohort.name })
    if (cohort.id) {
      // Update existing
      return await fetchJSON<CohortSavePayload>(`/cohortdefinition/${cohort.id}`, {
        method: 'PUT',
        body: JSON.stringify(cohort),
      })
    } else {
      // Create new
      return await fetchJSON<CohortSavePayload>('/cohortdefinition', {
        method: 'POST',
        body: JSON.stringify(cohort),
      })
    }
  } catch (error) {
    logger.error('WebAPI', 'Failed to save cohort definition', error)
    return null
  }
}

/**
 * Delete cohort definition
 * Endpoint: DELETE /cohortdefinition/{id}
 */
export async function deleteCohortDefinition(id: number): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${id}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    logger.error('WebAPI', `Failed to delete cohort definition ${id}`, error)
    return false
  }
}

/**
 * Assign tag to cohort definition
 */
export async function assignTagToCohort(cohortId: number, tagId: number): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${cohortId}/tag/`, {
      method: 'POST',
      body: JSON.stringify(tagId),
    })
    return true
  } catch (error) {
    logger.error('WebAPI', `Failed to assign tag ${tagId} to cohort ${cohortId}`, error)
    return false
  }
}

/**
 * Unassign tag from cohort definition
 */
export async function unassignTagFromCohort(cohortId: number, tagId: number): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${cohortId}/tag/${tagId}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    logger.error('WebAPI', `Failed to unassign tag ${tagId} from cohort ${cohortId}`, error)
    return false
  }
}

/**
 * Generate cohort for a specific data source
 * Endpoint: GET /cohortdefinition/{id}/generate/{sourceKey}
 * Returns job execution info that needs to be converted to GenerationJob format
 */
export async function generateCohort(
  cohortId: number,
  sourceKey: string
): Promise<GenerationJob | null> {
  try {
    const data = await fetchJSON<{
      status?: string
      executionId?: number
      startDate?: string
      endDate?: string
    }>(
      `/cohortdefinition/${cohortId}/generate/${sourceKey}`,
      {
        method: 'GET',
      }
    )

    // The API returns a job execution object with format:
    // { status: "STARTING", executionId: number, jobParameters: {...} }
    // We need to convert this to our GenerationJob format

    // Map status from job execution to our GenerationStatus
    let status: GenerationStatus = 'PENDING'
    if (data.status === 'STARTING' || data.status === 'STARTED') {
      status = 'PENDING'
    } else if (data.status === 'RUNNING') {
      status = 'RUNNING'
    } else if (data.status === 'COMPLETED' || data.status === 'COMPLETE') {
      status = 'COMPLETE'
    } else if (data.status === 'FAILED') {
      status = 'FAILED'
    }

    const job: GenerationJob = {
      id: data.executionId || Date.now(),
      cohortDefinitionId: cohortId,
      sourceKey: sourceKey,
      status: status,
      startTime: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      endTime: data.endDate ? new Date(data.endDate).toISOString() : undefined,
    }

    return job
  } catch (error) {
    logger.error('WebAPI', 'Failed to generate cohort', error)
    return null
  }
}

/**
 * Get cohort generation info/status
 * Endpoint: GET /cohortdefinition/{id}/info
 * Returns array of generation info for all sources
 */
export async function getCohortGenerationInfo(cohortId: number): Promise<ApiResult<CohortGenerationInfoList>> {
  try {
    const data = await fetchJSON<unknown>(`/cohortdefinition/${cohortId}/info`)
    const parsed = CohortGenerationInfoListSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('WebAPI', 'Cohort generation info validation error', parsed.error)
      return failure('Invalid cohort generation info response format')
    }

    return success(parsed.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to fetch cohort generation info for ${cohortId}`
    logger.error('WebAPI', `Failed to fetch cohort generation info for ${cohortId}`, error)
    return failure(message)
  }
}

/**
 * Get concept set by ID
 * Endpoint: GET /conceptset/{id}
 */
export async function getConceptSet(id: number | string): Promise<ConceptSet | null> {
  try {
    return await fetchJSON<ConceptSet>(`/conceptset/${id}`)
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch concept set ${id}`, error)
    return null
  }
}

/**
 * Get all concept sets
 * Endpoint: GET /conceptset
 */
export async function getAllConceptSets(): Promise<ApiResult<ConceptSet[]>> {
  try {
    const data = await fetchJSON<ConceptSet[]>('/conceptset')
    return success(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch concept sets'
    logger.error('WebAPI', 'Failed to fetch concept sets', error)
    return failure(message)
  }
}

/**
 * Create new concept set
 * Endpoint: POST /conceptset
 */
export async function createConceptSet(conceptSet: ConceptSet): Promise<ConceptSet | null> {
  try {
    return await fetchJSON<ConceptSet>('/conceptset', {
      method: 'POST',
      body: JSON.stringify(conceptSet),
    })
  } catch (error) {
    logger.error('WebAPI', 'Failed to create concept set', error)
    return null
  }
}

/**
 * Update existing concept set
 * Endpoint: PUT /conceptset/{id}
 */
export async function updateConceptSet(conceptSet: ConceptSet): Promise<ConceptSet | null> {
  try {
    return await fetchJSON<ConceptSet>(`/conceptset/${conceptSet.id}`, {
      method: 'PUT',
      body: JSON.stringify(conceptSet),
    })
  } catch (error) {
    logger.error('WebAPI', `Failed to update concept set ${conceptSet.id}`, error)
    return null
  }
}

/**
 * Delete concept set
 * Endpoint: DELETE /conceptset/{id}
 */
export async function deleteConceptSet(id: number | string): Promise<boolean> {
  try {
    await fetchJSON(`/conceptset/${id}`, {
      method: 'DELETE',
    })
    return true
  } catch (error) {
    logger.error('WebAPI', `Failed to delete concept set ${id}`, error)
    return false
  }
}

/**
 * Get all cohort definitions
 * Endpoint: GET /cohortdefinition
 * Returns summary list of all cohorts
 */
export async function getCohorts(): Promise<ApiResult<import('@/models/webapi.types').CohortDefinitionSummary[]>> {
  try {
    const response = await fetchJSON<unknown[]>('/cohortdefinition')
    const { CohortDefinitionListSchema } = await import('@/models/webapi.types')
    const result = CohortDefinitionListSchema.safeParse(response)
    if (!result.success) {
      logger.error('WebAPI', 'Cohort list validation failed', result.error)
      return failure('Invalid cohort list response format')
    }
    return success(result.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch cohorts'
    logger.error('WebAPI', 'Failed to fetch cohorts', error)
    return failure(message)
  }
}

/**
 * Delete cohort definition
 * Endpoint: DELETE /cohortdefinition/{id}
 */
export async function deleteCohort(id: number): Promise<void> {
  await fetchJSON(`/cohortdefinition/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Validate cohort definition and get warnings
 * Endpoint: POST /cohortdefinition/checkV2
 * @param name Cohort name
 * @param expression Cohort expression object
 * @returns Validation response with warnings
 */
export async function validateCohortDefinition(
  name: string,
  expression: object
): Promise<ValidationResponse> {
  try {
    logger.debug('WebAPI', 'Calling checkV2', { name })
    const data = await fetchJSON<ValidationResponse>('/cohortdefinition/checkV2', {
      method: 'POST',
      body: JSON.stringify({ name, expression }),
    })
    logger.debug('WebAPI', 'checkV2 response', { warningCount: data.warnings?.length ?? 0 })
    return data
  } catch (error) {
    logger.error('WebAPI', 'Failed to validate cohort definition', error)
    // Return error as a warning so user sees it
    const errorMessage = error instanceof Error ? error.message : 'Validation request failed'
    return {
      warnings: [{
        type: 'DefaultWarning',
        severity: 'WARNING',
        message: `Validation error: ${errorMessage}`
      }]
    }
  }
}

// ============================================================================
// Report Endpoints
// ============================================================================

/**
 * Get comprehensive cohort report data for a generated cohort
 * Endpoint: GET /cohortdefinition/{id}/report/{sourceKey}
 */
export async function getCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<WebAPIReportResponse | null> {
  try {
    const data = await fetchJSON<unknown>(
      `/cohortdefinition/${cohortId}/report/${sourceKey}`
    )

    // Validate response structure
    const parsed = WebAPIReportResponseSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('WebAPI', 'Cohort report validation error', parsed.error)
      return null
    }

    // Ensure summary is not undefined
    if (!parsed.data.summary) {
      logger.error('WebAPI', 'Cohort report missing summary')
      return null
    }

    return parsed.data as WebAPIReportResponse
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
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
 * Endpoint: GET /cohortdefinition/{id}/report/{sourceKey}?mode={0|1|2}
 */
export async function getInclusionRuleReport(
  cohortId: number,
  sourceKey: string,
  mode: InclusionRuleReportMode = 0
): Promise<InclusionRuleReport | null> {
  try {
    const data = await fetchJSON<unknown>(
      `/cohortdefinition/${cohortId}/report/${sourceKey}?mode=${mode}`
    )

    const parsed = InclusionRuleReportSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('WebAPI', 'Inclusion-rule report validation error', parsed.error)
      return null
    }

    let treemap: InclusionTreemapNode | null = null
    const raw = parsed.data.treemapData?.trim()
    if (raw) {
      try {
        treemap = JSON.parse(raw) as InclusionTreemapNode
      } catch (err) {
        logger.warn('WebAPI', 'Inclusion-rule report: treemapData was not valid JSON', err)
      }
    }

    return {
      summary: parsed.data.summary,
      inclusionRuleStats: parsed.data.inclusionRuleStats,
      treemap,
      prevalenceThreshold: parsed.data.prevalenceThreshold,
    }
  } catch (error) {
    logger.error(
      'WebAPI',
      `Failed to fetch inclusion-rule report for ${cohortId}/${sourceKey} (mode=${mode})`,
      error
    )
    return null
  }
}

/**
 * Get person demographics report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/person
 */
export async function getPersonReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIPersonRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIPersonRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/person`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch person report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get condition eras report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/conditionera
 */
export async function getConditionErasReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIConditionEraRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIConditionEraRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/conditionera`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch condition eras report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get condition occurrence report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/condition
 */
export async function getConditionReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIConditionRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIConditionRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/condition`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch condition report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get drug eras report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugera
 */
export async function getDrugErasReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDrugEraRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrugEraRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugera`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug eras report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get cohort-specific analytics report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/cohortspecific
 */
export async function getCohortSpecificReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPICohortSpecificRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPICohortSpecificRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/cohortspecific`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch cohort specific report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Analysis IDs for different report types
 * Based on Atlas Heracles analysis identifiers
 */
const FULL_ANALYSIS_IDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115,
  200, 201, 202, 203, 204, 206, 207, 208, 209, 210, 211, 212, 213, 220,
  301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 320,
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 420,
  500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515,
  600, 601, 602, 603, 604, 605, 606, 607, 608, 609, 610, 611, 612, 613, 620,
  700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 711, 712, 713, 720,
  800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 820,
  900, 901, 902, 903, 904, 905, 906, 907, 908, 909, 910, 920,
  1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1020,
  1800, 1801, 1802, 1803, 1804, 1805, 1806, 1807, 1808, 1809, 1810, 1811, 1812, 1813, 1814, 1815, 1816, 1820
]

const QUICK_ANALYSIS_IDS = [
  0, 1, 2, 101, 200, 301, 400, 500, 600, 700, 800, 900, 1000, 1800
]

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
): Promise<boolean> {
  try {
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
      rollupUtilizationDrug: rollupUtilization
    }

    await fetchJSON('/cohortanalysis', {
      method: 'POST',
      body: JSON.stringify(cohortJob),
    })
    return true
  } catch (error) {
    logger.error('WebAPI', `Failed to trigger cohort analysis for ${cohortId}/${sourceKey}`, error)
    return false
  }
}

/**
 * Trigger Full Analysis batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerFullAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  return triggerCohortAnalysis(cohortId, sourceKey, FULL_ANALYSIS_IDS, true, true)
}

/**
 * Trigger Quick Analysis batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerQuickAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  return triggerCohortAnalysis(cohortId, sourceKey, QUICK_ANALYSIS_IDS, true, false)
}

/**
 * Trigger Utilization batch job
 * Endpoint: POST /cohortanalysis
 */
export async function triggerUtilization(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  return triggerCohortAnalysis(cohortId, sourceKey, FULL_ANALYSIS_IDS, false, true)
}

/**
 * Get persons exposure baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/observationperiod
 */
export async function getPersonsExposureBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIPersonsExposureRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIPersonsExposureRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observationperiod`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch persons exposure baseline report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get persons exposure cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/cohort
 */
export async function getPersonsExposureCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIPersonsExposureRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIPersonsExposureRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/cohort`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch persons exposure cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get visits baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitsbaseline
 */
export async function getVisitsBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIVisitsRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIVisitsRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitsbaseline`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch visits baseline report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get visit dates baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitdatesbaseline
 */
export async function getVisitDatesBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIVisitDatesRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitdatesbaseline`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch visit dates baseline report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get care site visit dates baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/caresitevisitdatesbaseline
 */
export async function getCareSiteVisitDatesBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPICareSiteVisitDatesRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPICareSiteVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/caresitevisitdatesbaseline`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch care site visit dates baseline report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get visits cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitscohort
 */
export async function getVisitsCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIVisitsRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIVisitsRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitscohort`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch visits cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get visit dates cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/visitdatescohort
 */
export async function getVisitDatesCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIVisitDatesRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/visitdatescohort`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch visit dates cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get care site visit dates cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/caresitevisitdatescohort
 */
export async function getCareSiteVisitDatesCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPICareSiteVisitDatesRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPICareSiteVisitDatesRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/caresitevisitdatescohort`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch care site visit dates cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get drug utilization baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugutilizationbaseline
 */
export async function getDrugUtilizationBaselineReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDrugUtilizationRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrugUtilizationRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugutilizationbaseline`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug utilization baseline report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get drug utilization cohort report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugutilizationcohort
 */
export async function getDrugUtilizationCohortReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDrugUtilizationRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrugUtilizationRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugutilizationcohort`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug utilization cohort report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get Heracles Heel report (data quality)
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/heraclesheel
 */
export async function getHeraclesHeelReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIHeraclesHeelRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIHeraclesHeelRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/heraclesheel`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch Heracles Heel report for ${cohortId}/${sourceKey}`, error)
    return null
  }
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
  try {
    const data = await fetchJSON<number[]>(
      `/cohortresults/${sourceKey}/${cohortId}/analyses`
    )
    return success(data || [])
  } catch (error) {
    const message = error instanceof Error ? error.message : `Failed to fetch completed analyses for ${cohortId}/${sourceKey}`
    logger.error('WebAPI', `Failed to fetch completed analyses for ${cohortId}/${sourceKey}`, error)
    return failure(message)
  }
}

/**
 * Get conditions by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/conditionsbyindex
 */
export async function getConditionsByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIConditionsByIndexRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIConditionsByIndexRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/conditionsbyindex`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch conditions by index report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get death report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/death
 */
export async function getDeathReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDeathRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDeathRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/death`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch death report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get drug exposure report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugexposure
 */
export async function getDrugExposureReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDrugExposureRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrugExposureRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugexposure`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug exposure report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get drugs by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/drugsbyindex
 */
export async function getDrugsByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDrugsByIndexRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrugsByIndexRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugsbyindex`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drugs by index report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get observation periods report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/observationperiod
 */
export async function getObservationPeriodsReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIObservationPeriodsRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIObservationPeriodsRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observationperiod`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch observation periods report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get procedure report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/procedure
 */
export async function getProcedureReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIProcedureRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIProcedureRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/procedure`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch procedure report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get procedures by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/proceduresbyindex
 */
export async function getProceduresByIndexReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIProceduresByIndexRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIProceduresByIndexRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/proceduresbyindex`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch procedures by index report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get data completeness report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/datacompleteness
 */
export async function getDataCompletenessReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIDataCompletenessRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDataCompletenessRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/datacompleteness`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch data completeness report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get entropy report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/entropy
 */
export async function getEntropyReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPIEntropyRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIEntropyRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/entropy`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch entropy report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

/**
 * Get tornado report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/tornado
 */
export async function getTornadoReport(
  cohortId: number,
  sourceKey: string
): Promise<import('@/models/report.types').WebAPITornadoRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPITornadoRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/tornado`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch tornado report for ${cohortId}/${sourceKey}`, error)
    return null
  }
}

// ============================================================================
// Drill-Down Reports - Data Sources (CDM Results)
// ============================================================================

/**
 * Get drill-down details for any domain in data sources
 * GET /cdmresults/{sourceKey}/{domain}/{conceptId}
 */
export async function getCDMDrilldown(
  sourceKey: string,
  domain: string,
  conceptId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cdmresults/${sourceKey}/${domain}/${conceptId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch CDM drill-down for ${sourceKey}/${domain}/${conceptId}`, error)
    return null
  }
}

// ============================================================================
// Drill-Down Reports - Cohort Results
// ============================================================================

/**
 * Get condition drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/condition/{conditionId}
 */
export async function getConditionDrilldown(
  sourceKey: string,
  cohortId: number,
  conditionId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/condition/${conditionId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch condition drill-down for ${cohortId}/${sourceKey}/${conditionId}`, error)
    return null
  }
}

/**
 * Get condition era drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/conditionera/{conditionId}
 */
export async function getConditionEraDrilldown(
  sourceKey: string,
  cohortId: number,
  conditionId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/conditionera/${conditionId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch condition era drill-down for ${cohortId}/${sourceKey}/${conditionId}`, error)
    return null
  }
}

/**
 * Get drug drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/drug/{drugId}
 */
export async function getDrugDrilldown(
  sourceKey: string,
  cohortId: number,
  drugId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drug/${drugId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug drill-down for ${cohortId}/${sourceKey}/${drugId}`, error)
    return null
  }
}

/**
 * Get drug era drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/drugera/{drugId}
 */
export async function getDrugEraDrilldown(
  sourceKey: string,
  cohortId: number,
  drugId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/drugera/${drugId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch drug era drill-down for ${cohortId}/${sourceKey}/${drugId}`, error)
    return null
  }
}

/**
 * Get measurement drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/measurement/{conceptId}
 */
export async function getMeasurementDrilldown(
  sourceKey: string,
  cohortId: number,
  conceptId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/measurement/${conceptId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch measurement drill-down for ${cohortId}/${sourceKey}/${conceptId}`, error)
    return null
  }
}

/**
 * Get observation drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/observation/{conceptId}
 */
export async function getObservationDrilldown(
  sourceKey: string,
  cohortId: number,
  conceptId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/observation/${conceptId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch observation drill-down for ${cohortId}/${sourceKey}/${conceptId}`, error)
    return null
  }
}

/**
 * Get procedure drill-down details
 * GET /cohortresults/{sourceKey}/{cohortId}/procedure/{procedureId}
 */
export async function getProcedureDrilldown(
  sourceKey: string,
  cohortId: number,
  procedureId: number
): Promise<import('@/models/report.types').WebAPIDrilldownRaw | null> {
  try {
    return await fetchJSON<import('@/models/report.types').WebAPIDrilldownRaw>(
      `/cohortresults/${sourceKey}/${cohortId}/procedure/${procedureId}`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch procedure drill-down for ${cohortId}/${sourceKey}/${procedureId}`, error)
    return null
  }
}

/**
 * Get printfriendly HTML representation of cohort definition
 * POST /cohortdefinition/printfriendly/cohort?format=html
 * The endpoint expects just the expression object from the cohort definition
 */
export async function getCohortPrintFriendly(
  cohortDefinition: AtlasCohortDefinitionInput
): Promise<string | null> {
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/cohortdefinition/printfriendly/cohort?format=html`
    const locale = localStorage.getItem('locale') || 'en'

    // The cohort definition from WebAPI has structure: { id, name, description, expression: {...} }
    // The printfriendly endpoint expects just the expression property
    let payload: AtlasCohortDefinition | string

    if (isAtlasCohortDefinitionWrapper(cohortDefinition)) {
      payload = cohortDefinition.expression
    } else {
      payload = cohortDefinition
    }

    // If expression is a string, parse it first
    if (typeof payload === 'string') {
      payload = JSON.parse(payload) as AtlasCohortDefinition
    }

    // Get auth token for the request
    let authHeader: string | undefined
    try {
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      if (authStore.token) {
        authHeader = `Bearer ${authStore.token}`
      }
    } catch {
      // Store not ready, continue without auth
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Language': locale,
    }
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    try {
      return await response.text()
    } catch (parseError) {
      logger.error('WebAPI', 'Failed to parse text response', parseError)
      throw new Error('Invalid response format')
    }
  } catch (error) {
    logger.error('WebAPI', 'Failed to fetch print-friendly cohort', error)
    return null
  }
}
