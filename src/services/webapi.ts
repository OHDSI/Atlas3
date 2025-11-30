/**
 * OHDSI WebAPI Client
 * HTTP client for Atlas WebAPI endpoints
 * 
 * In development: Uses Vite proxy (/WebAPI -> https://atlas-demo.ohdsi.org/WebAPI)
 * In production: Override with VITE_WEBAPI_URL environment variable
 */
import {
  CDMSourceListSchema,
  CohortGenerationInfoListSchema,
  type CDMSource,
  type GenerationJob,
  type CohortGenerationInfoList,
  type GenerationStatus,
} from '@/models/webapi.types'
import { ConceptSearchResponseSchema, type Concept, type ConceptSet } from '@/models/concept-set.types'
import type { AtlasCohortDefinition } from '@/models/atlas.types'
import type { ValidationResponse } from '@/models/cohort-validation.types'
import {
  WebAPIReportResponseSchema,
  type WebAPIReportResponse
} from '@/models/report.types'

// Use relative path for proxy to avoid CORS in development
// Override with VITE_WEBAPI_URL environment variable if needed
const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 500

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable (network errors or 5xx server errors)
 */
function isRetryableError(error: unknown, statusCode?: number): boolean {
  // Retry on network errors
  if (error instanceof TypeError) {
    return true
  }

  // Retry on 5xx server errors
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true
  }

  // Retry on 429 (Too Many Requests)
  if (statusCode === 429) {
    return true
  }

  return false
}

/**
 * Generic fetch wrapper with error handling and retry logic
 * Exponential backoff with 3 attempts, 500ms initial delay
 * Adds User-Language header for i18n support
 */
async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Get current locale from localStorage for User-Language header
      const locale = localStorage.getItem('locale') || 'en'
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'User-Language': locale,
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)

        // Check if we should retry
        if (isRetryableError(error, response.status) && attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
          console.warn(`[WebAPI] Request failed (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}), retrying in ${delay}ms...`, error.message)
          await sleep(delay)
          continue
        }

        throw error
      }

      return await response.json() as T
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if network error is retryable
      if (isRetryableError(error) && attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[WebAPI] Network error (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}), retrying in ${delay}ms...`, lastError.message)
        await sleep(delay)
        continue
      }

      // Not retryable or max attempts reached
      if (error instanceof TypeError) {
        throw new Error(`Network error: ${error.message}`)
      }
      throw error
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Request failed after all retry attempts')
}

/**
 * Get list of available CDM data sources
 * Endpoint: GET /source/sources
 */
export async function fetchCDMSources(): Promise<CDMSource[]> {
  const data = await fetchJSON<unknown>('/source/sources')
  const parsed = CDMSourceListSchema.safeParse(data)

  if (!parsed.success) {
    console.error('CDM sources validation error:', parsed.error)
    return []
  }

  return parsed.data
}

/**
 * Search for concepts in vocabulary
 * Endpoint: GET /vocabulary/{sourceKey}/search?query={query}
 */
export async function searchConcepts(
  sourceKey: string,
  query: string,
  domain?: string
): Promise<Concept[]> {
  let endpoint = `/vocabulary/${sourceKey}/search?query=${encodeURIComponent(query)}`

  if (domain) {
    endpoint += `&domain=${encodeURIComponent(domain)}`
  }

  try {
    const data = await fetchJSON<unknown>(endpoint)
    const parsed = ConceptSearchResponseSchema.safeParse(data)

    if (!parsed.success) {
      console.error('[WebAPI] Concept search validation failed:', parsed.error)
    }

    return parsed.success ? parsed.data.map(c => ({
      conceptId: c.CONCEPT_ID,
      conceptName: c.CONCEPT_NAME,
      conceptCode: c.CONCEPT_CODE,
      domainId: c.DOMAIN_ID,
      vocabularyId: c.VOCABULARY_ID,
      conceptClassId: c.CONCEPT_CLASS_ID,
      standardConcept: c.STANDARD_CONCEPT,
      invalidReason: c.INVALID_REASON,
    })) : []
  } catch (error) {
    console.error('[WebAPI] searchConcepts error:', error)
    throw error
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
    console.error(`Failed to fetch cohort definition ${id}:`, error)
    return null
  }
}

/**
 * Save cohort definition (create or update)
 * Endpoint: POST /cohortdefinition (create) or PUT /cohortdefinition/{id} (update)
 */
export async function saveCohortDefinition(
  cohort: AtlasCohortDefinition
): Promise<AtlasCohortDefinition | null> {
  try {
    if (cohort.id) {
      // Update existing
      return await fetchJSON<AtlasCohortDefinition>(`/cohortdefinition/${cohort.id}`, {
        method: 'PUT',
        body: JSON.stringify(cohort),
      })
    } else {
      // Create new
      return await fetchJSON<AtlasCohortDefinition>('/cohortdefinition', {
        method: 'POST',
        body: JSON.stringify(cohort),
      })
    }
  } catch (error) {
    console.error('Failed to save cohort definition:', error)
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
    console.error(`Failed to delete cohort definition ${id}:`, error)
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
    const data = await fetchJSON<any>(
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
    console.error('Failed to generate cohort:', error)
    return null
  }
}

/**
 * Get cohort generation info/status
 * Endpoint: GET /cohortdefinition/{id}/info
 * Returns array of generation info for all sources
 */
export async function getCohortGenerationInfo(cohortId: number): Promise<CohortGenerationInfoList> {
  try {
    const data = await fetchJSON<unknown>(`/cohortdefinition/${cohortId}/info`)
    const parsed = CohortGenerationInfoListSchema.safeParse(data)

    if (!parsed.success) {
      console.error('Cohort generation info validation error:', parsed.error)
      return []
    }

    return parsed.data
  } catch (error) {
    console.error(`Failed to fetch cohort generation info for ${cohortId}:`, error)
    return []
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
    console.error(`Failed to fetch concept set ${id}:`, error)
    return null
  }
}

/**
 * Get all concept sets
 * Endpoint: GET /conceptset
 */
export async function getAllConceptSets(): Promise<ConceptSet[]> {
  try {
    return await fetchJSON<ConceptSet[]>('/conceptset')
  } catch (error) {
    console.error('Failed to fetch concept sets:', error)
    return []
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
    console.error('Failed to create concept set:', error)
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
    console.error(`Failed to update concept set ${conceptSet.id}:`, error)
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
    console.error(`Failed to delete concept set ${id}:`, error)
    return false
  }
}

/**
 * Get all cohort definitions
 * Endpoint: GET /cohortdefinition
 * Returns summary list of all cohorts
 */
export async function getCohorts(): Promise<import('@/models/webapi.types').CohortDefinitionSummary[]> {
  const response = await fetchJSON<unknown[]>('/cohortdefinition')
  const { CohortDefinitionListSchema } = await import('@/models/webapi.types')
  const validated = CohortDefinitionListSchema.parse(response)
  return validated
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
    const data = await fetchJSON<ValidationResponse>('/cohortdefinition/checkV2', {
      method: 'POST',
      body: JSON.stringify({ name, expression }),
    })
    return data
  } catch (error) {
    console.error('Failed to validate cohort definition:', error)
    // Return empty warnings on error
    return { warnings: [] }
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
      console.error('Cohort report validation error:', parsed.error)
      return null
    }

    // Ensure summary is not undefined
    if (!parsed.data.summary) {
      console.error('Cohort report missing summary')
      return null
    }

    return parsed.data as WebAPIReportResponse
  } catch (error) {
    console.error(`Failed to fetch cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch person report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch condition eras report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch condition report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch drug eras report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch cohort specific report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to trigger cohort analysis for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch persons exposure baseline report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch persons exposure cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch visits baseline report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch visit dates baseline report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch care site visit dates baseline report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch visits cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch visit dates cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch care site visit dates cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch drug utilization baseline report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch drug utilization cohort report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch Heracles Heel report for ${cohortId}/${sourceKey}:`, error)
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
): Promise<number[]> {
  try {
    const data = await fetchJSON<number[]>(
      `/cohortresults/${sourceKey}/${cohortId}/analyses`
    )
    return data || []
  } catch (error) {
    console.error(`Failed to fetch completed analyses for ${cohortId}/${sourceKey}:`, error)
    return []
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
    console.error(`Failed to fetch conditions by index report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch death report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch drug exposure report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch drugs by index report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch observation periods report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch procedure report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch procedures by index report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch data completeness report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch entropy report for ${cohortId}/${sourceKey}:`, error)
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
    console.error(`Failed to fetch tornado report for ${cohortId}/${sourceKey}:`, error)
    return null
  }
}

/**
 * Get printfriendly HTML representation of cohort definition
 * POST /cohortdefinition/printfriendly/cohort?format=html
 * The endpoint expects just the expression object from the cohort definition
 */
export async function getCohortPrintFriendly(
  cohortDefinition: AtlasCohortDefinition
): Promise<string | null> {
  try {
    const url = `${BASE_URL}/cohortdefinition/printfriendly/cohort?format=html`
    const locale = localStorage.getItem('locale') || 'en'

    // The cohort definition from WebAPI has structure: { id, name, description, expression: {...} }
    // The printfriendly endpoint expects just the expression property
    let payload = (cohortDefinition as any).expression || cohortDefinition

    // If expression is a string, parse it first
    if (typeof payload === 'string') {
      payload = JSON.parse(payload)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Language': locale,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.text()
  } catch (error) {
    console.error('Failed to fetch print-friendly cohort:', error)
    return null
  }
}
