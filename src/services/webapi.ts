/**
 * OHDSI WebAPI Client
 * HTTP client for Atlas WebAPI endpoints
 * 
 * In development: Uses Vite proxy (/WebAPI -> https://atlas-demo.ohdsi.org/WebAPI)
 * In production: Override with VITE_WEBAPI_URL environment variable
 */
import {
  CDMSourceListSchema,
  GenerationJobSchema,
  CohortGenerationInfoListSchema,
  type CDMSource,
  type GenerationJob,
  type CohortGenerationInfoList,
} from '@/models/webapi.types'
import { ConceptSearchResponseSchema, type Concept, type ConceptSet } from '@/models/concept-set.types'
import type { AtlasCohortDefinition } from '@/models/atlas.types'

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
 */
async function fetchJSON<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
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

  const data = await fetchJSON<unknown>(endpoint)
  const parsed = ConceptSearchResponseSchema.safeParse(data)

  if (!parsed.success) {
    console.error('Concept search validation error:', parsed.error)
    return []
  }

  return parsed.data
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
 * Endpoint: POST /cohortdefinition/{id}/generate/{sourceKey}
 */
export async function generateCohort(
  cohortId: number,
  sourceKey: string
): Promise<GenerationJob | null> {
  try {
    const data = await fetchJSON<unknown>(
      `/cohortdefinition/${cohortId}/generate/${sourceKey}`,
      {
        method: 'POST',
      }
    )

    const parsed = GenerationJobSchema.safeParse(data)

    if (!parsed.success) {
      console.error('Generation job validation error:', parsed.error)
      return null
    }

    return parsed.data
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
