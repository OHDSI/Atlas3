import { logger } from '@/utils/logger'
import {
  TrexSQLCacheStatusSchema,
  PatientCountResultSchema,
  BuildCacheResponseSchema,
  InclusionStatsResultSchema,
  type TrexSQLCacheStatus,
  type PatientCountResult,
  type BuildCacheResponse,
  type InclusionStatsResult,
} from '@/models/trexsql.types'
import { ApiError } from '@/services/api-error'
import { httpClient, type HttpClientOptions } from '@/services/http-client'

/**
 * TrexSQL traffic goes through the shared http client. Hand-rolled fetch calls
 * here missed three things it does: a 401 never cleared the session or opened
 * the login modal, so an expired token turned the cohort-builder count into a
 * plain failure instead of a login prompt; no User-Language header went out, so
 * WebAPI answered untranslated; and the error body was not unwrapped from its
 * JSON envelope. The status-specific meanings these endpoints carry — 404 "no
 * cache yet", 409 "build already running", 422 "circe rejected the expression"
 * — are read back off the ApiError the shared client throws.
 *
 * maxRetries: 1 keeps the previous behaviour of not retrying: a cache build is
 * not idempotent, and a patient count is expensive enough that repeating it
 * against a struggling server would only make things worse.
 */
function trexRequest<T>(endpoint: string, options: HttpClientOptions = {}): Promise<T> {
  return httpClient<T>(endpoint, { maxRetries: 1, ...options })
}

/** HTTP status of a failed request; 0 for a network or parse failure. */
function statusOf(error: unknown): number {
  return error instanceof ApiError ? error.status : 0
}

/** What WebAPI said, already unwrapped from a JSON `{ message }` envelope. */
function serverMessage(error: unknown): string {
  return error instanceof ApiError && error.body ? error.body.trim() : ''
}

function detailOf(error: unknown): string {
  return serverMessage(error) || (error instanceof Error ? error.message : 'Unknown error')
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

const activeCountRequests = new Map<string, AbortController>()

export function cancelCountRequest(sourceKey: string): void {
  const controller = activeCountRequests.get(sourceKey)
  if (controller) {
    controller.abort()
    activeCountRequests.delete(sourceKey)
  }
}

/**
 * Drop our own registration only. A superseding request for the same source has
 * already replaced the entry, and deleting that would leave the next cancel
 * with nothing to abort.
 */
function releaseCountRequest(sourceKey: string, controller: AbortController): void {
  if (activeCountRequests.get(sourceKey) === controller) {
    activeCountRequests.delete(sourceKey)
  }
}

export function cancelAllCountRequests(): void {
  for (const [_, controller] of activeCountRequests) {
    controller.abort()
  }
  activeCountRequests.clear()
}

function buildCacheFailure(sourceKey: string, error: unknown): Error {
  switch (statusOf(error)) {
    case 404:
      return new Error(`Data source '${sourceKey}' not found`)
    case 409:
      return new Error('Cache build already in progress')
    case 503:
      return new Error('TrexSQL extension not available')
  }
  if (error instanceof ApiError) return new Error(`Build failed: ${detailOf(error)}`)
  return asError(error)
}

export async function buildCache(
  sourceKey: string,
  schemaName?: string
): Promise<BuildCacheResponse> {
  try {
    logger.info('TrexSQL', `Starting cache build for ${sourceKey}`)

    const data = await trexRequest<{ message?: string }>(`/trexsql/${sourceKey}/cache`, {
      method: 'POST',
      body: { schemaName: schemaName || sourceKey.toLowerCase() },
    })

    const result = BuildCacheResponseSchema.safeParse(data)

    if (!result.success) {
      logger.warn('TrexSQL', 'Build response validation failed, using raw response')
      return { message: data?.message || 'Cache build started' }
    }

    logger.info('TrexSQL', `Cache build started for ${sourceKey}`)
    return result.data
  } catch (error) {
    logger.error('TrexSQL', 'Failed to start cache build', { sourceKey, error })
    throw buildCacheFailure(sourceKey, error)
  }
}

function mapCacheStatusResponse(
  sourceKey: string,
  data: Record<string, unknown>
): TrexSQLCacheStatus {
  let status: 'ready' | 'building' | 'not_built' | 'error' | 'stale' = 'not_built'

  if (data.activeJob) {
    status = 'building'
  } else if (data.cacheExists && data.cacheAttached) {
    status = 'ready'
  } else if (data.cacheExists && !data.cacheAttached) {
    status = 'error'
  } else {
    status = 'not_built'
  }

  let lastBuiltAt: string | null = null
  if (typeof data.lastModified === 'number' && data.lastModified > 0) {
    lastBuiltAt = new Date(data.lastModified).toISOString()
  }

  return {
    sourceKey: (data.sourceKey as string) || sourceKey,
    status,
    totalPatientCount: typeof data.totalPatientCount === 'number' ? data.totalPatientCount : null,
    lastBuiltAt,
    sizeBytes: typeof data.cacheSizeBytes === 'number' ? data.cacheSizeBytes : null,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : null,
  }
}

// `cacheExists && !cacheAttached` reports as "error", but that combination is
// also the momentary state during a benign attach retry, when the cache is built
// and about to become healthy. Treating it as terminal makes every consumer — the
// data-source list, the live count gate, the config page — give up on a cache that
// works seconds later. Re-check a bounded number of times before believing it.
const CACHE_STATUS_ERROR_RETRIES = 5
const CACHE_STATUS_RETRY_DELAY_MS = 2500

export async function getCacheStatus(
  sourceKey: string,
  attempt = 0
): Promise<TrexSQLCacheStatus> {
  try {
    logger.debug('TrexSQL', `Fetching cache status for ${sourceKey}`)

    const data = await trexRequest<Record<string, unknown>>(`/trexsql/${sourceKey}/cache/status`)

    const result = TrexSQLCacheStatusSchema.safeParse(data)
    const status = result.success ? result.data : mapCacheStatusResponse(sourceKey, data ?? {})

    if (status.status === 'error' && attempt < CACHE_STATUS_ERROR_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, CACHE_STATUS_RETRY_DELAY_MS))
      return getCacheStatus(sourceKey, attempt + 1)
    }

    return status
  } catch (error) {
    // A source that has never been built has no status document, not a problem
    // to report.
    if (statusOf(error) === 404) {
      return {
        sourceKey,
        status: 'not_built',
        totalPatientCount: null,
        lastBuiltAt: null,
        sizeBytes: null,
        errorMessage: null,
      }
    }

    logger.error('TrexSQL', 'Failed to get cache status', { sourceKey, error })
    if (error instanceof ApiError) {
      throw new Error(`Failed to get cache status: ${detailOf(error)}`)
    }
    throw error
  }
}

/**
 * The count and inclusion-stats endpoints reject the same way, so they map the
 * same statuses. 422 means circe rejected the expression (incomplete inclusion
 * rule, missing StartWindow, codeset id pointing at an empty placeholder);
 * WebAPI's message names the broken rule, so it is surfaced verbatim for the
 * cohort-builder banner and marked with a distinct error name the banner keys
 * off.
 */
function expressionQueryFailure(sourceKey: string, prefix: string, error: unknown): Error {
  switch (statusOf(error)) {
    case 400:
      return new Error('Invalid cohort expression')
    case 404:
      return new Error(`Data source '${sourceKey}' not found`)
    case 503:
      return new Error('Cache not available. Please build the cache first.')
    case 422: {
      const invalid = new Error(
        serverMessage(error) || 'The cohort expression is incomplete or invalid.'
      )
      invalid.name = 'InvalidExpressionError'
      return invalid
    }
  }
  if (error instanceof ApiError) return new Error(`${prefix}: ${detailOf(error)}`)
  return asError(error)
}

export async function getPatientCount(
  sourceKey: string,
  expression: Record<string, unknown>,
  signal?: AbortSignal
): Promise<PatientCountResult> {
  cancelCountRequest(sourceKey)

  const controller = new AbortController()
  activeCountRequests.set(sourceKey, controller)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const data = await trexRequest<Partial<PatientCountResult>>(
      `/trexsql/${sourceKey}/cache/count`,
      {
        method: 'POST',
        body: { expression: JSON.stringify(expression) },
        signal: controller.signal,
      }
    )

    const result = PatientCountResultSchema.safeParse(data)

    if (!result.success) {
      const patientCount: PatientCountResult = {
        cohortPatientCount: data?.cohortPatientCount ?? 0,
        totalPatientCount: data?.totalPatientCount ?? 0,
        executionTimeMs: data?.executionTimeMs ?? 0,
      }
      return patientCount
    }

    return result.data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    logger.error('TrexSQL', 'Failed to get patient count', { sourceKey, error })
    throw expressionQueryFailure(sourceKey, 'Count failed', error)
  } finally {
    releaseCountRequest(sourceKey, controller)
  }
}

export interface CacheFile {
  fileName: string
  databaseCode: string
  sizeBytes: number
  lastModified: number | null
  attached: boolean
  /** No data source references this cache any more — safe to reclaim. */
  orphaned: boolean
  /** Not a dataset cache (job registry, FHIR database); listed but undeletable. */
  protected: boolean
}

/**
 * Every cache file on disk, including ones whose dataset has been deleted.
 * Keyed by file rather than by source, which is the only way orphans surface —
 * the per-source endpoints can't resolve them and answer 404.
 */
function cacheFileFailure(summary: string, error: unknown): Error {
  // status 0 is a network or parse failure, which has no server status to quote.
  if (error instanceof ApiError && error.status > 0) {
    return new Error(`${summary}: ${error.status} ${error.body ?? ''}`.trim())
  }
  return asError(error)
}

export async function listCacheFiles(): Promise<CacheFile[]> {
  try {
    const data = await trexRequest<{ files?: unknown }>('/trexsql/cache/files')
    return Array.isArray(data?.files) ? (data.files as CacheFile[]) : []
  } catch (error) {
    throw cacheFileFailure('Failed to list cache files', error)
  }
}

/** Delete a cache by database code. Works whether or not a source still exists. */
export async function deleteCacheFile(databaseCode: string): Promise<void> {
  try {
    await trexRequest<void>(`/trexsql/cache/files/${encodeURIComponent(databaseCode)}`, {
      method: 'DELETE',
    })
  } catch (error) {
    throw cacheFileFailure('Failed to delete cache', error)
  }
}

export async function getAllCacheStatuses(): Promise<TrexSQLCacheStatus[]> {
  try {
    const { listDataSources } = await import('./datasource.service')
    const sources = await listDataSources()

    const statusPromises = sources.map(source =>
      getCacheStatus(source.sourceKey).catch(error => {
        logger.warn('TrexSQL', `Failed to get cache status for ${source.sourceKey}`, error)
        return {
          sourceKey: source.sourceKey,
          status: 'error' as const,
          totalPatientCount: null,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        }
      })
    )

    return await Promise.all(statusPromises)
  } catch (error) {
    logger.error('TrexSQL', 'Failed to get all cache statuses', error)
    throw error
  }
}

export async function isCacheReady(sourceKey: string): Promise<boolean> {
  try {
    const status = await getCacheStatus(sourceKey)
    return status.status === 'ready'
  } catch {
    return false
  }
}

export async function getInclusionStats(
  sourceKey: string,
  expression: Record<string, unknown>,
  signal?: AbortSignal
): Promise<InclusionStatsResult> {
  cancelCountRequest(sourceKey)
  const controller = new AbortController()
  activeCountRequests.set(sourceKey, controller)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const data = await trexRequest<Record<string, unknown>>(
      `/trexsql/${sourceKey}/cache/inclusion`,
      {
        method: 'POST',
        body: { expression: JSON.stringify(expression) },
        signal: controller.signal,
      }
    )

    const parsed = InclusionStatsResultSchema.safeParse(data)
    if (parsed.success) return parsed.data

    return {
      entryEventCount: Number(data?.entryEventCount ?? 0),
      totalPatientCount: Number(data?.totalPatientCount ?? 0),
      finalCount: Number(data?.finalCount ?? 0),
      ruleCounts: Array.isArray(data?.ruleCounts)
        ? (data.ruleCounts as InclusionStatsResult['ruleCounts'])
        : [],
      executionTimeMs: Number(data?.executionTimeMs ?? 0),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    logger.error('TrexSQL', 'Failed to get inclusion stats', { sourceKey, error })
    throw expressionQueryFailure(sourceKey, 'Inclusion stats failed', error)
  } finally {
    releaseCountRequest(sourceKey, controller)
  }
}
