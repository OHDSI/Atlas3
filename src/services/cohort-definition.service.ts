/**
 * Cohort Definition Service
 * CRUD, tagging, validation, generation and print-friendly rendering for
 * cohort definitions (WebAPI /cohortdefinition/...)
 */
import { logger } from '@/utils/logger'
import { httpGet, httpPost, httpPut, httpDelete, httpPostRead, getBaseUrl } from '@/services/http-client'
import { unwrap, ApiError } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import {
  type AtlasCohortDefinition,
  type AtlasCohortDefinitionInput,
  isAtlasCohortDefinitionWrapper,
} from '@/models/atlas.types'
import {
  CohortGenerationInfoListSchema,
  CohortDefinitionListSchema,
  type GenerationJob,
  type GenerationStatus,
  type CohortGenerationInfoList,
  type CohortDefinitionSummary,
} from '@/models/webapi.types'
import type { ValidationResponse } from '@/models/cohort-validation.types'

const CONTEXT = 'CohortDefinitionService'

/**
 * Get cohort definition by ID
 * Endpoint: GET /cohortdefinition/{id}
 */
export async function getCohortDefinition(id: number): Promise<ApiResult<AtlasCohortDefinition>> {
  return unwrap(async () => {
    return await httpGet<AtlasCohortDefinition>(`/cohortdefinition/${id}`)
  }, CONTEXT)
}

/**
 * WebAPI save payload format
 */
export interface CohortSavePayload {
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
): Promise<ApiResult<CohortSavePayload>> {
  return unwrap(async () => {
    logger.debug(CONTEXT, 'Saving cohort definition', { id: cohort.id, name: cohort.name })
    if (cohort.id) {
      return await httpPut<CohortSavePayload>(`/cohortdefinition/${cohort.id}`, cohort)
    }
    return await httpPost<CohortSavePayload>('/cohortdefinition', cohort)
  }, CONTEXT)
}

/**
 * Delete cohort definition
 * Endpoint: DELETE /cohortdefinition/{id}
 */
export async function deleteCohortDefinition(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohortdefinition/${id}`)
  }, CONTEXT)
}

/**
 * Assign tag to cohort definition
 */
export async function assignTagToCohort(cohortId: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPost(`/cohortdefinition/${cohortId}/tag/`, tagId)
  }, CONTEXT)
}

/**
 * Unassign tag from cohort definition
 */
export async function unassignTagFromCohort(cohortId: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohortdefinition/${cohortId}/tag/${tagId}`)
  }, CONTEXT)
}

/**
 * Generate cohort for a specific data source
 * Endpoint: GET /cohortdefinition/{id}/generate/{sourceKey}
 * Returns job execution info that needs to be converted to GenerationJob format
 */
export async function generateCohort(
  cohortId: number,
  sourceKey: string
): Promise<ApiResult<GenerationJob>> {
  return unwrap(async () => {
    const data = await httpGet<{
      status?: string
      executionId?: number
      startDate?: string
      endDate?: string
    }>(`/cohortdefinition/${cohortId}/generate/${sourceKey}`)

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
  }, CONTEXT)
}

/**
 * Get cohort generation info/status
 * Endpoint: GET /cohortdefinition/{id}/info
 * Returns array of generation info for all sources
 */
export async function getCohortGenerationInfo(
  cohortId: number
): Promise<ApiResult<CohortGenerationInfoList>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohortdefinition/${cohortId}/info`)
    const parsed = CohortGenerationInfoListSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort generation info response format', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Get all cohort definitions
 * Endpoint: GET /cohortdefinition
 * Returns summary list of all cohorts
 */
export async function getCohorts(): Promise<ApiResult<CohortDefinitionSummary[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/cohortdefinition')
    const parsed = CohortDefinitionListSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort list response format', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Delete cohort definition
 * Endpoint: DELETE /cohortdefinition/{id}
 */
export async function deleteCohort(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohortdefinition/${id}`)
  }, CONTEXT)
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
): Promise<ApiResult<ValidationResponse>> {
  return unwrap(async () => {
    logger.debug(CONTEXT, 'Calling checkV2', { name })
    const data = await httpPostRead<ValidationResponse>('/cohortdefinition/checkV2', {
      name,
      expression,
    })
    logger.debug(CONTEXT, 'checkV2 response', { warningCount: data.warnings?.length ?? 0 })
    return data
  }, CONTEXT)
}

/**
 * Get printfriendly HTML representation of cohort definition
 * POST /cohortdefinition/printfriendly/cohort?format=html
 * The endpoint expects just the expression object from the cohort definition
 *
 * Returns raw HTML, not JSON, so this bypasses httpClient (which always
 * JSON-parses the response body) and talks to fetch directly.
 */
export async function getCohortPrintFriendly(
  cohortDefinition: AtlasCohortDefinitionInput
): Promise<ApiResult<string>> {
  return unwrap(async () => {
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
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response.statusText
      )
    }

    try {
      return await response.text()
    } catch (parseError) {
      logger.error(CONTEXT, 'Failed to parse text response', parseError)
      throw new ApiError('Invalid response format', 0, null)
    }
  }, CONTEXT)
}
