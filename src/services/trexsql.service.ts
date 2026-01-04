/**
 * TrexSQL Cache API Service
 *
 * Handles all TrexSQL cache operations including:
 * - Cache building and status checks
 * - Patient count queries
 * - Data source cache status listing
 *
 * @packageDocumentation
 */

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

// Request cancellation support
const activeCountRequests = new Map<string, AbortController>()

/**
 * Cancel an active patient count request for a source
 */
export function cancelCountRequest(sourceKey: string): void {
  const controller = activeCountRequests.get(sourceKey)
  if (controller) {
    controller.abort()
    activeCountRequests.delete(sourceKey)
    logger.debug('TrexSQL', `Cancelled count request for ${sourceKey}`)
  }
}

/**
 * Cancel all active count requests
 */
export function cancelAllCountRequests(): void {
  for (const [sourceKey, controller] of activeCountRequests) {
    controller.abort()
    logger.debug('TrexSQL', `Cancelled count request for ${sourceKey}`)
  }
  activeCountRequests.clear()
}

/**
 * Get authorization header from auth store
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    if (authStore.token) {
      return { Authorization: `Bearer ${authStore.token}` }
    }
  } catch {
    // Auth store not available
  }
  return {}
}

/**
 * Build TrexSQL cache for a data source
 *
 * Triggers asynchronous cache building. Returns immediately while build
 * continues in the background.
 *
 * @param sourceKey - Data source identifier
 * @returns Build response with status message
 * @throws Error if build fails to start
 */
export async function buildCache(sourceKey: string): Promise<BuildCacheResponse> {
  const url = `${BASE_URL}/${sourceKey}/trexsql/cache/build`

  try {
    logger.info('TrexSQL', `Starting cache build for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      }
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

/**
 * Get cache status for a data source
 *
 * @param sourceKey - Data source identifier
 * @returns Cache status including patient count and build timestamp
 * @throws Error if status cannot be retrieved
 */
export async function getCacheStatus(sourceKey: string): Promise<TrexSQLCacheStatus> {
  const url = `${BASE_URL}/${sourceKey}/trexsql/cache/status`

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
        // Return not_built status for sources without cache
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

    if (!result.success) {
      logger.warn('TrexSQL', 'Cache status validation failed', result.error)
      // Try to construct a valid status from raw data
      return {
        sourceKey: data.sourceKey || sourceKey,
        status: data.status || 'not_built',
        totalPatientCount: data.totalPatientCount ?? null,
        lastBuiltAt: data.lastBuiltAt ?? null,
        sizeBytes: data.sizeBytes ?? null,
        errorMessage: data.errorMessage ?? null
      }
    }

    logger.debug('TrexSQL', `Cache status for ${sourceKey}: ${result.data.status}`)
    return result.data
  } catch (error) {
    logger.error('TrexSQL', 'Failed to get cache status', { sourceKey, error })
    throw error
  }
}

/**
 * Get patient count for a cohort expression
 *
 * Executes the cohort expression against the cached data and returns
 * the patient count. Supports request cancellation for rapid filter changes.
 *
 * @param sourceKey - Data source identifier
 * @param expression - Cohort expression in Atlas format
 * @param signal - Optional AbortSignal for cancellation
 * @returns Patient count result with execution time
 * @throws Error if count cannot be retrieved
 */
export async function getPatientCount(
  sourceKey: string,
  expression: Record<string, unknown>,
  signal?: AbortSignal
): Promise<PatientCountResult> {
  const url = `${BASE_URL}/${sourceKey}/trexsql/cache/count`

  // Cancel any existing request for this source
  cancelCountRequest(sourceKey)

  // Create new abort controller (combine with external signal if provided)
  const controller = new AbortController()
  activeCountRequests.set(sourceKey, controller)

  // If external signal is provided, propagate abort
  if (signal) {
    signal.addEventListener('abort', () => controller.abort())
  }

  try {
    logger.debug('TrexSQL', `Getting patient count for ${sourceKey}`)

    const authHeader = await getAuthHeader()
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      },
      body: JSON.stringify({ expression }),
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
      logger.warn('TrexSQL', 'Patient count validation failed', result.error)
      // Try to construct a valid result from raw data
      const patientCount: PatientCountResult = {
        cohortPatientCount: data.cohortPatientCount ?? 0,
        totalPatientCount: data.totalPatientCount ?? 0,
        executionTimeMs: data.executionTimeMs ?? 0
      }
      return patientCount
    }

    logger.debug('TrexSQL', `Patient count for ${sourceKey}: ${result.data.cohortPatientCount}/${result.data.totalPatientCount}`)
    return result.data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.debug('TrexSQL', `Patient count request cancelled for ${sourceKey}`)
      throw error
    }
    logger.error('TrexSQL', 'Failed to get patient count', { sourceKey, error })
    throw error
  } finally {
    activeCountRequests.delete(sourceKey)
  }
}

/**
 * Get cache status for all available data sources
 *
 * @returns Array of cache statuses for each source
 */
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

/**
 * Check if TrexSQL cache feature is available for a source
 *
 * @param sourceKey - Data source identifier
 * @returns true if cache is ready, false otherwise
 */
export async function isCacheReady(sourceKey: string): Promise<boolean> {
  try {
    const status = await getCacheStatus(sourceKey)
    return status.status === 'ready'
  } catch {
    return false
  }
}
