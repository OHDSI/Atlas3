/**
 * Cohort Sample Service (WebAPI 3.0 /cohortsample/...)
 *
 * A cohort sample is a deterministic random selection of N persons from a
 * generated cohort, optionally filtered by age and gender criteria.
 */
import { httpGet, httpPost, httpDelete } from '@/services/http-client'
import { unwrap, ApiError } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import {
  CohortSampleSchema,
  CohortSampleListSchema,
  type CohortSample,
  type CohortSampleList,
  type SampleParameters,
} from '@/models/cohort-sample.types'

const CONTEXT = 'CohortSampleService'

/**
 * List samples for a (cohort, source) pair.
 * Endpoint: GET /cohortsample/{cohortDefinitionId}/{sourceKey}
 */
export async function listCohortSamples(
  cohortDefinitionId: number,
  sourceKey: string
): Promise<ApiResult<CohortSampleList>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohortsample/${cohortDefinitionId}/${sourceKey}`)
    const parsed = CohortSampleListSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort sample list response', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Whether the given cohort has any samples on any source.
 * Endpoint: GET /cohortsample/has-samples/{cohortDefinitionId}
 */
export async function hasCohortSamples(cohortDefinitionId: number): Promise<ApiResult<boolean>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohortsample/has-samples/${cohortDefinitionId}`)
    return Boolean(data)
  }, CONTEXT)
}

/**
 * Fetch a single sample including its person elements (via `?fields=elements`).
 * Endpoint: GET /cohortsample/{cohortDefinitionId}/{sourceKey}/{sampleId}
 */
export async function getCohortSample(
  cohortDefinitionId: number,
  sourceKey: string,
  sampleId: number,
  options: { withElements?: boolean } = {}
): Promise<ApiResult<CohortSample>> {
  return unwrap(async () => {
    const url = options.withElements
      ? `/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}?fields=elements`
      : `/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}`
    const data = await httpGet<unknown>(url)
    const parsed = CohortSampleSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort sample response', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Create a new sample.
 * Endpoint: POST /cohortsample/{cohortDefinitionId}/{sourceKey}
 */
export async function createCohortSample(
  cohortDefinitionId: number,
  sourceKey: string,
  parameters: SampleParameters
): Promise<ApiResult<CohortSample>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(`/cohortsample/${cohortDefinitionId}/${sourceKey}`, parameters)
    const parsed = CohortSampleSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort sample response', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Refresh (regenerate persons in) an existing sample.
 * Endpoint: POST /cohortsample/{cohortDefinitionId}/{sourceKey}/{sampleId}/refresh
 */
export async function refreshCohortSample(
  cohortDefinitionId: number,
  sourceKey: string,
  sampleId: number
): Promise<ApiResult<CohortSample>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(
      `/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}/refresh`
    )
    const parsed = CohortSampleSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid cohort sample response', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Delete a single sample.
 * Endpoint: DELETE /cohortsample/{cohortDefinitionId}/{sourceKey}/{sampleId}
 */
export async function deleteCohortSample(
  cohortDefinitionId: number,
  sourceKey: string,
  sampleId: number
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohortsample/${cohortDefinitionId}/${sourceKey}/${sampleId}`)
  }, CONTEXT)
}
