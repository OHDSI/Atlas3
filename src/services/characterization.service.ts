/**
 * Characterization Service
 * CRUD, generation/polling and result retrieval for characterizations
 * (WebAPI /cohort-characterization/...)
 */
import { httpGet, httpPost, httpPut, httpDelete, httpPostRead } from '@/services/http-client'
import { unwrap, unwrapList, ApiError, parseOrThrow } from '@/services/api-error'
import { logger } from '@/utils/logger'
import { type ApiResult } from '@/types/api'
import {
  CharacterizationDefinitionSchema,
  CharacterizationListItemSchema,
  CharacterizationExecutionSchema,
  GenerationStatusSchema,
  type CharacterizationDefinition,
  type CharacterizationListItem,
  type CharacterizationExecution,
} from '@/models/characterization.types'
import { z } from 'zod'
import { normalizeCriteriaGroupForCirce } from '@/components/cohort-editor/normalize'

const CONTEXT = 'CharacterizationService'

/**
 * List all characterizations.
 * Endpoint: GET /cohort-characterization?size=10000
 */
export async function listCharacterizations(): Promise<ApiResult<CharacterizationListItem[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/cohort-characterization?size=10000')
    const list = unwrapList(data)
    return parseOrThrow(z.array(CharacterizationListItemSchema), list, 'Invalid response from /cohort-characterization')
  }, CONTEXT)
}

/**
 * Get the full design of a characterization.
 * Endpoint: GET /cohort-characterization/{id}/design
 */
export async function getCharacterization(
  id: number
): Promise<ApiResult<CharacterizationDefinition>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohort-characterization/${id}/design`)
    return parseOrThrow(
      CharacterizationDefinitionSchema,
      data,
      `Invalid response from /cohort-characterization/${id}/design`
    ) as CharacterizationDefinition
  }, CONTEXT)
}

// WebAPI expects numeric strata IDs (Long); the editor generates UUID
// placeholders for keying, which must be stripped before send so the backend
// assigns real IDs.
function serializeCharacterization(def: CharacterizationDefinition): unknown {
  const stratas = def.stratas.map((s) => {
    const criteria = s.criteria ? normalizeCriteriaGroupForCirce(s.criteria) : s.criteria
    const numeric = Number(s.id)
    if (Number.isFinite(numeric) && Number.isInteger(numeric) && numeric > 0) {
      return { ...s, id: numeric, criteria }
    }
    const { id: _id, ...rest } = s
    void _id
    return { ...rest, criteria }
  })
  return { ...def, stratas }
}

/**
 * Create a new characterization.
 * Endpoint: POST /cohort-characterization
 */
export async function createCharacterization(
  def: CharacterizationDefinition
): Promise<ApiResult<CharacterizationDefinition>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/cohort-characterization', serializeCharacterization(def))
    return parseOrThrow(
      CharacterizationDefinitionSchema,
      data,
      'Invalid response from POST /cohort-characterization'
    ) as CharacterizationDefinition
  }, CONTEXT)
}

/**
 * Update an existing characterization.
 * Endpoint: PUT /cohort-characterization/{id}
 */
export async function updateCharacterization(
  def: CharacterizationDefinition
): Promise<ApiResult<CharacterizationDefinition>> {
  return unwrap(async () => {
    if (typeof def.id !== 'number') {
      throw new Error('updateCharacterization requires def.id')
    }
    const data = await httpPut<unknown>(
      `/cohort-characterization/${def.id}`,
      serializeCharacterization(def)
    )
    return parseOrThrow(
      CharacterizationDefinitionSchema,
      data,
      `Invalid response from PUT /cohort-characterization/${def.id}`
    ) as CharacterizationDefinition
  }, CONTEXT)
}

/**
 * Delete a characterization.
 * Endpoint: DELETE /cohort-characterization/{id}
 */
export async function deleteCharacterization(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohort-characterization/${id}`)
  }, CONTEXT)
}

/**
 * Server-side copy of a characterization. Atlas 2.15 uses `POST /{id}` for
 * the copy operation (no body).
 * Endpoint: POST /cohort-characterization/{id}
 */
export async function copyCharacterization(
  id: number
): Promise<ApiResult<CharacterizationDefinition>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(`/cohort-characterization/${id}`)
    return parseOrThrow(
      CharacterizationDefinitionSchema,
      data,
      `Invalid response from POST /cohort-characterization/${id}`
    ) as CharacterizationDefinition
  }, CONTEXT)
}

/**
 * Whether a characterization with the given name already exists.
 * Endpoint: GET /cohort-characterization/{id}/exists?name={name}
 */
export async function characterizationNameExists(
  id: number,
  name: string
): Promise<ApiResult<boolean>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/cohort-characterization/${id}/exists?name=${encodeURIComponent(name)}`
    )
    if (typeof data === 'boolean') return data
    if (typeof data === 'number') return data > 0
    return Boolean(data)
  }, CONTEXT)
}

/**
 * Export a characterization design as a JSON-importable object.
 * Endpoint: GET /cohort-characterization/{id}/export
 */
export async function exportCharacterization(id: number): Promise<ApiResult<unknown>> {
  return unwrap(async () => {
    return await httpGet<unknown>(`/cohort-characterization/${id}/export`)
  }, CONTEXT)
}

/**
 * Import a characterization design.
 * Endpoint: POST /cohort-characterization/import
 */
export async function importCharacterization(
  design: unknown
): Promise<ApiResult<CharacterizationDefinition>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/cohort-characterization/import', design)
    return parseOrThrow(
      CharacterizationDefinitionSchema,
      data,
      'Invalid response from POST /cohort-characterization/import'
    ) as CharacterizationDefinition
  }, CONTEXT)
}

/**
 * List executions (generations) for a characterization.
 * Endpoint: GET /cohort-characterization/{id}/generation
 */
export async function listCharacterizationExecutions(
  id: number
): Promise<ApiResult<CharacterizationExecution[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohort-characterization/${id}/generation`)
    const list = unwrapList(data)
    return parseOrThrow(
      z.array(CharacterizationExecutionSchema),
      list,
      `Invalid response from /cohort-characterization/${id}/generation`
    )
  }, CONTEXT)
}

/**
 * Get a specific characterization execution.
 * Endpoint: GET /cohort-characterization/generation/{generationId}
 */
export async function getCharacterizationExecution(
  generationId: number
): Promise<ApiResult<CharacterizationExecution>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/cohort-characterization/generation/${generationId}`)
    return parseOrThrow(
      CharacterizationExecutionSchema,
      data,
      `Invalid response from /cohort-characterization/generation/${generationId}`
    )
  }, CONTEXT)
}

/**
 * Trigger a characterization generation against a given source.
 * Endpoint: POST /cohort-characterization/{id}/generation/{sourceKey}
 *
 * The POST response is the Spring Batch JobExecution that started the run, not
 * a fully-populated CharacterizationExecution row. We accept either shape and
 * normalize to CharacterizationExecution; callers refetch via the list/get
 * endpoints once polling kicks in.
 */
export async function generateCharacterization(
  id: number,
  sourceKey: string
): Promise<ApiResult<CharacterizationExecution | null>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(
      `/cohort-characterization/${id}/generation/${encodeURIComponent(sourceKey)}`
    )

    const direct = CharacterizationExecutionSchema.safeParse(data)
    if (direct.success) return direct.data

    const jobExecutionSchema = z
      .object({
        executionId: z.number().optional(),
        id: z.number().optional(),
        status: GenerationStatusSchema.optional(),
      })
      .passthrough()
    const job = parseOrThrow(
      jobExecutionSchema,
      data,
      `Invalid response from POST /cohort-characterization/${id}/generation/${sourceKey}`
    )

    // Don't fabricate an execution id: polling id 0 would track a phantom
    // execution. The generation did start, so this isn't a failure either -
    // return null so the caller refreshes the canonical list instead.
    const executionId = job.executionId ?? job.id
    if (executionId === undefined) {
      logger.warn(
        CONTEXT,
        `Generation response from POST /cohort-characterization/${id}/generation/${sourceKey} carried no execution id`,
        job
      )
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
 * Cancel an in-progress characterization generation.
 * Endpoint: DELETE /cohort-characterization/{id}/generation/{sourceKey}
 */
export async function cancelCharacterizationGeneration(
  id: number,
  sourceKey: string
): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/cohort-characterization/${id}/generation/${encodeURIComponent(sourceKey)}`)
  }, CONTEXT)
}

/**
 * Fetch the design that was active at the time a generation was created.
 * Endpoint: GET /cohort-characterization/generation/{generationId}/design
 */
export async function getCharacterizationDesignSnapshot(
  generationId: number
): Promise<ApiResult<unknown>> {
  return unwrap(async () => {
    return await httpGet<unknown>(`/cohort-characterization/generation/${generationId}/design`)
  }, CONTEXT)
}

/**
 * Get the total count of result rows for a generation.
 * Endpoint: GET /cohort-characterization/generation/{generationId}/result/count
 */
export async function getCharacterizationResultCount(
  generationId: number
): Promise<ApiResult<number>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(
      `/cohort-characterization/generation/${generationId}/result/count`
    )
    return parseOrThrow(
      z.number(),
      data,
      `Invalid response from /cohort-characterization/generation/${generationId}/result/count`
    )
  }, CONTEXT)
}

/**
 * Body parameters for `getCharacterizationResults`.
 * Atlas 2.15 sends a free-form filter object; only a few keys are common.
 */
export interface CharacterizationResultsBody {
  thresholdValuePct?: number
  analysisIds?: number[]
  cohortIds?: number[]
  // The server accepts additional keys (e.g. `domainIds`, `summary`) and we
  // pass them through unchanged. Result rows are validated as `unknown[]`
  // here; conversion / typed mapping lands in the report-mapper layer.
  [key: string]: unknown
}

/**
 * Fetch result rows for a generation.
 * Endpoint: POST /cohort-characterization/generation/{generationId}/result
 *
 * Newer WebAPIs wrap rows as `{ reports: [{ analysisId, items: [...] }] }`;
 * older builds return a flat array. Flatten either shape so the mapper sees
 * a single list of rows.
 */
export async function getCharacterizationResults(
  generationId: number,
  body: CharacterizationResultsBody
): Promise<ApiResult<unknown[]>> {
  return unwrap(async () => {
    const data = await httpPostRead<unknown>(
      `/cohort-characterization/generation/${generationId}/result`,
      body
    )
    if (Array.isArray(data)) return data

    if (data && typeof data === 'object' && 'reports' in data) {
      const reports = (data as { reports: unknown }).reports
      if (Array.isArray(reports)) {
        return reports.flatMap(report => {
          if (!report || typeof report !== 'object') return []
          const items = (report as { items?: unknown }).items
          return Array.isArray(items) ? items : []
        })
      }
    }

    throw new ApiError(
      `Invalid response from POST /cohort-characterization/generation/${generationId}/result`,
      0,
      JSON.stringify(data)
    )
  }, CONTEXT)
}

/**
 * Drill into the prevalence values for a single covariate / cohort cell.
 * Endpoint:
 * GET /cohort-characterization/generation/{generationId}/explore/prevalence/{analysisId}/{cohortId}/{covariateId}
 */
export async function explorePrevalence(
  generationId: number,
  analysisId: number,
  cohortId: number,
  covariateId: number
): Promise<ApiResult<unknown>> {
  return unwrap(async () => {
    return await httpGet<unknown>(
      `/cohort-characterization/generation/${generationId}/explore/prevalence/${analysisId}/${cohortId}/${covariateId}`
    )
  }, CONTEXT)
}
