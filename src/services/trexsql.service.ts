import { logger } from '@/utils/logger'
import {
  TrexSQLCacheStatusSchema,
  PatientCountResultSchema,
  BuildCacheResponseSchema,
  type TrexSQLCacheStatus,
  type PatientCountResult,
  type BuildCacheResponse
} from '@/models/trexsql.types'

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

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

export async function buildCache(sourceKey: string, schemaName?: string): Promise<BuildCacheResponse> {
  const url = `${BASE_URL}/trexsql/${sourceKey}/cache`

  try {
    logger.info('TrexSQL', `Starting cache build for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      },
      body: JSON.stringify({ schemaName: schemaName || sourceKey.toLowerCase() })
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

function mapCacheStatusResponse(sourceKey: string, data: Record<string, unknown>): TrexSQLCacheStatus {
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
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : null
  }
}

export async function getCacheStatus(sourceKey: string): Promise<TrexSQLCacheStatus> {
  const url = `${BASE_URL}/trexsql/${sourceKey}/cache/status`

  try {
    logger.debug('TrexSQL', `Fetching cache status for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      }
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
          errorMessage: null
        }
      }

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to get cache status: ${errorText}`)
    }

    const data = await response.json()

    const result = TrexSQLCacheStatusSchema.safeParse(data)
    if (result.success) {
      return result.data
    }

    const mappedStatus = mapCacheStatusResponse(sourceKey, data)
    return mappedStatus
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
  const url = `${BASE_URL}/trexsql/${sourceKey}/cache/count`

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
        ...authHeader
      },
      body: JSON.stringify({
        expression: JSON.stringify(expression)
      }),
      signal: controller.signal
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

      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Count failed: ${errorText}`)
    }

    const data = await response.json()
    const result = PatientCountResultSchema.safeParse(data)

    if (!result.success) {
      const patientCount: PatientCountResult = {
        cohortPatientCount: data.cohortPatientCount ?? 0,
        totalPatientCount: data.totalPatientCount ?? 0,
        executionTimeMs: data.executionTimeMs ?? 0
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
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
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
