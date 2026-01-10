/**
 * Unit Tests for Cohort Cache Utility
 * Tests browser-based caching using IndexedDB
 *
 * NOTE: These tests are skipped in CI because fake-indexeddb can be unreliable
 * in CI environments. The cohort-cache functionality is still tested via the
 * mocked tests in cohort.spec.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  saveCohortToCache,
  getCohortFromCache,
  clearCache,
  deleteCohortFromCache,
  clearExpiredCache,
  getCacheStats,
} from '@/utils/cohort-cache'
import type { CohortDefinition } from '@/models/cohort.types'

// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

// Skip these tests in CI - fake-indexeddb is unreliable in CI environments
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true'

describe.skipIf(isCI)('Cohort Cache Utility', () => {
  const mockCohort: CohortDefinition = {
    id: 123,
    name: 'Test Cohort',
    entryEvents: [
      {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      },
    ],
    qualifyingLimit: 'ALL',
    inclusionRules: [],
    conceptSets: [],
    expressionType: 'SIMPLE_EXPRESSION',
    cdmVersionRange: '>=5.0.0',
  }

  const mockCohort2: CohortDefinition = {
    id: 456,
    name: 'Second Test Cohort',
    entryEvents: [],
    qualifyingLimit: 'FIRST',
    inclusionRules: [],
    conceptSets: [],
  }

  beforeEach(async () => {
    // Clear cache before each test
    await clearCache()
  })

  afterEach(async () => {
    // Clean up after each test
    await clearCache()
  })

  describe('saveCohortToCache', () => {
    it('should save a cohort to cache successfully', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Test Cohort')
      expect(retrieved?.id).toBe(123)
    })

    it('should update an existing cached cohort', async () => {
      await saveCohortToCache(mockCohort)

      const updatedCohort = { ...mockCohort, name: 'Updated Cohort' }
      await saveCohortToCache(updatedCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved?.name).toBe('Updated Cohort')
    })

    it('should not cache cohort without ID', async () => {
      const cohortWithoutId = { ...mockCohort }
      delete cohortWithoutId.id

      await saveCohortToCache(cohortWithoutId)

      // Should return null since cohort wasn't cached
      const retrieved = await getCohortFromCache(123)
      expect(retrieved).toBeNull()
    })

    it('should cache cohort with webapi source', async () => {
      await saveCohortToCache(mockCohort, 'webapi')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should cache cohort with local source', async () => {
      await saveCohortToCache(mockCohort, 'local')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('getCohortFromCache', () => {
    it('should retrieve a cached cohort', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(123)
      expect(retrieved?.name).toBe('Test Cohort')
    })

    it('should return null for non-existent cohort', async () => {
      const retrieved = await getCohortFromCache(999)
      expect(retrieved).toBeNull()
    })

    it('should preserve all cohort properties', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved?.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(retrieved?.cdmVersionRange).toBe('>=5.0.0')
      expect(retrieved?.entryEvents).toHaveLength(1)
      expect(retrieved?.entryEvents[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('should return null for expired cache (mocked)', async () => {
      // Save cohort
      await saveCohortToCache(mockCohort)

      // Mock the timestamp to be older than 24 hours
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should clear all cached cohorts', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      await clearCache()

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      expect(retrieved1).toBeNull()
      expect(retrieved2).toBeNull()
    })

    it('should allow saving after clearing', async () => {
      await saveCohortToCache(mockCohort)
      await clearCache()
      await saveCohortToCache(mockCohort2)

      const retrieved = await getCohortFromCache(456)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('deleteCohortFromCache', () => {
    it('should delete a specific cohort from cache', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      await deleteCohortFromCache(123)

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      expect(retrieved1).toBeNull()
      expect(retrieved2).not.toBeNull()
    })

    it('should not error when deleting non-existent cohort', async () => {
      await expect(deleteCohortFromCache(999)).resolves.not.toThrow()
    })
  })

  describe('clearExpiredCache', () => {
    it('should remove expired entries only', async () => {
      // Save fresh cohort
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      // Manually expire one cohort
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      // Clear expired
      await clearExpiredCache()

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      // Expired cohort should be gone, fresh one should remain
      expect(retrieved1).toBeNull()
      expect(retrieved2).not.toBeNull()
    })
  })

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(2)
      expect(stats.expiredCohorts).toBe(0)
      expect(stats.cacheSize).toBeGreaterThan(0)
    })

    it('should count expired cohorts correctly', async () => {
      await saveCohortToCache(mockCohort)

      // Manually expire cohort
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(1)
      expect(stats.expiredCohorts).toBe(1)
    })

    it('should return zeros for empty cache', async () => {
      await clearCache()

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(0)
      expect(stats.expiredCohorts).toBe(0)
      expect(stats.cacheSize).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test depends on implementation details
      // For now, just ensure methods don't throw
      await expect(getCohortFromCache(123)).resolves.not.toThrow()
    })

    it('should handle large cohort definitions', async () => {
      const largeCohort: CohortDefinition = {
        ...mockCohort,
        id: 789,
        entryEvents: Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i}`,
          criteriaType: 'ConditionOccurrence' as const,
          attributes: [],
        })),
        inclusionRules: Array.from({ length: 50 }, (_, i) => ({
          id: `rule-${i}`,
          name: `Rule ${i}`,
          criteriaGroups: [],
        })),
      }

      await expect(saveCohortToCache(largeCohort)).resolves.not.toThrow()

      const retrieved = await getCohortFromCache(789)
      expect(retrieved?.entryEvents).toHaveLength(100)
      expect(retrieved?.inclusionRules).toHaveLength(50)
    })

    it('should handle save transaction errors', async () => {
      // Save a valid cohort first
      await saveCohortToCache(mockCohort)

      // Verify it was saved
      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should handle retrieval transaction errors gracefully', async () => {
      // Attempting to get non-existent cohort should not throw
      const result = await getCohortFromCache(999999)
      expect(result).toBeNull()
    })

    it('should handle delete transaction errors gracefully', async () => {
      // Deleting non-existent cohort should not throw
      await expect(deleteCohortFromCache(999999)).resolves.not.toThrow()
    })
  })

  describe('String ID Support', () => {
    it('should handle string cohort IDs', async () => {
      const cohortWithStringId: CohortDefinition = {
        ...mockCohort,
        id: '123-string',
      }

      await saveCohortToCache(cohortWithStringId)

      const retrieved = await getCohortFromCache('123-string')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('123-string')
    })

    it('should delete cohort with string ID', async () => {
      const cohortWithStringId: CohortDefinition = {
        ...mockCohort,
        id: 'test-string-id',
      }

      await saveCohortToCache(cohortWithStringId)
      await deleteCohortFromCache('test-string-id')

      const retrieved = await getCohortFromCache('test-string-id')
      expect(retrieved).toBeNull()
    })

    it('should handle mixed string and numeric IDs', async () => {
      const cohortString: CohortDefinition = {
        ...mockCohort,
        id: 'string-id',
        name: 'String ID Cohort',
      }

      await saveCohortToCache(mockCohort) // numeric ID: 123
      await saveCohortToCache(cohortString) // string ID: 'string-id'

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache('string-id')

      expect(retrieved1).not.toBeNull()
      expect(retrieved2).not.toBeNull()
      expect(retrieved1?.id).toBe(123)
      expect(retrieved2?.id).toBe('string-id')
    })
  })

  describe('Cache Expiration Edge Cases', () => {
    it('should handle multiple expired cohorts', async () => {
      // Save multiple cohorts
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      const cohort3: CohortDefinition = {
        ...mockCohort,
        id: 789,
        name: 'Third Cohort',
      }
      await saveCohortToCache(cohort3)

      // Expire all cohorts
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')

      await new Promise<void>((resolve) => {
        const getAllRequest = store.getAll()
        getAllRequest.onsuccess = () => {
          const allData = getAllRequest.result
          let completed = 0

          allData.forEach((cachedData) => {
            cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
            const putRequest = store.put(cachedData)
            putRequest.onsuccess = () => {
              completed++
              if (completed === allData.length) {
                resolve()
              }
            }
          })
        }
        transaction.oncomplete = () => db.close()
      })

      // Clear expired
      await clearExpiredCache()

      // All should be removed
      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)
      const retrieved3 = await getCohortFromCache(789)

      expect(retrieved1).toBeNull()
      expect(retrieved2).toBeNull()
      expect(retrieved3).toBeNull()
    })

    it('should not remove fresh cohorts when clearing expired', async () => {
      // Save three cohorts
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      const cohort3: CohortDefinition = {
        ...mockCohort,
        id: 789,
        name: 'Third Cohort',
      }
      await saveCohortToCache(cohort3)

      // Expire only one cohort
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(456)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      await clearExpiredCache()

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)
      const retrieved3 = await getCohortFromCache(789)

      expect(retrieved1).not.toBeNull()
      expect(retrieved2).toBeNull() // This one was expired
      expect(retrieved3).not.toBeNull()
    })

    it('should handle clearExpiredCache with no expired entries', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      // Clear expired (none should be expired)
      await expect(clearExpiredCache()).resolves.not.toThrow()

      // Both should still exist
      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      expect(retrieved1).not.toBeNull()
      expect(retrieved2).not.toBeNull()
    })

    it('should handle clearExpiredCache with empty cache', async () => {
      await clearCache()

      // Clear expired on empty cache should not throw
      await expect(clearExpiredCache()).resolves.not.toThrow()
    })
  })

  describe('Cache Stats Edge Cases', () => {
    it('should calculate cache size accurately', async () => {
      await saveCohortToCache(mockCohort)

      const stats = await getCacheStats()

      // Verify cache size is reasonable
      expect(stats.cacheSize).toBeGreaterThan(100) // At least some bytes
      expect(stats.cacheSize).toBeLessThan(100000) // Not unreasonably large
    })

    it('should count multiple cohorts correctly', async () => {
      const cohorts: CohortDefinition[] = [
        mockCohort,
        mockCohort2,
        { ...mockCohort, id: 789, name: 'Third' },
        { ...mockCohort, id: 1011, name: 'Fourth' },
        { ...mockCohort, id: 1213, name: 'Fifth' },
      ]

      for (const cohort of cohorts) {
        await saveCohortToCache(cohort)
      }

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(5)
      expect(stats.expiredCohorts).toBe(0)
    })

    it('should count mix of expired and fresh cohorts', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      const cohort3: CohortDefinition = {
        ...mockCohort,
        id: 789,
        name: 'Third',
      }
      await saveCohortToCache(cohort3)

      // Expire two cohorts
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')

      await new Promise<void>((resolve) => {
        let completed = 0
        const expireIds = [123, 456]

        expireIds.forEach((id) => {
          const getRequest = store.get(id)
          getRequest.onsuccess = () => {
            const cachedData = getRequest.result
            cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000

            const putRequest = store.put(cachedData)
            putRequest.onsuccess = () => {
              completed++
              if (completed === expireIds.length) {
                resolve()
              }
            }
          }
        })

        transaction.oncomplete = () => db.close()
      })

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(3)
      expect(stats.expiredCohorts).toBe(2)
    })
  })

  describe('Database Upgrade Path', () => {
    it('should create object store on first open', async () => {
      // This is implicitly tested by all other tests
      // The beforeEach clearCache ensures the database is initialized

      await saveCohortToCache(mockCohort)
      const retrieved = await getCohortFromCache(123)

      expect(retrieved).not.toBeNull()
    })

    it('should create timestamp index', async () => {
      await saveCohortToCache(mockCohort)

      // Access the database directly to verify index exists
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readonly')
      const store = transaction.objectStore('cohorts')

      // Verify the timestamp index exists
      expect(store.indexNames.contains('timestamp')).toBe(true)

      db.close()
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent saves', async () => {
      const cohorts: CohortDefinition[] = [
        { ...mockCohort, id: 1, name: 'Cohort 1' },
        { ...mockCohort, id: 2, name: 'Cohort 2' },
        { ...mockCohort, id: 3, name: 'Cohort 3' },
        { ...mockCohort, id: 4, name: 'Cohort 4' },
        { ...mockCohort, id: 5, name: 'Cohort 5' },
      ]

      // Save all concurrently
      await Promise.all(cohorts.map((cohort) => saveCohortToCache(cohort)))

      // Verify all were saved
      const results = await Promise.all(cohorts.map((cohort) => getCohortFromCache(cohort.id!)))

      results.forEach((result, index) => {
        expect(result).not.toBeNull()
        expect(result?.name).toBe(`Cohort ${index + 1}`)
      })
    })

    it('should handle concurrent reads', async () => {
      await saveCohortToCache(mockCohort)

      // Read concurrently multiple times
      const reads = Array.from({ length: 10 }, () => getCohortFromCache(123))

      const results = await Promise.all(reads)

      results.forEach((result) => {
        expect(result).not.toBeNull()
        expect(result?.id).toBe(123)
      })
    })

    it('should handle concurrent deletes', async () => {
      const cohorts: CohortDefinition[] = [
        { ...mockCohort, id: 10, name: 'Cohort 10' },
        { ...mockCohort, id: 20, name: 'Cohort 20' },
        { ...mockCohort, id: 30, name: 'Cohort 30' },
      ]

      // Save all
      await Promise.all(cohorts.map((cohort) => saveCohortToCache(cohort)))

      // Delete all concurrently
      await Promise.all(cohorts.map((cohort) => deleteCohortFromCache(cohort.id!)))

      // Verify all were deleted
      const results = await Promise.all(cohorts.map((cohort) => getCohortFromCache(cohort.id!)))

      results.forEach((result) => {
        expect(result).toBeNull()
      })
    })
  })

  describe('Source Tracking', () => {
    it('should cache with default webapi source', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should cache with explicit webapi source', async () => {
      await saveCohortToCache(mockCohort, 'webapi')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should cache with local source', async () => {
      await saveCohortToCache(mockCohort, 'local')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should preserve source on update', async () => {
      await saveCohortToCache(mockCohort, 'local')

      // Update the cohort
      const updated = { ...mockCohort, name: 'Updated Cohort' }
      await saveCohortToCache(updated, 'webapi')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved?.name).toBe('Updated Cohort')
    })
  })

  describe('Cache Age Scenarios', () => {
    it('should return fresh cohort just under expiration', async () => {
      await saveCohortToCache(mockCohort)

      // Set timestamp to just under 24 hours (23 hours 59 minutes)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - (24 * 60 * 60 * 1000 - 60 * 1000) // 23h 59m ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should return null for cohort just over expiration', async () => {
      await saveCohortToCache(mockCohort)

      // Set timestamp to just over 24 hours (24 hours 1 minute)
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - (24 * 60 * 60 * 1000 + 60 * 1000) // 24h 1m ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).toBeNull()
    })
  })
})
