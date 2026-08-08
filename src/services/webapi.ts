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
  httpClient,
  httpGet,
  httpPost,
  httpPostRead,
  httpPut,
  httpDelete,
  type HttpClientOptions,
} from '@/services/http-client'
import {
  CharacterizationDefinitionSchema,
  CharacterizationListItemSchema,
  CharacterizationExecutionSchema,
  GenerationStatusSchema,
  type CharacterizationDefinition,
  type CharacterizationListItem,
  type CharacterizationExecution,
} from '@/models/characterization.types'
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
import {
  IncidenceRateSummarySchema,
  IncidenceRateWireSchema,
  IncidenceRateExpressionSchema,
  IncidenceRateInfoBySourceSchema,
  IncidenceRateInfoListSchema,
  IncidenceRateReportSchema,
} from '@/models/incidence-rate.types'
import type {
  IncidenceRate,
  IncidenceRateInfoBySource,
  IncidenceRateReport,
} from '@/models/incidence-rate.types'
import { z } from 'zod'

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

export { fetchCDMSources } from '@/services/source.service'

export { searchConceptsResult as searchConcepts } from '@/services/concept-search.service'

export {
  getCohortDefinition,
  type CohortSavePayload,
  saveCohortDefinition,
  deleteCohortDefinition,
  assignTagToCohort,
  unassignTagFromCohort,
  generateCohort,
  getCohortGenerationInfo,
  getCohorts,
  deleteCohort,
  validateCohortDefinition,
  getCohortPrintFriendly,
} from '@/services/cohort-definition.service'

export {
  listCohortSamples,
  hasCohortSamples,
  getCohortSample,
  createCohortSample,
  refreshCohortSample,
  deleteCohortSample,
} from '@/services/cohort-sample.service'

export {
  getCohortReport,
  getInclusionRuleReport,
  getPersonReport,
  getConditionErasReport,
  getConditionReport,
  getDrugErasReport,
  getCohortSpecificReport,
  triggerFullAnalysis,
  triggerQuickAnalysis,
  triggerUtilization,
  getPersonsExposureBaselineReport,
  getPersonsExposureCohortReport,
  getVisitsBaselineReport,
  getVisitDatesBaselineReport,
  getCareSiteVisitDatesBaselineReport,
  getVisitsCohortReport,
  getVisitDatesCohortReport,
  getCareSiteVisitDatesCohortReport,
  getDrugUtilizationBaselineReport,
  getDrugUtilizationCohortReport,
  getHeraclesHeelReport,
  getCompletedAnalyses,
  getConditionsByIndexReport,
  getDeathReport,
  getDrugExposureReport,
  getDrugsByIndexReport,
  getObservationPeriodsReport,
  getProcedureReport,
  getProceduresByIndexReport,
  getDataCompletenessReport,
  getEntropyReport,
  getTornadoReport,
  getCDMDrilldown,
  getConditionDrilldown,
  getConditionEraDrilldown,
  getDrugDrilldown,
  getDrugEraDrilldown,
  getMeasurementDrilldown,
  getObservationDrilldown,
  getProcedureDrilldown,
} from '@/services/report.service'

// ============================================================================
// Characterization Endpoints (WebAPI /cohort-characterization/...)
// ============================================================================

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
 * List all characterizations.
 * Endpoint: GET /cohort-characterization?size=10000
 */
export async function listCharacterizations(): Promise<CharacterizationListItem[]> {
  const data = await httpGet<unknown>('/cohort-characterization?size=10000')
  const list = unwrapList(data)
  const parsed = z.array(CharacterizationListItemSchema).safeParse(list)
  if (!parsed.success) {
    logger.error('WebAPI', 'listCharacterizations validation error', parsed.error)
    throw new Error('Invalid response from /cohort-characterization')
  }
  return parsed.data
}

/**
 * Get the full design of a characterization.
 * Endpoint: GET /cohort-characterization/{id}/design
 */
export async function getCharacterization(id: number): Promise<CharacterizationDefinition | null> {
  const data = await httpGet<unknown>(`/cohort-characterization/${id}/design`)
  const parsed = CharacterizationDefinitionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `getCharacterization(${id}) validation error`, parsed.error)
    throw new Error(`Invalid response from /cohort-characterization/${id}/design`)
  }
  return parsed.data as CharacterizationDefinition
}

// WebAPI expects numeric strata IDs (Long); the editor generates UUID
// placeholders for keying, which must be stripped before send so the backend
// assigns real IDs.
function serializeCharacterization(def: CharacterizationDefinition): unknown {
  const stratas = def.stratas.map((s) => {
    const numeric = Number(s.id)
    if (Number.isFinite(numeric) && Number.isInteger(numeric) && numeric > 0) {
      return { ...s, id: numeric }
    }
    const { id: _id, ...rest } = s
    void _id
    return rest
  })
  return { ...def, stratas }
}

/**
 * Create a new characterization.
 * Endpoint: POST /cohort-characterization
 */
export async function createCharacterization(
  def: CharacterizationDefinition
): Promise<CharacterizationDefinition> {
  const data = await httpPost<unknown>('/cohort-characterization', serializeCharacterization(def))
  const parsed = CharacterizationDefinitionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'createCharacterization validation error', parsed.error)
    throw new Error('Invalid response from POST /cohort-characterization')
  }
  return parsed.data as CharacterizationDefinition
}

/**
 * Update an existing characterization.
 * Endpoint: PUT /cohort-characterization/{id}
 */
export async function updateCharacterization(
  def: CharacterizationDefinition
): Promise<CharacterizationDefinition> {
  if (typeof def.id !== 'number') {
    throw new Error('updateCharacterization requires def.id')
  }
  const data = await httpPut<unknown>(`/cohort-characterization/${def.id}`, serializeCharacterization(def))
  const parsed = CharacterizationDefinitionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `updateCharacterization(${def.id}) validation error`, parsed.error)
    throw new Error(`Invalid response from PUT /cohort-characterization/${def.id}`)
  }
  return parsed.data as CharacterizationDefinition
}

/**
 * Delete a characterization.
 * Endpoint: DELETE /cohort-characterization/{id}
 */
export async function deleteCharacterization(id: number): Promise<void> {
  try {
    await httpDelete(`/cohort-characterization/${id}`)
  } catch (error) {
    logger.error('WebAPI', `Failed to delete characterization ${id}`, error)
    throw error
  }
}

/**
 * Server-side copy of a characterization. Atlas 2.15 uses `POST /{id}` for
 * the copy operation (no body).
 * Endpoint: POST /cohort-characterization/{id}
 */
export async function copyCharacterization(id: number): Promise<CharacterizationDefinition> {
  const data = await httpPost<unknown>(`/cohort-characterization/${id}`)
  const parsed = CharacterizationDefinitionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `copyCharacterization(${id}) validation error`, parsed.error)
    throw new Error(`Invalid response from POST /cohort-characterization/${id}`)
  }
  return parsed.data as CharacterizationDefinition
}

/**
 * Whether a characterization with the given name already exists.
 * Endpoint: GET /cohort-characterization/{id}/exists?name={name}
 */
export async function characterizationNameExists(id: number, name: string): Promise<boolean> {
  try {
    const data = await httpGet<unknown>(
      `/cohort-characterization/${id}/exists?name=${encodeURIComponent(name)}`
    )
    if (typeof data === 'boolean') return data
    if (typeof data === 'number') return data > 0
    return Boolean(data)
  } catch (error) {
    logger.error('WebAPI', `characterizationNameExists(${id}, ${name}) failed`, error)
    throw error
  }
}

/**
 * Export a characterization design as a JSON-importable object.
 * Endpoint: GET /cohort-characterization/{id}/export
 */
export async function exportCharacterization(id: number): Promise<unknown> {
  try {
    return await httpGet<unknown>(`/cohort-characterization/${id}/export`)
  } catch (error) {
    logger.error('WebAPI', `exportCharacterization(${id}) failed`, error)
    throw error
  }
}

/**
 * Import a characterization design.
 * Endpoint: POST /cohort-characterization/import
 */
export async function importCharacterization(design: unknown): Promise<CharacterizationDefinition> {
  const data = await httpPost<unknown>('/cohort-characterization/import', design)
  const parsed = CharacterizationDefinitionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'importCharacterization validation error', parsed.error)
    throw new Error('Invalid response from POST /cohort-characterization/import')
  }
  return parsed.data as CharacterizationDefinition
}

/**
 * List executions (generations) for a characterization.
 * Endpoint: GET /cohort-characterization/{id}/generation
 */
export async function listCharacterizationExecutions(
  id: number
): Promise<CharacterizationExecution[]> {
  const data = await httpGet<unknown>(`/cohort-characterization/${id}/generation`)
  const list = unwrapList(data)
  const parsed = z.array(CharacterizationExecutionSchema).safeParse(list)
  if (!parsed.success) {
    logger.error('WebAPI', `listCharacterizationExecutions(${id}) validation error`, parsed.error)
    throw new Error(`Invalid response from /cohort-characterization/${id}/generation`)
  }
  return parsed.data
}

/**
 * Get a specific characterization execution.
 * Endpoint: GET /cohort-characterization/generation/{generationId}
 */
export async function getCharacterizationExecution(
  generationId: number
): Promise<CharacterizationExecution | null> {
  const data = await httpGet<unknown>(`/cohort-characterization/generation/${generationId}`)
  const parsed = CharacterizationExecutionSchema.safeParse(data)
  if (!parsed.success) {
    logger.error(
      'WebAPI',
      `getCharacterizationExecution(${generationId}) validation error`,
      parsed.error
    )
    throw new Error(`Invalid response from /cohort-characterization/generation/${generationId}`)
  }
  return parsed.data
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
): Promise<CharacterizationExecution> {
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
  const job = jobExecutionSchema.safeParse(data)
  if (!job.success) {
    logger.error(
      'WebAPI',
      `generateCharacterization(${id}, ${sourceKey}) validation error`,
      job.error
    )
    throw new Error(
      `Invalid response from POST /cohort-characterization/${id}/generation/${sourceKey}`
    )
  }

  const executionId = job.data.executionId ?? job.data.id ?? 0
  return {
    id: executionId,
    status: job.data.status ?? 'STARTING',
    sourceKey,
  }
}

/**
 * Cancel an in-progress characterization generation.
 * Endpoint: DELETE /cohort-characterization/{id}/generation/{sourceKey}
 */
export async function cancelCharacterizationGeneration(
  id: number,
  sourceKey: string
): Promise<void> {
  try {
    await httpDelete(`/cohort-characterization/${id}/generation/${encodeURIComponent(sourceKey)}`)
  } catch (error) {
    logger.error('WebAPI', `Failed to cancel characterization generation ${id}/${sourceKey}`, error)
    throw error
  }
}

/**
 * Fetch the design that was active at the time a generation was created.
 * Endpoint: GET /cohort-characterization/generation/{generationId}/design
 */
export async function getCharacterizationDesignSnapshot(generationId: number): Promise<unknown> {
  try {
    return await httpGet<unknown>(`/cohort-characterization/generation/${generationId}/design`)
  } catch (error) {
    logger.error('WebAPI', `getCharacterizationDesignSnapshot(${generationId}) failed`, error)
    throw error
  }
}

/**
 * Get the total count of result rows for a generation.
 * Endpoint: GET /cohort-characterization/generation/{generationId}/result/count
 */
export async function getCharacterizationResultCount(generationId: number): Promise<number> {
  const data = await httpGet<unknown>(
    `/cohort-characterization/generation/${generationId}/result/count`
  )
  const parsed = z.number().safeParse(data)
  if (!parsed.success) {
    logger.error(
      'WebAPI',
      `getCharacterizationResultCount(${generationId}) validation error`,
      parsed.error
    )
    throw new Error(
      `Invalid response from /cohort-characterization/generation/${generationId}/result/count`
    )
  }
  return parsed.data
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
): Promise<unknown[]> {
  try {
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

    logger.error(
      'WebAPI',
      `getCharacterizationResults(${generationId}) returned unexpected shape`,
      data
    )
    throw new Error(
      `Invalid response from POST /cohort-characterization/generation/${generationId}/result`
    )
  } catch (error) {
    logger.error('WebAPI', `Failed to fetch characterization results for ${generationId}`, error)
    throw error
  }
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
): Promise<unknown> {
  try {
    return await httpGet<unknown>(
      `/cohort-characterization/generation/${generationId}/explore/prevalence/${analysisId}/${cohortId}/${covariateId}`
    )
  } catch (error) {
    logger.error(
      'WebAPI',
      `explorePrevalence(${generationId}, ${analysisId}, ${cohortId}, ${covariateId}) failed`,
      error
    )
    throw error
  }
}

// ============================================================================
// Feature Analysis Endpoints (WebAPI /feature-analysis/...)
// ============================================================================

/**
 * List all feature analyses.
 * Endpoint: GET /feature-analysis?size=100000
 */
export async function listFeatureAnalyses(): Promise<FeatureAnalysisListItem[]> {
  const data = await httpGet<unknown>('/feature-analysis?size=100000')
  const list = unwrapList(data)
  const parsed = z.array(FeatureAnalysisListItemSchema).safeParse(list)
  if (!parsed.success) {
    logger.error('WebAPI', 'listFeatureAnalyses validation error', parsed.error)
    throw new Error('Invalid response from /feature-analysis')
  }
  return parsed.data
}

/**
 * Get a feature analysis by id.
 * Endpoint: GET /feature-analysis/{id}
 */
export async function getFeatureAnalysis(id: number): Promise<FeatureAnalysis | null> {
  const data = await httpGet<unknown>(`/feature-analysis/${id}`)
  const parsed = FeatureAnalysisSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `getFeatureAnalysis(${id}) validation error`, parsed.error)
    throw new Error(`Invalid response from /feature-analysis/${id}`)
  }
  return parsed.data as FeatureAnalysis
}

/**
 * Create a feature analysis.
 * Endpoint: POST /feature-analysis
 */
export async function createFeatureAnalysis(fa: FeatureAnalysis): Promise<FeatureAnalysis> {
  const data = await httpPost<unknown>('/feature-analysis', fa)
  const parsed = FeatureAnalysisSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'createFeatureAnalysis validation error', parsed.error)
    throw new Error('Invalid response from POST /feature-analysis')
  }
  return parsed.data as FeatureAnalysis
}

/**
 * Update a feature analysis.
 * Endpoint: PUT /feature-analysis/{id}
 */
export async function updateFeatureAnalysis(fa: FeatureAnalysis): Promise<FeatureAnalysis> {
  if (typeof fa.id !== 'number') {
    throw new Error('updateFeatureAnalysis requires fa.id')
  }
  const data = await httpPut<unknown>(`/feature-analysis/${fa.id}`, fa)
  const parsed = FeatureAnalysisSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `updateFeatureAnalysis(${fa.id}) validation error`, parsed.error)
    throw new Error(`Invalid response from PUT /feature-analysis/${fa.id}`)
  }
  return parsed.data as FeatureAnalysis
}

/**
 * Delete a feature analysis.
 * Endpoint: DELETE /feature-analysis/{id}
 */
export async function deleteFeatureAnalysis(id: number): Promise<void> {
  try {
    await httpDelete(`/feature-analysis/${id}`)
  } catch (error) {
    logger.error('WebAPI', `Failed to delete feature analysis ${id}`, error)
    throw error
  }
}

/**
 * Server-side copy of a feature analysis. Atlas 2.15 uses GET /copy.
 * Endpoint: GET /feature-analysis/{id}/copy
 */
export async function copyFeatureAnalysis(id: number): Promise<FeatureAnalysis> {
  const data = await httpGet<unknown>(`/feature-analysis/${id}/copy`)
  const parsed = FeatureAnalysisSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', `copyFeatureAnalysis(${id}) validation error`, parsed.error)
    throw new Error(`Invalid response from /feature-analysis/${id}/copy`)
  }
  return parsed.data as FeatureAnalysis
}

/**
 * Whether a feature analysis with the given name already exists.
 * Endpoint: GET /feature-analysis/{id}/exists?name={name}
 */
export async function featureAnalysisNameExists(id: number, name: string): Promise<boolean> {
  try {
    const data = await httpGet<unknown>(
      `/feature-analysis/${id}/exists?name=${encodeURIComponent(name)}`
    )
    if (typeof data === 'boolean') return data
    if (typeof data === 'number') return data > 0
    return Boolean(data)
  } catch (error) {
    logger.error('WebAPI', `featureAnalysisNameExists(${id}, ${name}) failed`, error)
    throw error
  }
}

/**
 * List the CDM domains supported by feature analyses.
 * Endpoint: GET /feature-analysis/domains
 *
 * Newer WebAPIs return `[{id, name}]`; older builds returned `string[]`.
 * Accept both and surface the id list to callers (the name is only used as
 * a display label, which we don't currently render).
 */
export async function listFeatureAnalysisDomains(): Promise<string[]> {
  const data = await httpGet<unknown>('/feature-analysis/domains')
  const schema = z.array(z.union([z.string(), z.object({ id: z.string() }).passthrough()]))
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'listFeatureAnalysisDomains validation error', parsed.error)
    throw new Error('Invalid response from /feature-analysis/domains')
  }
  return parsed.data.map(entry => (typeof entry === 'string' ? entry : entry.id))
}

/**
 * List FeatureExtraction aggregate options used by the PRESET editor.
 * Endpoint: GET /feature-analysis/aggregates
 */
export async function listFeatureAnalysisAggregates(): Promise<FeatureAnalysisAggregate[]> {
  const data = await httpGet<unknown>('/feature-analysis/aggregates')
  const parsed = z.array(FeatureAnalysisAggregateSchema).safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'listFeatureAnalysisAggregates validation error', parsed.error)
    throw new Error('Invalid response from /feature-analysis/aggregates')
  }
  return parsed.data
}

/**
 * Default FeatureExtraction covariate settings (toggled by `temporal`).
 * Endpoint: GET /featureextraction/defaultcovariatesettings?temporal={temporal}
 */
export async function getDefaultCovariateSettings(temporal: boolean): Promise<CovariateSetting> {
  const data = await httpGet<unknown>(
    `/featureextraction/defaultcovariatesettings?temporal=${temporal ? 'true' : 'false'}`
  )
  const parsed = CovariateSettingSchema.safeParse(data)
  if (!parsed.success) {
    logger.error('WebAPI', 'getDefaultCovariateSettings validation error', parsed.error)
    throw new Error('Invalid response from /featureextraction/defaultcovariatesettings')
  }
  return parsed.data
}

// ─── Cohort Pathway CRUD ────────────────────────────────────────────────────

/**
 * List all pathway analyses.
 * GET /pathway-analysis?size=10000
 */
export async function listPathways(): Promise<ApiResult<Pathway[]>> {
  try {
    const data = await httpGet<unknown>('/pathway-analysis?size=10000')
    // OHDSI WebAPI returns a Spring `Page<...>` envelope. A few proxy
    // configurations (or older WebAPI builds) expose a raw array, so we
    // accept either shape.
    const asPage = PathwayListPageSchema.safeParse(data)
    if (asPage.success) return success(asPage.data.content as Pathway[])
    const asArray = z.array(PathwaySchema).safeParse(data)
    if (asArray.success) return success(asArray.data as Pathway[])
    logger.error('Pathway', 'listPathways validation', asPage.error)
    return failure('Invalid pathway list response')
  } catch (err) {
    logger.error('Pathway', 'listPathways failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to list pathways')
  }
}

/**
 * Fetch a single pathway analysis by id.
 * GET /pathway-analysis/:id
 */
export async function getPathway(id: number): Promise<ApiResult<Pathway>> {
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/${id}`)
    const parsed = PathwaySchema.passthrough().safeParse(data)
    if (!parsed.success) {
      logger.error('Pathway', 'getPathway validation', parsed.error)
      return failure('Invalid pathway response')
    }
    return success(parsed.data as Pathway)
  } catch (err) {
    logger.error('Pathway', `getPathway(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch pathway')
  }
}

/**
 * Create a new pathway analysis.
 * POST /pathway-analysis
 */
export async function createPathway(pathway: Pathway): Promise<ApiResult<Pathway>> {
  try {
    const data = await httpPost<unknown>('/pathway-analysis', pathway)
    const parsed = PathwaySchema.passthrough().safeParse(data)
    if (!parsed.success) return failure('Invalid create response')
    return success(parsed.data as Pathway)
  } catch (err) {
    logger.error('Pathway', 'createPathway failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to create pathway')
  }
}

/**
 * Update an existing pathway analysis.
 * PUT /pathway-analysis/:id
 */
export async function savePathway(id: number, pathway: Pathway): Promise<ApiResult<Pathway>> {
  try {
    const data = await httpPut<unknown>(`/pathway-analysis/${id}`, pathway)
    const parsed = PathwaySchema.passthrough().safeParse(data)
    if (!parsed.success) return failure('Invalid save response')
    return success(parsed.data as Pathway)
  } catch (err) {
    logger.error('Pathway', `savePathway(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to save pathway')
  }
}

/**
 * Copy a pathway analysis (creates a duplicate).
 * POST /pathway-analysis/:id
 */
export async function copyPathway(id: number): Promise<ApiResult<Pathway>> {
  try {
    const data = await httpPost<unknown>(`/pathway-analysis/${id}`, undefined)
    const parsed = PathwaySchema.passthrough().safeParse(data)
    if (!parsed.success) return failure('Invalid copy response')
    return success(parsed.data as Pathway)
  } catch (err) {
    logger.error('Pathway', `copyPathway(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to copy pathway')
  }
}

/**
 * Delete a pathway analysis.
 * DELETE /pathway-analysis/:id
 */
export async function deletePathway(id: number): Promise<boolean> {
  try {
    await httpDelete(`/pathway-analysis/${id}`)
    return true
  } catch (err) {
    logger.error('Pathway', `deletePathway(${id}) failed`, err)
    return false
  }
}

/**
 * Check whether a pathway name already exists.
 * GET /pathway-analysis/:id/exists?name=<encoded>
 * Use id=0 (default) when checking for a new (unsaved) pathway.
 */
export async function existsPathway(name: string, id = 0): Promise<number> {
  try {
    const data = await httpGet<number>(
      `/pathway-analysis/${id}/exists?name=${encodeURIComponent(name)}`
    )
    return typeof data === 'number' ? data : 0
  } catch (err) {
    logger.error('Pathway', 'existsPathway failed', err)
    return 0
  }
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
  const data = await httpPost<unknown>('/pathway-analysis/import', design)
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
export async function assignPathwayTag(id: number, tagId: number): Promise<boolean> {
  try {
    await httpPost(`/pathway-analysis/${id}/tag/${tagId}`, undefined)
    return true
  } catch (err) {
    logger.error('Pathway', `assignPathwayTag failed`, err)
    return false
  }
}

/**
 * Remove a tag from a pathway analysis.
 * DELETE /pathway-analysis/:id/tag/:tagId
 */
export async function unassignPathwayTag(id: number, tagId: number): Promise<boolean> {
  try {
    await httpDelete(`/pathway-analysis/${id}/tag/${tagId}`)
    return true
  } catch (err) {
    logger.error('Pathway', `unassignPathwayTag failed`, err)
    return false
  }
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
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/${id}/generation`)
    const parsed = PathwayExecutionListSchema.safeParse(data)
    if (!parsed.success) return failure('Invalid execution list')
    return success(parsed.data)
  } catch (err) {
    logger.error('Pathway', `listPathwayExecutions(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to list executions')
  }
}

/**
 * Get a single pathway generation execution.
 * GET /pathway-analysis/generation/:generationId
 */
export async function getPathwayExecution(
  generationId: number
): Promise<ApiResult<PathwayExecution>> {
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}`)
    const parsed = PathwayExecutionSchema.safeParse(data)
    if (!parsed.success) return failure('Invalid execution response')
    return success(parsed.data)
  } catch (err) {
    logger.error('Pathway', `getPathwayExecution(${generationId}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch execution')
  }
}

/**
 * Get results for a pathway generation.
 * GET /pathway-analysis/generation/:generationId/result
 */
export async function getPathwayResults(generationId: number): Promise<ApiResult<PathwayResults>> {
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}/result`)
    const parsed = PathwayResultsSchema.safeParse(data)
    if (!parsed.success) return failure('Invalid results response')
    return success(parsed.data)
  } catch (err) {
    logger.error('Pathway', `getPathwayResults(${generationId}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch results')
  }
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
): Promise<ApiResult<PathwayExecution>> {
  try {
    const data = await httpPost<unknown>(
      `/pathway-analysis/${id}/generation/${sourceKey}`,
      undefined
    )

    const direct = PathwayExecutionSchema.passthrough().safeParse(data)
    if (direct.success) return success(direct.data as PathwayExecution)

    const jobSchema = z
      .object({
        executionId: z.number().optional(),
        id: z.number().optional(),
        status: PathwayExecutionStatusSchema.optional(),
      })
      .passthrough()
    const job = jobSchema.safeParse(data)
    if (!job.success) {
      logger.error('Pathway', `generatePathway(${id}, ${sourceKey}) validation error`, job.error)
      return failure('Invalid generate response')
    }
    return success({
      id: job.data.executionId ?? job.data.id ?? 0,
      status: job.data.status ?? 'STARTING',
      sourceKey,
    })
  } catch (err) {
    logger.error('Pathway', `generatePathway(${id}, ${sourceKey}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to start generation')
  }
}

/**
 * Cancel an in-progress pathway generation.
 * DELETE /pathway-analysis/:id/generation/:sourceKey
 */
export async function cancelPathwayGeneration(id: number, sourceKey: string): Promise<boolean> {
  try {
    await httpDelete(`/pathway-analysis/${id}/generation/${sourceKey}`)
    return true
  } catch (err) {
    logger.error('Pathway', `cancelPathwayGeneration failed`, err)
    return false
  }
}

/**
 * Get the pathway design snapshot stored with a generation.
 * GET /pathway-analysis/generation/:generationId/design
 */
export async function getPathwayDesignByGeneration(
  generationId: number
): Promise<ApiResult<Pathway>> {
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/generation/${generationId}/design`)
    const parsed = PathwaySchema.passthrough().safeParse(data)
    if (!parsed.success) return failure('Invalid design response')
    return success(parsed.data as Pathway)
  } catch (err) {
    logger.error('Pathway', 'getPathwayDesignByGeneration failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch design')
  }
}

// ─── Incidence Rate CRUD ─────────────────────────────────────────────────────

// The OHDSI WebAPI ships `expression` as a JSON-encoded string on the wire
// for both reads and writes. Decode/encode at the boundary so the editor
// always works with a parsed object.
function decodeIRExpression(wire: unknown): IncidenceRate {
  const parsed = IncidenceRateWireSchema.safeParse(wire)
  if (!parsed.success) throw parsed.error
  const { expression: raw, ...rest } = parsed.data
  if (!raw) {
    return {
      ...rest,
      expression: IncidenceRateExpressionSchema.parse({
        timeAtRisk: {
          start: { DateField: 'StartDate', Offset: 0 },
          end: { DateField: 'StartDate', Offset: 0 },
        },
      }),
    } as IncidenceRate
  }
  let parsedExpr: unknown
  try {
    parsedExpr = JSON.parse(raw)
  } catch {
    throw new Error('expression is not valid JSON')
  }
  const expr = IncidenceRateExpressionSchema.parse(parsedExpr)
  return { ...rest, expression: expr } as IncidenceRate
}

function encodeIRForSave(ir: IncidenceRate): Record<string, unknown> {
  const { expression, ...rest } = ir
  return { ...rest, expression: JSON.stringify(expression) }
}

/** GET /ir/ — list of all incidence rate analyses (no expression in payload). */
export async function listIncidenceRates(): Promise<ApiResult<IncidenceRate[]>> {
  try {
    const data = await httpGet<unknown>('/ir/')
    const parsed = z.array(IncidenceRateSummarySchema.passthrough()).safeParse(data)
    if (!parsed.success) {
      logger.error('IncidenceRate', 'listIncidenceRates validation', parsed.error)
      return failure('Invalid incidence rate list response')
    }
    return success(parsed.data as IncidenceRate[])
  } catch (err) {
    logger.error('IncidenceRate', 'listIncidenceRates failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to list incidence rates')
  }
}

/** GET /ir/{id} — full IR definition (decodes expression JSON string). */
export async function getIncidenceRate(id: number): Promise<ApiResult<IncidenceRate>> {
  try {
    const data = await httpGet<unknown>(`/ir/${id}`)
    return success(decodeIRExpression(data))
  } catch (err) {
    logger.error('IncidenceRate', `getIncidenceRate(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch incidence rate')
  }
}

/** POST /ir/ — create. */
export async function createIncidenceRate(ir: IncidenceRate): Promise<ApiResult<IncidenceRate>> {
  try {
    const data = await httpPost<unknown>('/ir/', encodeIRForSave(ir))
    return success(decodeIRExpression(data))
  } catch (err) {
    logger.error('IncidenceRate', 'createIncidenceRate failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to create incidence rate')
  }
}

/** PUT /ir/{id} — update. */
export async function saveIncidenceRate(
  id: number,
  ir: IncidenceRate
): Promise<ApiResult<IncidenceRate>> {
  try {
    const data = await httpPut<unknown>(`/ir/${id}`, encodeIRForSave(ir))
    return success(decodeIRExpression(data))
  } catch (err) {
    logger.error('IncidenceRate', `saveIncidenceRate(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to save incidence rate')
  }
}

/** GET /ir/{id}/copy — server-side duplicate. */
export async function copyIncidenceRate(id: number): Promise<ApiResult<IncidenceRate>> {
  try {
    const data = await httpGet<unknown>(`/ir/${id}/copy`)
    return success(decodeIRExpression(data))
  } catch (err) {
    logger.error('IncidenceRate', `copyIncidenceRate(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to copy incidence rate')
  }
}

/** DELETE /ir/{id}. */
export async function deleteIncidenceRate(id: number): Promise<boolean> {
  try {
    await httpDelete(`/ir/${id}`)
    return true
  } catch (err) {
    logger.error('IncidenceRate', `deleteIncidenceRate(${id}) failed`, err)
    return false
  }
}

/** GET /ir/{id}/exists?name=... — uniqueness check (id=0 for unsaved). */
export async function existsIncidenceRate(name: string, id = 0): Promise<number> {
  try {
    const data = await httpGet<number>(`/ir/${id}/exists?name=${encodeURIComponent(name)}`)
    return typeof data === 'number' ? data : 0
  } catch (err) {
    logger.error('IncidenceRate', 'existsIncidenceRate failed', err)
    return 0
  }
}

/**
 * Export an incidence-rate analysis design as a JSON-importable object.
 * GET /ir/{id}/design
 */
export async function exportIncidenceRate(id: number): Promise<unknown> {
  try {
    return await httpGet<unknown>(`/ir/${id}/design`)
  } catch (err) {
    logger.error('IncidenceRate', `exportIncidenceRate(${id}) failed`, err)
    throw err
  }
}

/**
 * Import an incidence-rate analysis design. Server creates a new analysis.
 * POST /ir/design
 */
export async function importIncidenceRate(design: unknown): Promise<IncidenceRate> {
  const data = await httpPost<unknown>('/ir/design', design)
  return decodeIRExpression(data)
}

/** POST /ir/{id}/tag/{tagId}. */
export async function assignIncidenceRateTag(id: number, tagId: number): Promise<boolean> {
  try {
    await httpPost(`/ir/${id}/tag/${tagId}`, undefined)
    return true
  } catch (err) {
    logger.error('IncidenceRate', 'assignIncidenceRateTag failed', err)
    return false
  }
}

/** DELETE /ir/{id}/tag/{tagId}. */
export async function unassignIncidenceRateTag(id: number, tagId: number): Promise<boolean> {
  try {
    await httpDelete(`/ir/${id}/tag/${tagId}`)
    return true
  } catch (err) {
    logger.error('IncidenceRate', 'unassignIncidenceRateTag failed', err)
    return false
  }
}

/** GET /ir/{id}/info — array of execution info, one per source. */
export async function listIncidenceRateInfo(
  id: number
): Promise<ApiResult<IncidenceRateInfoBySource[]>> {
  try {
    const data = await httpGet<unknown>(`/ir/${id}/info`)
    const parsed = IncidenceRateInfoListSchema.safeParse(data)
    if (!parsed.success) {
      logger.error('IncidenceRate', 'listIncidenceRateInfo validation', parsed.error)
      return failure('Invalid info list response')
    }
    return success(parsed.data)
  } catch (err) {
    logger.error('IncidenceRate', `listIncidenceRateInfo(${id}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to list info')
  }
}

/** GET /ir/{id}/info/{sourceKey} — execution info + summary list for one source. */
export async function getIncidenceRateInfoBySource(
  id: number,
  sourceKey: string
): Promise<ApiResult<IncidenceRateInfoBySource>> {
  try {
    const data = await httpGet<unknown>(`/ir/${id}/info/${sourceKey}`)
    const parsed = IncidenceRateInfoBySourceSchema.safeParse(data)
    if (!parsed.success) return failure('Invalid info-by-source response')
    return success(parsed.data)
  } catch (err) {
    logger.error('IncidenceRate', 'getIncidenceRateInfoBySource failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch info')
  }
}

/** GET /ir/{id}/execute/{sourceKey} — start a generation.
 * The endpoint returns a Spring JobExecutionResource, not an IRExecutionInfo —
 * the canonical shape arrives via the next /info poll. We treat it as fire-and-forget. */
export async function generateIncidenceRate(
  id: number,
  sourceKey: string
): Promise<ApiResult<null>> {
  try {
    await httpGet<unknown>(`/ir/${id}/execute/${sourceKey}`)
    return success(null)
  } catch (err) {
    logger.error('IncidenceRate', `generateIncidenceRate(${id},${sourceKey}) failed`, err)
    return failure(err instanceof Error ? err.message : 'Failed to start generation')
  }
}

/** DELETE /ir/{id}/execute/{sourceKey} — cancel a running generation. */
export async function cancelIncidenceRateGeneration(
  id: number,
  sourceKey: string
): Promise<boolean> {
  try {
    await httpDelete(`/ir/${id}/execute/${sourceKey}`)
    return true
  } catch (err) {
    logger.error('IncidenceRate', 'cancelIncidenceRateGeneration failed', err)
    return false
  }
}

/** DELETE /ir/{id}/info/{sourceKey} — clear results. */
export async function deleteIncidenceRateInfo(id: number, sourceKey: string): Promise<boolean> {
  try {
    await httpDelete(`/ir/${id}/info/${sourceKey}`)
    return true
  } catch (err) {
    logger.error('IncidenceRate', 'deleteIncidenceRateInfo failed', err)
    return false
  }
}

/** GET /ir/{id}/report/{sourceKey}?targetId=&outcomeId= — full report. */
export async function getIncidenceRateReport(
  id: number,
  sourceKey: string,
  targetId: number,
  outcomeId: number
): Promise<ApiResult<IncidenceRateReport>> {
  try {
    const url = `/ir/${id}/report/${sourceKey}?targetId=${targetId}&outcomeId=${outcomeId}`
    const data = await httpGet<unknown>(url)
    const parsed = IncidenceRateReportSchema.passthrough().safeParse(data)
    if (!parsed.success) return failure('Invalid report response')
    return success(parsed.data as IncidenceRateReport)
  } catch (err) {
    logger.error('IncidenceRate', 'getIncidenceRateReport failed', err)
    return failure(err instanceof Error ? err.message : 'Failed to fetch report')
  }
}
