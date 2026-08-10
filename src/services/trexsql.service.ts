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
import { getAppConfig } from '@/config/app-config.loader'

function getBaseUrl(): string {
  return getAppConfig().api.url
}

const activeCountRequests = new Map<string, AbortController>()

export function cancelCountRequest(sourceKey: string): void {
  const controller = activeCountRequests.get(sourceKey)
  if (controller) {
    controller.abort()
    activeCountRequests.delete(sourceKey)
  }
}

export function cancelAllCountRequests(): void {
  for (const [_, controller] of activeCountRequests) {
    controller.abort()
  }
  activeCountRequests.clear()
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    if (authStore.token) {
      return { Authorization: `Bearer ${authStore.token}` }
    }
  } catch {
    // Ignore auth errors - proceed without authentication
  }
  return {}
}

export async function buildCache(
  sourceKey: string,
  schemaName?: string
): Promise<BuildCacheResponse> {
  const url = `${getBaseUrl()}/trexsql/${sourceKey}/cache`

  try {
    logger.info('TrexSQL', `Starting cache build for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ schemaName: schemaName || sourceKey.toLowerCase() }),
    })

    if (!response.ok) {
      const status = response.status

      if (status === 404) {
        throw new Error(`Data source '${sourceKey}' not found`)
      }
      if (status === 409) {
        throw new Error('Cache build already in progress')
      }
      if (status === 503) {
        throw new Error('TrexSQL extension not available')
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Build failed: ${errorText}`)
    }

    const data = await response.json()
    const result = BuildCacheResponseSchema.safeParse(data)

    if (!result.success) {
      logger.warn('TrexSQL', 'Build response validation failed, using raw response')
      return { message: data.message || 'Cache build started' }
    }

    logger.info('TrexSQL', `Cache build started for ${sourceKey}`)
    return result.data
  } catch (error) {
    logger.error('TrexSQL', 'Failed to start cache build', { sourceKey, error })
    throw error
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
  const url = `${getBaseUrl()}/trexsql/${sourceKey}/cache/status`

  try {
    logger.debug('TrexSQL', `Fetching cache status for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    })

    if (!response.ok) {
      const status = response.status

      if (status === 404) {
        return {
          sourceKey,
          status: 'not_built',
          totalPatientCount: null,
          lastBuiltAt: null,
          sizeBytes: null,
          errorMessage: null,
        }
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to get cache status: ${errorText}`)
    }

    const data = await response.json()

    const result = TrexSQLCacheStatusSchema.safeParse(data)
    const status = result.success ? result.data : mapCacheStatusResponse(sourceKey, data)

    if (status.status === 'error' && attempt < CACHE_STATUS_ERROR_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, CACHE_STATUS_RETRY_DELAY_MS))
      return getCacheStatus(sourceKey, attempt + 1)
    }

    return status
  } catch (error) {
    logger.error('TrexSQL', 'Failed to get cache status', { sourceKey, error })
    throw error
  }
}

export async function getPatientCount(
  sourceKey: string,
  expression: Record<string, unknown>,
  signal?: AbortSignal
): Promise<PatientCountResult> {
  const url = `${getBaseUrl()}/trexsql/${sourceKey}/cache/count`

  cancelCountRequest(sourceKey)

  const controller = new AbortController()
  activeCountRequests.set(sourceKey, controller)

  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        expression: JSON.stringify(expression),
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const status = response.status

      if (status === 400) {
        throw new Error('Invalid cohort expression')
      }
      if (status === 404) {
        throw new Error(`Data source '${sourceKey}' not found`)
      }
      if (status === 503) {
        throw new Error('Cache not available. Please build the cache first.')
      }
      // 422 — circe rejected the expression (incomplete inclusion rule,
      // missing StartWindow, codeset id pointing at empty placeholder).
      // Surface the message verbatim so the cohort builder banner can
      // tell the user which inclusion rule is broken.
      if (status === 422) {
        const body = await response.json().catch(() => null)
        const msg = (body && typeof body.message === 'string' && body.message)
          || 'The cohort expression is incomplete or invalid.'
        const err = new Error(msg)
        err.name = 'InvalidExpressionError'
        throw err
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Count failed: ${errorText}`)
    }

    const data = await response.json()
    const result = PatientCountResultSchema.safeParse(data)

    if (!result.success) {
      const patientCount: PatientCountResult = {
        cohortPatientCount: data.cohortPatientCount ?? 0,
        totalPatientCount: data.totalPatientCount ?? 0,
        executionTimeMs: data.executionTimeMs ?? 0,
      }
      return patientCount
    }

    return result.data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    logger.error('TrexSQL', 'Failed to get patient count', { sourceKey, error })
    throw error
  } finally {
    activeCountRequests.delete(sourceKey)
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
export async function listCacheFiles(): Promise<CacheFile[]> {
  const url = `${getBaseUrl()}/trexsql/cache/files`
  const authHeader = await getAuthHeader()
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeader },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Failed to list cache files: ${response.status} ${detail}`.trim())
  }

  const data = (await response.json()) as { files?: unknown }
  return Array.isArray(data.files) ? (data.files as CacheFile[]) : []
}

/** Delete a cache by database code. Works whether or not a source still exists. */
export async function deleteCacheFile(databaseCode: string): Promise<void> {
  const url = `${getBaseUrl()}/trexsql/cache/files/${encodeURIComponent(databaseCode)}`
  const authHeader = await getAuthHeader()
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader },
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Failed to delete cache: ${response.status} ${detail}`.trim())
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
  const url = `${getBaseUrl()}/trexsql/${sourceKey}/cache/inclusion`

  const authHeader = await getAuthHeader()

  cancelCountRequest(sourceKey)
  const controller = new AbortController()
  activeCountRequests.set(sourceKey, controller)
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ expression: JSON.stringify(expression) }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const status = response.status
      if (status === 400) throw new Error('Invalid cohort expression')
      if (status === 404) throw new Error(`Data source '${sourceKey}' not found`)
      if (status === 503) throw new Error('Cache not available. Please build the cache first.')
      if (status === 422) {
        const body = await response.json().catch(() => null)
        const msg = (body && typeof body.message === 'string' && body.message)
          || 'The cohort expression is incomplete or invalid.'
        const err = new Error(msg)
        err.name = 'InvalidExpressionError'
        throw err
      }
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Inclusion stats failed: ${errorText}`)
    }

    const data = await response.json()
    const parsed = InclusionStatsResultSchema.safeParse(data)
    if (parsed.success) return parsed.data

    return {
      entryEventCount: Number(data.entryEventCount ?? 0),
      totalPatientCount: Number(data.totalPatientCount ?? 0),
      finalCount: Number(data.finalCount ?? 0),
      ruleCounts: Array.isArray(data.ruleCounts) ? data.ruleCounts : [],
      executionTimeMs: Number(data.executionTimeMs ?? 0),
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    logger.error('TrexSQL', 'Failed to get inclusion stats', { sourceKey, error })
    throw error
  } finally {
    activeCountRequests.delete(sourceKey)
  }
}
