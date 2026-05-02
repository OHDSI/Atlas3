/**
 * Cohort Cache Utility
 * Browser-based caching for cohort definitions using IndexedDB
 * Provides offline support and faster load times
 */

import type { CohortDefinition } from '@/models/cohort.types'
import { logger } from '@/utils/logger'

const DB_NAME = 'atlas3_cohort_cache'
const DB_VERSION = 1
const STORE_NAME = 'cohorts'
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CachedCohort {
  cohort: CohortDefinition
  timestamp: number
  source: 'webapi' | 'local'
}

/**
 * Initialize IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      logger.error('CohortCache', 'Failed to open database', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'cohort.id' })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        logger.debug('CohortCache', 'Object store created')
      }
    }
  })
}

/**
 * Save cohort definition to cache
 * @param cohort - Cohort definition to cache
 * @param source - Source of the cohort ('webapi' or 'local')
 */
export async function saveCohortToCache(
  cohort: CohortDefinition,
  source: 'webapi' | 'local' = 'webapi'
): Promise<void> {
  if (!cohort.id) {
    logger.warn('CohortCache', 'Cannot cache cohort without ID')
    return
  }

  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const cachedData: CachedCohort = {
      cohort,
      timestamp: Date.now(),
      source,
    }

    const request = store.put(cachedData)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        logger.debug('CohortCache', `Cohort ${cohort.id} cached successfully`)
        resolve()
      }

      request.onerror = () => {
        logger.error('CohortCache', 'Failed to cache cohort', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error saving to cache', error)
    throw error
  }
}

/**
 * Retrieve cohort definition from cache
 * @param cohortId - ID of the cohort to retrieve
 * @returns Cached cohort or null if not found/expired
 */
export async function getCohortFromCache(
  cohortId: number | string
): Promise<CohortDefinition | null> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.get(cohortId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cachedData: CachedCohort | undefined = request.result

        if (!cachedData) {
          logger.debug('CohortCache', `Cohort ${cohortId} not found in cache`)
          resolve(null)
          return
        }

        // Check if cache is expired
        const age = Date.now() - cachedData.timestamp
        if (age > CACHE_DURATION_MS) {
          logger.debug(
            'CohortCache',
            `Cohort ${cohortId} cache expired (${Math.round(age / 1000 / 60)} minutes old)`
          )
          // Don't delete here - let clearExpiredCache handle it
          resolve(null)
          return
        }

        logger.debug(
          'CohortCache',
          `Cohort ${cohortId} retrieved from cache (${Math.round(age / 1000)} seconds old)`
        )
        resolve(cachedData.cohort)
      }

      request.onerror = () => {
        logger.error('CohortCache', 'Failed to retrieve from cache', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error retrieving from cache', error)
    return null
  }
}

/**
 * Clear all cached cohorts
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.clear()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        logger.info('CohortCache', 'All cached cohorts cleared')
        resolve()
      }

      request.onerror = () => {
        logger.error('CohortCache', 'Failed to clear cache', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error clearing cache', error)
    throw error
  }
}

/**
 * Delete a specific cohort from cache
 * @param cohortId - ID of the cohort to delete
 */
export async function deleteCohortFromCache(cohortId: number | string): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.delete(cohortId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        logger.debug('CohortCache', `Cohort ${cohortId} deleted from cache`)
        resolve()
      }

      request.onerror = () => {
        logger.error('CohortCache', 'Failed to delete from cache', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error deleting from cache', error)
    throw error
  }
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('timestamp')

    const request = index.openCursor()
    const expiredKeys: IDBValidKey[] = []

    return new Promise((resolve, reject) => {
      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

        if (cursor) {
          const cachedData: CachedCohort = cursor.value
          const age = Date.now() - cachedData.timestamp

          if (age > CACHE_DURATION_MS) {
            expiredKeys.push(cursor.primaryKey)
          }

          cursor.continue()
        } else {
          // Cursor iteration complete, delete expired entries
          expiredKeys.forEach(key => {
            store.delete(key)
          })

          if (expiredKeys.length > 0) {
            logger.debug('CohortCache', `Cleared ${expiredKeys.length} expired cache entries`)
          }

          resolve()
        }
      }

      request.onerror = () => {
        logger.error('CohortCache', 'Failed to clear expired cache', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error clearing expired cache', error)
    throw error
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCohorts: number
  expiredCohorts: number
  cacheSize: number
}> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const countRequest = store.count()

    return new Promise((resolve, reject) => {
      let totalCohorts = 0
      let expiredCohorts = 0
      let cacheSize = 0

      countRequest.onsuccess = () => {
        totalCohorts = countRequest.result

        const allRequest = store.getAll()

        allRequest.onsuccess = () => {
          const allData: CachedCohort[] = allRequest.result

          allData.forEach(cachedData => {
            const age = Date.now() - cachedData.timestamp
            if (age > CACHE_DURATION_MS) {
              expiredCohorts++
            }
            cacheSize += JSON.stringify(cachedData).length
          })

          resolve({
            totalCohorts,
            expiredCohorts,
            cacheSize,
          })
        }

        allRequest.onerror = () => {
          reject(allRequest.error)
        }
      }

      countRequest.onerror = () => {
        reject(countRequest.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    logger.error('CohortCache', 'Error getting cache stats', error)
    return {
      totalCohorts: 0,
      expiredCohorts: 0,
      cacheSize: 0,
    }
  }
}
