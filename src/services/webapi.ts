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
  type CDMSource,
} from '@/models/webapi.types'
import {
  ConceptSearchResponseSchema,
  type Concept,
  type ConceptSet,
} from '@/models/concept-set.types'


import {
  httpClient,
  type HttpClientOptions,
} from '@/services/http-client'











/**
 * @deprecated Use httpClient from '@/services/http-client' for new code
 */
export async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
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
 * Search for concepts in vocabulary.
 *
 * Uses POST /vocabulary/{sourceKey}/search with a JSON body — the GET form
 * (`?query=...`) silently returns an empty array against current WebAPI
 * builds, which made gender/race/etc. concept pickers look broken.
 */
export async function searchConcepts(
  sourceKey: string,
  query: string,
  domain?: string
): Promise<ApiResult<Concept[]>> {
  if (!sourceKey || sourceKey.trim() === '' || sourceKey === 'null' || sourceKey === 'undefined') {
    return failure('Invalid vocabulary source. Please select a valid source in Configuration.')
  }

  const endpoint = `/vocabulary/${sourceKey}/search`
  const body: Record<string, unknown> = { QUERY: query }
  if (domain) {
    body.DOMAIN_ID = [domain]
  }

  try {
    const data = await fetchJSON<unknown>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const parsed = ConceptSearchResponseSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('WebAPI', 'Concept search validation failed', parsed.error)
      return failure('Invalid concept search response format')
    }

    return success(
      parsed.data.map(c => ({
        conceptId: c.CONCEPT_ID,
        conceptName: c.CONCEPT_NAME,
        conceptCode: c.CONCEPT_CODE,
        domainId: c.DOMAIN_ID,
        vocabularyId: c.VOCABULARY_ID,
        conceptClassId: c.CONCEPT_CLASS_ID,
        standardConcept: c.STANDARD_CONCEPT,
        invalidReason: c.INVALID_REASON,
      }))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search concepts'
    logger.error('WebAPI', 'searchConcepts error', error)
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
export async function getCohorts(): Promise<
  ApiResult<import('@/models/webapi.types').CohortDefinitionSummary[]>
> {
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

// ============================================================================
// Cohort Sample Endpoints (WebAPI 3.0 /cohortsample/...)
// ============================================================================


