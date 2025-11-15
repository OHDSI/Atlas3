/**
 * Configuration Cache Management Service
 *
 * Provides functions for managing configuration data in IndexedDB cache.
 * Handles cache clearing, statistics, and vocabulary schema persistence.
 * Follows the same pattern as cohort-cache.ts (native IndexedDB API).
 */

const DB_NAME = 'atlas3_config_cache'
const DB_VERSION = 1
const CONFIG_STORE = 'config'

interface CacheStats {
  itemCount: number
  estimatedSize: number
}

/**
 * Opens the IndexedDB database for configuration cache
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[ConfigCache] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE)
        console.log('[ConfigCache] Object store created')
      }
    }
  })
}

/**
 * Clears all configuration cache data from IndexedDB
 *
 * @returns Promise that resolves when cache is cleared
 * @throws Error if cache clear operation fails
 */
export async function clearConfigCache(): Promise<void> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(CONFIG_STORE, 'readwrite')
    const store = transaction.objectStore(CONFIG_STORE)

    const request = store.clear()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        console.log('[ConfigCache] Cache cleared successfully')
        resolve()
      }

      request.onerror = () => {
        console.error('[ConfigCache] Failed to clear cache:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[ConfigCache] Error clearing cache:', error)
    throw error
  }
}

/**
 * Gets statistics about the current cache state
 *
 * @returns Cache statistics including item count and estimated size
 */
export async function getCacheStats(): Promise<CacheStats> {
  try {
    const db = await openDatabase()
    const transaction = db.transaction(CONFIG_STORE, 'readonly')
    const store = transaction.objectStore(CONFIG_STORE)

    const request = store.getAllKeys()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result
        const itemCount = keys.length
        // Estimate size (rough approximation)
        const estimatedSize = itemCount * 1024 // Assume 1KB per item average

        resolve({
          itemCount,
          estimatedSize
        })
      }

      request.onerror = () => {
        console.error('[ConfigCache] Failed to get cache stats:', request.error)
        reject(request.error)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.error('[ConfigCache] Error getting cache stats:', error)
    throw error
  }
}

/**
 * Gets the vocabulary schema setting from localStorage
 *
 * @returns The vocabulary schema name (defaults to 'public')
 */
export function getVocabularySchema(): string {
  try {
    return localStorage.getItem('atlas3-vocabulary-schema') || 'public'
  } catch (error) {
    console.error('Failed to read vocabulary schema from localStorage:', error)
    return 'public'
  }
}

/**
 * Sets the vocabulary schema setting in localStorage
 *
 * @param schema - The schema name to save
 * @throws Error if save operation fails
 */
export function setVocabularySchema(schema: string): void {
  try {
    localStorage.setItem('atlas3-vocabulary-schema', schema)
  } catch (error) {
    console.error('Failed to save vocabulary schema to localStorage:', error)
    throw new Error('Failed to save vocabulary schema')
  }
}
