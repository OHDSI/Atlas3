/**
 * Pathway Service
 * CRUD, tagging, diagnostics, and generation for cohort pathway analyses
 * (WebAPI /pathway-analysis/...)
 */
import { httpGet, httpPost, httpPostRead, httpPut, httpDelete } from '@/services/http-client'
import { unwrap, ApiError, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { logger } from '@/utils/logger'
import {
  PathwayExecutionSchema,
  PathwayExecutionListSchema,
  PathwayExecutionStatusSchema,
  PathwayResultsSchema,
  type PathwayExecution,
  type PathwayResults,
  PathwaySchema,
  PathwayListPageSchema,
  type Pathway,
} from '@/models/pathway.types'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'

const CONTEXT = 'PathwayService'

/**
 * List all pathway analyses.
 * GET /pathway-analysis?size=10000
 */
export async function listPathways(): Promise<ApiResult<Pathway[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/pathway-analysis?size=10000')
    // OHDSI WebAPI returns a Spring `Page<...>` envelope. A few proxy
    // configurations (or older WebAPI builds) expose a raw array, so we
    // accept either shape.
    const asPage = PathwayListPageSchema.safeParse(data)
    if (asPage.success) return asPage.data.content as Pathway[]
    const asArray = z.array(PathwaySchema).safeParse(data)
    if (asArray.success) return asArray.data as Pathway[]
    throw new ApiError(
      'Invalid pathway list response',
      0,
      JSON.stringify({ page: asPage.error.issues, array: asArray.error.issues })
    )
  }, CONTEXT)
}

/**
 * Fetch a single pathway analysis by id.
 * GET /pathway-analysis/:id
 */
export async function getPathway(id: number): Promise<ApiResult<Pathway>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/pathway-analysis/${id}`)
    return parseOrThrow(PathwaySchema.passthrough(), data, 'Invalid pathway response') as Pathway
  }, CONTEXT)
}

/**
 * Create a new pathway analysis.
 * POST /pathway-analysis
 */
export async function createPathway(pathway: Pathway): Promise<ApiResult<Pathway>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/pathway-analysis', pathway)
    return parseOrThrow(PathwaySchema.passthrough(), data, 'Invalid create response') as Pathway
  }, CONTEXT)
}

/**
 * Update an existing pathway analysis.
 * PUT /pathway-analysis/:id
 */
export async function savePathway(id: number, pathway: Pathway): Promise<ApiResult<Pathway>> {
  return unwrap(async () => {
    const data = await httpPut<unknown>(`/pathway-analysis/${id}`, pathway)
    return parseOrThrow(PathwaySchema.passthrough(), data, 'Invalid save response') as Pathway
  }, CONTEXT)
}

/**
 * Copy a pathway analysis (creates a duplicate).
 * POST /pathway-analysis/:id
 */
export async function copyPathway(id: number): Promise<ApiResult<Pathway>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(`/pathway-analysis/${id}`, undefined)
    return parseOrThrow(PathwaySchema.passthrough(), data, 'Invalid copy response') as Pathway
  }, CONTEXT)
}

/**
 * Delete a pathway analysis.
 * DELETE /pathway-analysis/:id
 */
export async function deletePathway(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/pathway-analysis/${id}`)
  }, CONTEXT)
}

/**
 * Check whether a pathway name already exists.
 * GET /pathway-analysis/:id/exists?name=<encoded>
 * Use id=0 (default) when checking for a new (unsaved) pathway.
 */
export async function existsPathway(name: string, id = 0): Promise<ApiResult<number>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/pathway-analysis/${id}/exists?name=${encodeURIComponent(name)}`
    )
    return typeof data === 'number' ? data : 0
  }, CONTEXT)
}

/**
 * Export a pathway analysis design as a JSON-importable object.
 * GET /pathway-analysis/{id}/export
 */
export async function exportPathway(id: number): Promise<unknown> {
  try {
    return await httpGet<unknown>(`/pathway-analysis/${id}/export`)
  } catch (err) {
    logger.error('Pathway', `exportPathway(${id}) failed`, err)
    throw err
  }
}

/**
 * Import a pathway analysis design. Server creates a new analysis.
 * POST /pathway-analysis/import
 */
export async function importPathway(design: unknown): Promise<Pathway> {
  const authStore = useAuthStore()
  const data = await authStore.executeWithUserRefresh(() =>
    httpPost<unknown>('/pathway-analysis/import', design)
  )
  const parsed = PathwaySchema.safeParse(data)
  if (!parsed.success) {
    logger.error('Pathway', 'importPathway validation', parsed.error)
    throw new Error('Invalid response from POST /pathway-analysis/import')
  }
  return parsed.data as Pathway
}

/**
 * Assign a tag to a pathway analysis.
 * POST /pathway-analysis/:id/tag/:tagId
 */
export async function assignPathwayTag(id: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPost(`/pathway-analysis/${id}/tag/${tagId}`, undefined)
  }, CONTEXT)
}

/**
 * Remove a tag from a pathway analysis.
 * DELETE /pathway-analysis/:id/tag/:tagId
 */
export async function unassignPathwayTag(id: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/pathway-analysis/${id}/tag/${tagId}`)
  }, CONTEXT)
}

export interface PathwayDiagnosticMessage {
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
}

/**
 * Run diagnostics on a pathway analysis design.
 * POST /pathway-analysis/check
 */
export async function runPathwayDiagnostics(pathway: Pathway): Promise<PathwayDiagnosticMessage[]> {
  try {
    const data = await httpPostRead<unknown>('/pathway-analysis/check', pathway)
    if (Array.isArray(data)) return data as PathwayDiagnosticMessage[]
    return []
  } catch (err) {
    logger.error('Pathway', 'runPathwayDiagnostics failed', err)
    return []
  }
}

/**
 * List all generations for a pathway analysis.
 * GET /pathway-analysis/:id/generation
 */
export async function listPathwayExecutions(id: number): Promise<ApiResult<PathwayExecution[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/pathway-analysis/${id}/generation`)
    return parseOrThrow(PathwayExecutionListSchema, data, 'Invalid execution list')
  }, CONTEXT)
}

/**
 * Get a single pathway generation execution.
 * GET /pathway-analysis/generation/:generationId
 */
export async function getPathwayExecution(
  generationId: number
): Promise<ApiResult<PathwayExecution>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}`)
    return parseOrThrow(PathwayExecutionSchema, data, 'Invalid execution response')
  }, CONTEXT)
}

/**
 * Get results for a pathway generation.
 * GET /pathway-analysis/generation/:generationId/result
 */
export async function getPathwayResults(generationId: number): Promise<ApiResult<PathwayResults>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}/result`)
    return parseOrThrow(PathwayResultsSchema, data, 'Invalid results response')
  }, CONTEXT)
}

/**
 * Trigger pathway generation for a given source.
 * POST /pathway-analysis/:id/generation/:sourceKey
 *
 * The POST returns a Spring Batch JobExecution, not a fully populated
 * PathwayExecution. Accept either shape and synthesize a PathwayExecution
 * for callers; the list/get endpoints return the canonical row.
 */
export async function generatePathway(
  id: number,
  sourceKey: string
): Promise<ApiResult<PathwayExecution | null>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(
      `/pathway-analysis/${id}/generation/${sourceKey}`,
      undefined
    )

    const direct = PathwayExecutionSchema.passthrough().safeParse(data)
    if (direct.success) return direct.data as PathwayExecution

    const jobSchema = z
      .object({
        executionId: z.number().optional(),
        id: z.number().optional(),
        status: PathwayExecutionStatusSchema.optional(),
      })
      .passthrough()
    const job = parseOrThrow(jobSchema, data, 'Invalid generate response')
    // Don't fabricate an execution id: polling id 0 would track a phantom
    // execution. The generation did start, so this isn't a failure either -
    // return null so the caller skips polling and relies on the list/get
    // endpoints for the canonical row.
    const executionId = job.executionId ?? job.id
    if (executionId === undefined) {
      logger.warn(CONTEXT, 'Generate response carried no execution id', job)
      return null
    }
    return {
      id: executionId,
      status: job.status ?? 'STARTING',
      sourceKey,
    }
  }, CONTEXT)
}

/**
 * Cancel an in-progress pathway generation.
 * DELETE /pathway-analysis/:id/generation/:sourceKey
 */
export async function cancelPathwayGeneration(
  id: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/pathway-analysis/${id}/generation/${sourceKey}`)
  }, CONTEXT)
}

/**
 * Get the pathway design snapshot stored with a generation.
 * GET /pathway-analysis/generation/:generationId/design
 */
export async function getPathwayDesignByGeneration(
  generationId: number
): Promise<ApiResult<Pathway>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}/design`)
    return parseOrThrow(PathwaySchema.passthrough(), data, 'Invalid design response') as Pathway
  }, CONTEXT)
}
