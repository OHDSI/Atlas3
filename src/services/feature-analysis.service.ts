/**
 * Feature Analysis Service
 * CRUD and metadata lookups for feature analyses (WebAPI /feature-analysis/...)
 */
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import { unwrap, ApiError } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import {
  FeatureAnalysisSchema,
  FeatureAnalysisListItemSchema,
  FeatureAnalysisAggregateSchema,
  CovariateSettingSchema,
  type FeatureAnalysis,
  type FeatureAnalysisListItem,
  type FeatureAnalysisAggregate,
  type CovariateSetting,
} from '@/models/feature-analysis.types'
import { z } from 'zod'

const CONTEXT = 'FeatureAnalysisService'

/**
 * The WebAPI list endpoint may return either a bare array or a Spring
 * Data-style page wrapper `{ content: [...] }`. Normalise to a plain array.
 */
function unwrapList<T = unknown>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (
    payload !== null &&
    typeof payload === 'object' &&
    Array.isArray((payload as { content?: unknown }).content)
  ) {
    return (payload as { content: T[] }).content
  }
  return []
}

/**
 * List all feature analyses.
 * Endpoint: GET /feature-analysis?size=100000
 */
export async function listFeatureAnalyses(): Promise<ApiResult<FeatureAnalysisListItem[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/feature-analysis?size=100000')
    const list = unwrapList(data)
    const parsed = z.array(FeatureAnalysisListItemSchema).safeParse(list)
    if (!parsed.success) {
      throw new ApiError('Invalid response from /feature-analysis', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Get a feature analysis by id.
 * Endpoint: GET /feature-analysis/{id}
 */
export async function getFeatureAnalysis(id: number): Promise<ApiResult<FeatureAnalysis>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/feature-analysis/${id}`)
    const parsed = FeatureAnalysisSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError(`Invalid response from /feature-analysis/${id}`, 0, null)
    }
    return parsed.data as FeatureAnalysis
  }, CONTEXT)
}

/**
 * Create a feature analysis.
 * Endpoint: POST /feature-analysis
 */
export async function createFeatureAnalysis(
  fa: FeatureAnalysis
): Promise<ApiResult<FeatureAnalysis>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/feature-analysis', fa)
    const parsed = FeatureAnalysisSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid response from POST /feature-analysis', 0, null)
    }
    return parsed.data as FeatureAnalysis
  }, CONTEXT)
}

/**
 * Update a feature analysis.
 * Endpoint: PUT /feature-analysis/{id}
 */
export async function updateFeatureAnalysis(
  fa: FeatureAnalysis
): Promise<ApiResult<FeatureAnalysis>> {
  return unwrap(async () => {
    if (typeof fa.id !== 'number') {
      throw new Error('updateFeatureAnalysis requires fa.id')
    }
    const data = await httpPut<unknown>(`/feature-analysis/${fa.id}`, fa)
    const parsed = FeatureAnalysisSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError(`Invalid response from PUT /feature-analysis/${fa.id}`, 0, null)
    }
    return parsed.data as FeatureAnalysis
  }, CONTEXT)
}

/**
 * Delete a feature analysis.
 * Endpoint: DELETE /feature-analysis/{id}
 */
export async function deleteFeatureAnalysis(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/feature-analysis/${id}`)
  }, CONTEXT)
}

/**
 * Server-side copy of a feature analysis. Atlas 2.15 uses GET /copy.
 * Endpoint: GET /feature-analysis/{id}/copy
 */
export async function copyFeatureAnalysis(id: number): Promise<ApiResult<FeatureAnalysis>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/feature-analysis/${id}/copy`)
    const parsed = FeatureAnalysisSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError(`Invalid response from /feature-analysis/${id}/copy`, 0, null)
    }
    return parsed.data as FeatureAnalysis
  }, CONTEXT)
}

/**
 * Whether a feature analysis with the given name already exists.
 * Endpoint: GET /feature-analysis/{id}/exists?name={name}
 */
export async function featureAnalysisNameExists(
  id: number,
  name: string
): Promise<ApiResult<boolean>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/feature-analysis/${id}/exists?name=${encodeURIComponent(name)}`
    )
    if (typeof data === 'boolean') return data
    if (typeof data === 'number') return data > 0
    return Boolean(data)
  }, CONTEXT)
}

/**
 * List the CDM domains supported by feature analyses.
 * Endpoint: GET /feature-analysis/domains
 *
 * Newer WebAPIs return `[{id, name}]`; older builds returned `string[]`.
 * Accept both and surface the id list to callers (the name is only used as
 * a display label, which we don't currently render).
 */
export async function listFeatureAnalysisDomains(): Promise<ApiResult<string[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/feature-analysis/domains')
    const schema = z.array(z.union([z.string(), z.object({ id: z.string() }).passthrough()]))
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid response from /feature-analysis/domains', 0, null)
    }
    return parsed.data.map(entry => (typeof entry === 'string' ? entry : entry.id))
  }, CONTEXT)
}

/**
 * List FeatureExtraction aggregate options used by the PRESET editor.
 * Endpoint: GET /feature-analysis/aggregates
 */
export async function listFeatureAnalysisAggregates(): Promise<
  ApiResult<FeatureAnalysisAggregate[]>
> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/feature-analysis/aggregates')
    const parsed = z.array(FeatureAnalysisAggregateSchema).safeParse(data)
    if (!parsed.success) {
      throw new ApiError('Invalid response from /feature-analysis/aggregates', 0, null)
    }
    return parsed.data
  }, CONTEXT)
}

/**
 * Default FeatureExtraction covariate settings (toggled by `temporal`).
 * Endpoint: GET /featureextraction/defaultcovariatesettings?temporal={temporal}
 */
export async function getDefaultCovariateSettings(
  temporal: boolean
): Promise<ApiResult<CovariateSetting>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/featureextraction/defaultcovariatesettings?temporal=${temporal ? 'true' : 'false'}`
    )
    const parsed = CovariateSettingSchema.safeParse(data)
    if (!parsed.success) {
      throw new ApiError(
        'Invalid response from /featureextraction/defaultcovariatesettings',
        0,
        null
      )
    }
    return parsed.data
  }, CONTEXT)
}
