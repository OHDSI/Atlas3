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

console.log('[WebAPI] BASE_URL:', BASE_URL, '| VITE_WEBAPI_URL:', import.meta.env.VITE_WEBAPI_URL, '| DEV:', import.meta.env.DEV)

// T132: Retry configuration
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
 * T132: Exponential backoff with 3 attempts, 500ms initial delay
 * T028: Adds User-Language header for i18n support
 */
async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // T028: Get current locale from localStorage for User-Language header
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

  console.log('[WebAPI] searchConcepts:', { sourceKey, query, domain, endpoint })

  try {
    const data = await fetchJSON<unknown>(endpoint)
    console.log('[WebAPI] searchConcepts response received, concept count:', Array.isArray(data) ? data.length : 'not an array')
    const parsed = ConceptSearchResponseSchema.safeParse(data)

    if (!parsed.success) {
      console.error('[WebAPI] Validation failed:', parsed.error)
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
// Report Endpoints (Feature: 005-cohort-reports)
// ============================================================================

/**
 * Get comprehensive cohort report data for a generated cohort
 * Endpoint: GET /cohortdefinition/{id}/report/{sourceKey}
 * T015: Primary report data endpoint
 *
 * @param cohortId Cohort definition ID
 * @param sourceKey Data source key (e.g., "SYNPUF5", "SYNPUF1K")
 * @returns Complete report data including person, condition eras, drug eras, cohort specific
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
 * T016: Individual report endpoint
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
 * T016: Individual report endpoint
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
 * T079: Condition occurrence report
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
 * T016: Individual report endpoint
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
 * T016: Individual report endpoint
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
 * Trigger Full Analysis batch job
 * Endpoint: POST /cohortdefinition/{id}/report/{sourceKey}/fullAnalysis
 * T104: Action button batch job trigger
 */
export async function triggerFullAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${cohortId}/report/${sourceKey}/fullAnalysis`, {
      method: 'POST',
    })
    return true
  } catch (error) {
    console.error(`Failed to trigger full analysis for ${cohortId}/${sourceKey}:`, error)
    return false
  }
}

/**
 * Trigger Quick Analysis batch job
 * Endpoint: POST /cohortdefinition/{id}/report/{sourceKey}/quickAnalysis
 * T105: Action button batch job trigger
 */
export async function triggerQuickAnalysis(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${cohortId}/report/${sourceKey}/quickAnalysis`, {
      method: 'POST',
    })
    return true
  } catch (error) {
    console.error(`Failed to trigger quick analysis for ${cohortId}/${sourceKey}:`, error)
    return false
  }
}

/**
 * Trigger Utilization batch job
 * Endpoint: POST /cohortdefinition/{id}/report/{sourceKey}/utilization
 * T106: Action button batch job trigger
 */
export async function triggerUtilization(
  cohortId: number,
  sourceKey: string
): Promise<boolean> {
  try {
    await fetchJSON(`/cohortdefinition/${cohortId}/report/${sourceKey}/utilization`, {
      method: 'POST',
    })
    return true
  } catch (error) {
    console.error(`Failed to trigger utilization analysis for ${cohortId}/${sourceKey}:`, error)
    return false
  }
}

/**
 * Get persons exposure baseline report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/observationperiod
 * T090: Persons exposure baseline report
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
 * T091: Persons exposure cohort report
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
 * T092: Visits baseline report
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
 * T093: Visit dates baseline report
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
 * T094: Care site visit dates baseline report
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
 * T095: Visits cohort report
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
 * T096: Visit dates cohort report
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
 * T097: Care site visit dates cohort report
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
 * T098: Drug utilization baseline report
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
 * T099: Drug utilization cohort report
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
 * T100: Heracles Heel report
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
 * Get conditions by index report
 * Endpoint: GET /cohortresults/{sourceKey}/{cohortId}/conditionsbyindex
 * T080: Conditions by index report
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
 * T081: Death report
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
 * T082: Drug exposure report
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
 * T083: Drugs by index report
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
 * T084: Observation periods report
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
 * T085: Procedure report
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
 * T086: Procedures by index report
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
 * T087: Data completeness report
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
 * T088: Entropy report
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
 * T089: Tornado report
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
